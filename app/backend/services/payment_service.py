import os
import time
import uuid
import hashlib
from urllib.parse import urlencode, unquote_plus
import requests
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from app.backend.models.payment import (
    PaymentStatus, XunhuPayRequest, XunhuPayResponse,
    XunhuQueryRequest, XunhuQueryResponse, PaymentRecord
)
from app.backend.services.redis_service import RedisService
from app.backend.models.user import SubscriptionType

# 配置日志
logger = logging.getLogger("payment_service")
logging.basicConfig(level=logging.INFO)

def ksort(d):
    return [(k, d[k]) for k in sorted(d.keys())]

class PaymentService:
    """支付服务类，处理虎皮椒支付相关操作"""

    def __init__(self, redis_service: RedisService):
        self.redis_service = redis_service
        # 从环境变量获取配置
        self.appid = os.getenv("XUNHU_APPID", "")
        self.app_secret = os.getenv("XUNHU_APP_SECRET", "")
        self.mchid = os.getenv("XUNHU_MCHID", "")
        self.api_url = os.getenv("XUNHU_API_URL", "https://api.xunhupay.com/payment/do.html")
        self.query_url = os.getenv("XUNHU_QUERY_URL", "https://api.xunhupay.com/payment/query.html")
        self.payment_type = "WAP"
        self.base_url = os.getenv("BASE_URL", "http://localhost:8080")

    def _generate_sign(self, attributes: Dict[str, Any]) -> str:
        attributes = ksort(attributes)
        print(attributes)
        m = hashlib.md5()
        print(unquote_plus(urlencode(attributes)))
        m.update((unquote_plus(urlencode(attributes))  + self.app_secret).encode(encoding='utf-8'))
        sign = m.hexdigest()
        #sign = sign.upper()
        print(sign)
        return sign


    def _generate_trade_order_id(self) -> str:
        """生成商户订单号"""
        return f"XH{int(time.time())}{uuid.uuid4().hex[:8]}"

    async def create_payment(self, user_id: str, subscription_type: SubscriptionType) -> PaymentRecord:
        """创建支付记录并获取支付链接"""
        try:
            # 确定支付金额
            amount = 0.01  # 测试金额，实际应根据订阅类型设置
            
            # 生成订单号
            trade_order_id = self._generate_trade_order_id()
            
            # 创建支付记录
            payment_record = PaymentRecord(
                id=str(uuid.uuid4()),
                user_id=user_id,
                trade_order_id=trade_order_id,
                amount=amount,
                subscription_type=subscription_type,
                status=PaymentStatus.PENDING,
                created_at=datetime.now()
            )
            
            # 保存支付记录到Redis
            await self._save_payment_record(payment_record)
            
            # 构建支付请求参数
            notify_url = f"{self.base_url}/payment/notify"
            return_url = f"{self.base_url}/payment/return"
            
            pay_request = XunhuPayRequest(
                appid=self.appid,
                trade_order_id=trade_order_id,
                total_fee=amount,
                title=f"AI对冲基金{subscription_type}订阅",
                time=str(int(time.time())),
                notify_url=notify_url,
                return_url=return_url,
                mchid=self.mchid,
                payment_type=self.payment_type,
                nonce_str=uuid.uuid4().hex
            )
            
            # 生成签名
            params = pay_request.dict(exclude_none=True)
            params["hash"] = self._generate_sign(params)
            
            # 发送请求
            response = requests.post(self.api_url, json=params)
            pay_response = XunhuPayResponse(**response.json())
            
            if pay_response.status == 0 and pay_response.url:
                # 更新支付记录
                payment_record.payment_url = pay_response.url
                await self._save_payment_record(payment_record)
                return payment_record
            else:
                # 支付请求失败
                payment_record.status = PaymentStatus.FAILED
                await self._save_payment_record(payment_record)
                error_msg = f"支付请求失败: {pay_response.message}"
                logger.error(error_msg)
                raise Exception(error_msg)
        except Exception as e:
            logger.error(f"创建支付记录失败: {str(e)}")
            raise

    async def query_payment(self, trade_order_id: str) -> Dict[str, Any]:
        """查询支付状态"""
        try:
            query_request = XunhuQueryRequest(
                appid=self.appid,
                trade_order_id=trade_order_id,
                nonce_str=uuid.uuid4().hex
            )
            
            # 生成签名
            params = query_request.dict(exclude_none=True)
            params["sign"] = self._generate_sign(params)
            
            # 发送请求
            response = requests.post(self.query_url, json=params)
            query_response = XunhuQueryResponse(**response.json())
            
            if query_response.status == 0 and query_response.data:
                # 获取支付记录
                payment_record = await self._get_payment_record_by_trade_order_id(trade_order_id)
                if payment_record:
                    # 更新支付状态
                    if query_response.data.get("status") == "OD":
                        payment_record.status = PaymentStatus.SUCCESS
                        payment_record.paid_at = datetime.now()
                        payment_record.transaction_id = query_response.data.get("transaction_id")
                        payment_record.payment_method = query_response.data.get("payment_method")
                        await self._save_payment_record(payment_record)
                        
                        # 更新用户订阅
                        await self._update_user_subscription(payment_record)
                
                return query_response.data
            else:
                error_msg = {"status": "error", "message": query_response.message}
                logger.error(f"查询支付状态失败: {error_msg}")
                return error_msg
        except Exception as e:
            logger.error(f"查询支付状态异常: {str(e)}")
            return {"status": "error", "message": str(e)}

    async def process_payment_notification(self, notification_data: Dict[str, Any]) -> bool:
        """处理支付回调通知"""
        try:
            # 验证签名
            sign = notification_data.pop("sign", "")
            calculated_sign = self._generate_sign(notification_data)
            
            if sign != calculated_sign:
                logger.error("支付回调签名验证失败")
                return False
            
            trade_order_id = notification_data.get("trade_order_id")
            if not trade_order_id:
                logger.error("支付回调缺少订单号")
                return False
            
            # 获取支付记录
            payment_record = await self._get_payment_record_by_trade_order_id(trade_order_id)
            if not payment_record:
                logger.error(f"未找到订单记录: {trade_order_id}")
                return False
            
            # 更新支付状态
            payment_record.status = PaymentStatus.SUCCESS
            payment_record.paid_at = datetime.now()
            payment_record.transaction_id = notification_data.get("transaction_id")
            payment_record.payment_method = notification_data.get("payment_method")
            await self._save_payment_record(payment_record)
            
            # 更新用户订阅
            await self._update_user_subscription(payment_record)
            
            return True
        except Exception as e:
            logger.error(f"处理支付回调异常: {str(e)}")
            return False

    async def _save_payment_record(self, payment_record: PaymentRecord) -> None:
        """保存支付记录到Redis"""
        key = f"payment:{payment_record.id}"
        self.redis_service.redis_client.set(key, payment_record.json())
        
        # 同时保存订单号到ID的映射，方便查询
        order_key = f"payment:order:{payment_record.trade_order_id}"
        self.redis_service.redis_client.set(order_key, payment_record.id)

    async def _get_payment_record(self, payment_id: str) -> Optional[PaymentRecord]:
        """从Redis获取支付记录"""
        key = f"payment:{payment_id}"
        data = self.redis_service.redis_client.get(key)
        if data:
            return PaymentRecord.parse_raw(data)
        return None

    async def _get_payment_record_by_trade_order_id(self, trade_order_id: str) -> Optional[PaymentRecord]:
        """通过商户订单号获取支付记录"""
        order_key = f"payment:order:{trade_order_id}"
        payment_id = self.redis_service.redis_client.get(order_key)
        if payment_id:
            return await self._get_payment_record(payment_id.decode())
        return None

    async def _update_user_subscription(self, payment_record: PaymentRecord) -> None:
        """更新用户订阅信息"""
        try:
            if payment_record.status != PaymentStatus.SUCCESS:
                logger.info(f"支付未成功，不更新订阅: {payment_record.trade_order_id}")
                return
            
            # 获取订阅类型 - 修复：直接使用字符串转换为枚举
            subscription_type_str = payment_record.subscription_type.upper()
            logger.info(f"处理订阅类型: {subscription_type_str}")
            
            try:
                subscription_type = SubscriptionType(payment_record.subscription_type)
                logger.info(f"订阅类型转换成功: {subscription_type}")
                
                # 更新用户订阅
                await self.redis_service.update_subscription(payment_record.user_id, subscription_type)
                logger.info(f"用户订阅更新成功: {payment_record.user_id}, 类型: {subscription_type}")
            except ValueError as e:
                logger.error(f"订阅类型转换失败: {subscription_type_str}, 错误: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"更新用户订阅异常: {str(e)}")
            raise