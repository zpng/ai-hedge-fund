import os
import time
import uuid
import hashlib
import requests
from datetime import datetime
from typing import Optional, Dict, Any

from app.backend.models.payment import (
    PaymentStatus, XunhuPayRequest, XunhuPayResponse,
    XunhuQueryRequest, XunhuQueryResponse, PaymentRecord
)
from app.backend.services.redis_service import RedisService
from app.backend.models.user import SubscriptionType


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
        self.payment_type = os.getenv("XUNHU_PAYMENT_TYPE", "")
        self.base_url = os.getenv("BASE_URL", "http://localhost:8080")

    def _generate_sign(self, params: Dict[str, Any]) -> str:
        """生成签名"""
        # 按照ASCII码排序
        sorted_params = sorted([(k, v) for k, v in params.items() if k != "sign" and v])
        # 拼接字符串
        sign_str = "&".join([f"{k}={v}" for k, v in sorted_params])
        # 拼接密钥
        sign_str = f"{sign_str}&key={self.app_secret}"
        # MD5加密
        return hashlib.md5(sign_str.encode()).hexdigest().upper()

    def _generate_trade_order_id(self) -> str:
        """生成商户订单号"""
        return f"XH{int(time.time())}{uuid.uuid4().hex[:8]}"

    async def create_payment(self, user_id: str, subscription_type: SubscriptionType) -> PaymentRecord:
        """创建支付记录并获取支付链接"""
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
            time=datetime.now().strftime("%Y%m%d%H%M%S"),
            notify_url=notify_url,
            return_url=return_url,
            mchid=self.mchid,
            payment_type=self.payment_type,
            nonce_str=uuid.uuid4().hex
        )
        
        # 生成签名
        params = pay_request.dict(exclude_none=True)
        params["sign"] = self._generate_sign(params)
        
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
            raise Exception(f"支付请求失败: {pay_response.message}")

    async def query_payment(self, trade_order_id: str) -> Dict[str, Any]:
        """查询支付状态"""
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
            return {"status": "error", "message": query_response.message}

    async def process_payment_notification(self, notification_data: Dict[str, Any]) -> bool:
        """处理支付回调通知"""
        # 验证签名
        sign = notification_data.pop("sign", "")
        calculated_sign = self._generate_sign(notification_data)
        
        if sign != calculated_sign:
            return False
        
        trade_order_id = notification_data.get("trade_order_id")
        if not trade_order_id:
            return False
        
        # 获取支付记录
        payment_record = await self._get_payment_record_by_trade_order_id(trade_order_id)
        if not payment_record:
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

    async def _save_payment_record(self, payment_record: PaymentRecord) -> None:
        """保存支付记录到Redis"""
        key = f"payment:{payment_record.id}"
        await self.redis_service.redis.set(key, payment_record.json())
        
        # 同时保存订单号到ID的映射，方便查询
        order_key = f"payment:order:{payment_record.trade_order_id}"
        await self.redis_service.redis.set(order_key, payment_record.id)

    async def _get_payment_record(self, payment_id: str) -> Optional[PaymentRecord]:
        """从Redis获取支付记录"""
        key = f"payment:{payment_id}"
        data = await self.redis_service.redis.get(key)
        if data:
            return PaymentRecord.parse_raw(data)
        return None

    async def _get_payment_record_by_trade_order_id(self, trade_order_id: str) -> Optional[PaymentRecord]:
        """通过商户订单号获取支付记录"""
        order_key = f"payment:order:{trade_order_id}"
        payment_id = await self.redis_service.redis.get(order_key)
        if payment_id:
            return await self._get_payment_record(payment_id.decode())
        return None

    async def _update_user_subscription(self, payment_record: PaymentRecord) -> None:
        """更新用户订阅信息"""
        if payment_record.status != PaymentStatus.SUCCESS:
            return
        
        # 获取订阅类型
        subscription_type = SubscriptionType(payment_record.subscription_type)
        
        # 更新用户订阅
        await self.redis_service.update_subscription(payment_record.user_id, subscription_type)