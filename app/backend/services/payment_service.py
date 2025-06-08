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
        
        # 记录配置信息（隐藏敏感信息）

        # 验证必要配置
        missing_configs = []
        if not self.appid:
            missing_configs.append("XUNHU_APPID")
        if not self.app_secret:
            missing_configs.append("XUNHU_APP_SECRET")
        if not self.mchid:
            missing_configs.append("XUNHU_MCHID")
            
        if missing_configs:
            logger.error(f"缺少必要的环境变量配置: {', '.join(missing_configs)}")
        else:
            logger.info("所有必要的支付配置已设置完成")

    def _generate_hash(self, data: Dict[str, Any]) -> str:
        """根据虎皮椒API文档生成hash签名"""
        # 过滤空值和hash字段
        filtered_data = {}
        for key, value in data.items():
            if value is not None and value != '' and key != 'hash':
                if key == 'total_fee':
                    float_value = float(value)
                    if float_value == int(float_value):
                        filtered_data[key] = str(int(float_value))
                    else:
                        filtered_data[key] = f"{float_value:.2f}"
                else:
                    filtered_data[key] = str(value)
        
        # 按参数名ASCII码从小到大排序（字典序）
        sorted_keys = sorted(filtered_data.keys())
        
        # 拼接成key=value&key=value格式
        string_a = '&'.join([f"{key}={filtered_data[key]}" for key in sorted_keys])
        print(f"string_a: {string_a}")
        
        # 拼接APPSECRET并进行MD5运算
        string_sign_temp = string_a + self.app_secret
        
        # 生成32位小写MD5
        hash_value = hashlib.md5(string_sign_temp.encode('utf-8')).hexdigest().lower()
        
        return hash_value


    def _generate_trade_order_id(self) -> str:
        """生成商户订单号"""
        return f"XH{int(time.time())}{uuid.uuid4().hex[:8]}"
    
    async def _calculate_price(self, email: str, subscription_type: SubscriptionType, user_id: str) -> float:
        """根据邮箱、订阅类型和用户历史记录计算价格"""
        # 检查用户是否有过付费订阅记录
        user = await self.redis_service.get_user_by_id(user_id)
        is_first_time = user.subscription_type == SubscriptionType.TRIAL
        
        # 特殊测试邮箱价格
        if email == "1014346275@qq.com":
            if subscription_type == SubscriptionType.MONTHLY:
                return 0.1 if is_first_time else 0.2  # 首月0.1，续费0.2
            elif subscription_type == SubscriptionType.YEARLY:
                return 0.3 if is_first_time else 0.4  # 首年0.3，续费0.4
            else:
                return 0.1
        
        # 正常用户价格
        if subscription_type == SubscriptionType.MONTHLY:
            return 66.0 if is_first_time else 88.0  # 首月66元，续费88元
        elif subscription_type == SubscriptionType.YEARLY:
            return 880.0 if is_first_time else 968.0  # 首年880元，续费968元
        else:
            return 66.0  # 默认月付价格

    async def create_payment(self, user_id: str, subscription_type: SubscriptionType) -> PaymentRecord:
        """创建支付记录并获取支付链接"""
        try:
            # 获取用户信息
            user = await self.redis_service.get_user_by_id(user_id)
            if not user:
                raise ValueError("用户不存在")
            
            # 确定支付金额
            amount = await self._calculate_price(user.email, subscription_type, user_id)
            # amount = 880

            
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
                "title": f"AI股票分析{subscription_type}订阅",
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
            
            # 发送请求前记录详细信息
            logger.info(f"准备发送支付请求到: {self.api_url}")
            logger.info(f"请求参数: {params}")
            logger.info(f"配置信息 - appid: {self.appid}, mchid: {self.mchid}")
            
            try:
                # 发送请求
                logger.info("开始发送HTTP POST请求...")
                response = requests.post(self.api_url, json=params, timeout=30)
                logger.info(f"HTTP响应状态码: {response.status_code}")
                logger.info(f"HTTP响应头: {dict(response.headers)}")
                logger.info(f"HTTP响应内容: {response.text}")
                
                # 解析响应
                response_json = response.json()
                pay_response = XunhuPayResponse(**response_json)
                logger.info(f"支付请求响应解析成功: {pay_response.json()}")
                
            except requests.exceptions.ConnectionError as e:
                logger.error(f"连接错误详情: {str(e)}")
                logger.error(f"请求URL: {self.api_url}")
                logger.error(f"请求参数: {params}")
                raise Exception(f"支付接口连接失败: {str(e)}")
            except requests.exceptions.Timeout as e:
                logger.error(f"请求超时: {str(e)}")
                raise Exception(f"支付接口请求超时: {str(e)}")
            except requests.exceptions.RequestException as e:
                logger.error(f"请求异常: {str(e)}")
                raise Exception(f"支付接口请求异常: {str(e)}")
            except ValueError as e:
                logger.error(f"响应JSON解析失败: {str(e)}")
                logger.error(f"原始响应内容: {response.text if 'response' in locals() else 'N/A'}")
                raise Exception(f"支付接口响应格式错误: {str(e)}")
            
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

    async def query_payment(self, trade_order_id: str, open_order_id: Optional[str] = None) -> Dict[str, Any]:
        """查询支付状态
        
        根据虎皮椒订单查询接口文档实现：
        - 支持通过out_trade_order或open_order_id查询
        - 返回标准的接口响应格式
        - 状态码：OD(支付成功)，WP(待支付)，CD(已取消)
        """
        try:
            # 构建查询参数（根据文档要求）
            params = {
                "appid": self.appid,
                "time": int(time.time()),
                "nonce_str": uuid.uuid4().hex[:32]  # 限制32位长度
            }
            
            # 根据文档，out_trade_order和open_order_id二选一
            if open_order_id:
                params["open_order_id"] = open_order_id
            else:
                params["out_trade_order"] = trade_order_id
            
            # 生成hash签名
            hash_value = self._generate_hash(params)
            params["hash"] = hash_value
            
            logger.info(f"准备发送订单查询请求到: {self.query_url}")
            logger.info(f"查询请求参数: {params}")
            
            try:
                # 发送请求到虎皮椒查询接口
                logger.info("开始发送查询HTTP POST请求...")
                response = requests.post(self.query_url, data=params, timeout=30)
                logger.info(f"查询HTTP响应状态码: {response.status_code}")
                logger.info(f"查询HTTP响应头: {dict(response.headers)}")
                logger.info(f"查询HTTP响应内容: {response.text}")
                
                response_data = response.json()
                logger.info(f"订单查询响应解析成功: {response_data}")
                
            except requests.exceptions.ConnectionError as e:
                logger.error(f"查询连接错误详情: {str(e)}")
                logger.error(f"查询请求URL: {self.query_url}")
                logger.error(f"查询请求参数: {params}")
                return {
                    "errcode": 500,
                    "errmsg": f"查询接口连接失败: {str(e)}",
                    "hash": ""
                }
            except requests.exceptions.Timeout as e:
                logger.error(f"查询请求超时: {str(e)}")
                return {
                    "errcode": 500,
                    "errmsg": f"查询接口请求超时: {str(e)}",
                    "hash": ""
                }
            except ValueError as e:
                logger.error(f"查询响应JSON解析失败: {str(e)}")
                logger.error(f"查询原始响应内容: {response.text if 'response' in locals() else 'N/A'}")
                return {
                    "errcode": 500,
                    "errmsg": f"查询接口响应格式错误: {str(e)}",
                    "hash": ""
                }
            
            # 验证响应签名
            if "hash" in response_data:
                received_hash = response_data.pop("hash")
                calculated_hash = self._generate_hash(response_data)
                if received_hash != calculated_hash:
                    logger.error(f"查询响应签名验证失败: 期望={calculated_hash}, 实际={received_hash}")
                    return {
                        "errcode": 500,
                        "errmsg": "响应签名验证失败",
                        "hash": calculated_hash
                    }
                # 恢复hash字段
                response_data["hash"] = received_hash
            
            # 处理成功响应
            if response_data.get("errcode") == 0 and "data" in response_data:
                data = response_data["data"]
                status = data.get("status")
                
                # 获取本地支付记录并更新状态
                payment_record = await self._get_payment_record_by_trade_order_id(trade_order_id)
                if payment_record:
                    # 根据虎皮椒状态更新本地记录
                    if status == "OD":  # 支付成功
                        if payment_record.status != PaymentStatus.SUCCESS:
                            payment_record.status = PaymentStatus.SUCCESS
                            payment_record.paid_at = datetime.now()
                            payment_record.transaction_id = data.get("open_order_id")
                            await self._save_payment_record(payment_record)
                            
                            # 更新用户订阅
                            await self._update_user_subscription(payment_record)
                            logger.info(f"订单状态更新为已支付: {trade_order_id}")
                    
                    elif status == "CD":  # 已取消
                        payment_record.status = PaymentStatus.FAILED
                        await self._save_payment_record(payment_record)
                        logger.info(f"订单状态更新为已取消: {trade_order_id}")
                    
                    elif status == "WP":  # 待支付
                        logger.info(f"订单待支付: {trade_order_id}")
                
                # 返回标准格式响应
                return {
                    "errcode": 0,
                    "data": data,
                    "errmsg": "success!",
                    "hash": response_data.get("hash")
                }
            
            else:
                # 处理错误响应
                error_response = {
                    "errcode": response_data.get("errcode", 500),
                    "errmsg": response_data.get("errmsg", "查询失败"),
                    "hash": response_data.get("hash", "")
                }
                logger.error(f"查询支付状态失败: {error_response}")
                return error_response
                
        except requests.RequestException as e:
            logger.error(f"查询支付状态网络异常: {str(e)}")
            return {
                "errcode": 500,
                "errmsg": f"网络请求失败: {str(e)}",
                "hash": ""
            }
        except Exception as e:
            logger.error(f"查询支付状态异常: {str(e)}")
            return {
                "errcode": 500,
                "errmsg": f"查询异常: {str(e)}",
                "hash": ""
            }

    async def process_payment_notification(self, notification_data: Dict[str, Any]) -> bool:
        """处理支付回调通知
        
        根据虎皮椒支付回调接口文档处理回调通知：
        - 验证必要参数
        - 验证签名
        - 更新支付状态
        - 更新用户订阅
        """
        try:
            logger.info(f"开始处理支付回调通知: {notification_data}")
            
            # 1. 验证必要参数
            required_fields = [
                'trade_order_id', 'total_fee', 'transaction_id', 
                'open_order_id', 'order_title', 'status', 
                'nonce_str', 'time', 'appid', 'hash'
            ]
            
            for field in required_fields:
                if field not in notification_data:
                    logger.error(f"支付回调缺少必要参数: {field}")
                    return False
            
            # 2. 提取关键信息
            trade_order_id = notification_data.get("trade_order_id")
            total_fee = notification_data.get("total_fee")
            transaction_id = notification_data.get("transaction_id")
            open_order_id = notification_data.get("open_order_id")
            order_title = notification_data.get("order_title")
            status = notification_data.get("status")
            appid = notification_data.get("appid")
            time_stamp = notification_data.get("time")
            nonce_str = notification_data.get("nonce_str")
            
            # 可选参数
            plugins = notification_data.get("plugins")
            attach = notification_data.get("attach")
            
            logger.info(f"回调参数解析 - 订单号: {trade_order_id}, 金额: {total_fee}, 状态: {status}, 交易号: {transaction_id}")
            
            # 3. 验证appid
            if appid != self.appid:
                logger.error(f"支付回调appid不匹配: 期望={self.appid}, 实际={appid}")
                return False
            
            # 4. 验证签名
            received_hash = notification_data.pop("hash", "")
            calculated_hash = self._generate_hash(notification_data)
            
            if received_hash != calculated_hash:
                logger.error(f"支付回调签名验证失败: 期望={calculated_hash}, 实际={received_hash}")
                return False
            
            logger.info("支付回调签名验证成功")
            
            # 5. 获取支付记录
            payment_record = await self._get_payment_record_by_trade_order_id(trade_order_id)
            if not payment_record:
                logger.error(f"未找到订单记录: {trade_order_id}")
                return False
            
            # 6. 验证金额
            if float(total_fee) != payment_record.amount:
                logger.error(f"支付金额不匹配: 期望={payment_record.amount}, 实际={total_fee}")
                return False
            
            # 7. 处理不同的支付状态
            if status == "OD":  # 已支付
                if payment_record.status == PaymentStatus.SUCCESS:
                    logger.info(f"订单已处理过: {trade_order_id}")
                    return True  # 重复通知，直接返回成功
                
                # 更新支付状态为成功
                payment_record.status = PaymentStatus.SUCCESS
                payment_record.paid_at = datetime.now()
                payment_record.transaction_id = transaction_id
                
                logger.info(f"订单支付成功: {trade_order_id}, 交易号: {transaction_id}")
                
                # 更新用户订阅
                await self._update_user_subscription(payment_record)
                
            elif status == "CD":  # 已退款
                payment_record.status = PaymentStatus.REFUNDED
                logger.info(f"订单已退款: {trade_order_id}")
                
            elif status == "RD":  # 退款中
                logger.info(f"订单退款中: {trade_order_id}")
                # 保持当前状态，不做修改
                
            elif status == "UD":  # 退款失败
                logger.warning(f"订单退款失败: {trade_order_id}")
                # 保持当前状态，不做修改
                
            else:
                logger.warning(f"未知的支付状态: {status}, 订单号: {trade_order_id}")
                return False
            
            # 8. 保存更新后的支付记录
            await self._save_payment_record(payment_record)
            
            logger.info(f"支付回调处理完成: {trade_order_id}, 最终状态: {payment_record.status}")
            return True
            
        except Exception as e:
            logger.error(f"处理支付回调异常: {str(e)}", exc_info=True)
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