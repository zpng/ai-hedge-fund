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
        self.type = "WAP"
        self.base_url = os.getenv("BASE_URL", "http://localhost:8080")

    def _generate_hash(self, data: Dict[str, Any]) -> str:
        """根据虎皮椒API文档生成hash签名"""
        # 过滤空值和hash字段
        filtered_data = {}
        for key, value in data.items():
            if value is not None and value != '' and key != 'hash':
                filtered_data[key] = str(value)
        
        # 按参数名ASCII码从小到大排序（字典序）
        sorted_keys = sorted(filtered_data.keys())
        
        # 拼接成key=value&key=value格式
        string_a = '&'.join([f"{key}={filtered_data[key]}" for key in sorted_keys])
        
        # 拼接APPSECRET并进行MD5运算
        string_sign_temp = string_a + self.app_secret
        
        # 生成32位小写MD5
        hash_value = hashlib.md5(string_sign_temp.encode('utf-8')).hexdigest().lower()
        
        return hash_value


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
            
            # 构建请求参数（不包含hash）
            params = {
                "appid": self.appid,
                "trade_order_id": trade_order_id,
                "total_fee": amount,
                "title": f"AI对冲基金{subscription_type}订阅",
                "time": int(time.time()),
                "notify_url": notify_url,
                "mchid": self.mchid,
                "type": self.type,
                "nonce_str": uuid.uuid4().hex
            }
            
            # 生成hash签名
            hash_value = self._generate_hash(params)
            params["hash"] = hash_value
            
            # 创建请求对象
            pay_request = XunhuPayRequest(**params)
            
            # 发送请求
            response = requests.post(self.api_url, json=params)
            pay_response = XunhuPayResponse(**response.json())
            logger.info(f"支付请求响应: {pay_response.json()}")
            
            if pay_response.errcode == 0 and pay_response.url:
                # 更新支付记录
                payment_record.payment_url = pay_response.url
                await self._save_payment_record(payment_record)
                return payment_record
            else:
                # 支付请求失败
                payment_record.errcode = PaymentStatus.FAILED
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
            # 构建查询参数（不包含sign）
            params = {
                "appid": self.appid,
                "trade_order_id": trade_order_id,
                "nonce_str": uuid.uuid4().hex
            }
            
            # 生成hash签名
            hash_value = self._generate_hash(params)
            params["hash"] = hash_value
            
            # 创建查询请求对象
            query_request = XunhuQueryRequest(**params)
            
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
            received_hash = notification_data.pop("hash", "")
            calculated_hash = self._generate_hash(notification_data)
            
            if received_hash != calculated_hash:
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
            return await self._get_payment_record(payment_id)
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