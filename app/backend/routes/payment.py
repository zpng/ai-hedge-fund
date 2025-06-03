import logging
from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from typing import Dict, Any
import traceback
import logging

from app.backend.models.user import User, SubscriptionType
from app.backend.models.payment import PaymentRecord
from app.backend.services.payment_service import PaymentService
from app.backend.services.redis_service import RedisService
from app.backend.dependencies import get_redis_service
from app.backend.routes.auth import get_current_user

router = APIRouter(prefix="/payment")
logger = logging.getLogger("payment_routes")


def get_payment_service(redis_service: RedisService = Depends(get_redis_service)) -> PaymentService:
    """获取支付服务实例"""
    return PaymentService(redis_service)


@router.post("/create")
async def create_payment(
    subscription_type: SubscriptionType,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """创建支付订单"""
    try:
        # 记录请求信息
        logger.info(f"创建支付订单: 用户ID={current_user.id}, 订阅类型={subscription_type}")
        
        # 检查用户是否已经是付费用户
        if current_user.subscription_type != SubscriptionType.TRIAL:
            logger.warning(f"用户已是付费用户: {current_user.id}, 当前订阅类型: {current_user.subscription_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="您已经是付费用户，无需重复订阅"
            )
        
        # 创建支付记录
        payment_record = await payment_service.create_payment(current_user.id, subscription_type)
        logger.info(f"支付订单创建成功: {payment_record.trade_order_id}")
        
        return {
            "status": "success",
            "message": "支付订单创建成功",
            "data": {
                "trade_order_id": payment_record.trade_order_id,
                "payment_url": payment_record.payment_url,
                "amount": payment_record.amount,
                "subscription_type": payment_record.subscription_type
            }
        }
    except Exception as e:
        # 记录详细错误信息
        error_detail = traceback.format_exc()
        logger.error(f"创建支付订单失败: {str(e)}\n{error_detail}")
        
        # 返回错误响应
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建支付订单失败: {str(e)}"
        )


@router.get("/query/{trade_order_id}")
async def query_payment(
    trade_order_id: str,
    appid: str = None,
    out_trade_order: str = None,
    open_order_id: str = None,
    time: int = None,
    nonce_str: str = None,
    hash: str = None,
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """查询支付状态
    
    根据虎皮椒订单查询接口文档实现：
    请求参数：
    - appid: APP ID (必填)
    - out_trade_order: 商户网站订单号 (与open_order_id二选一)
    - open_order_id: 虎皮椒内部订单号 (与out_trade_order二选一)
    - time: 当前时间戳 (必填)
    - nonce_str: 随机值 (必填)
    - hash: 签名 (必填)
    
    返回格式：
    - errcode: 0表示成功，其他表示失败
    - data.status: OD(支付成功)，WP(待支付)，CD(已取消)
    - errmsg: 状态信息
    - hash: 响应签名
    """
    try:
        logger.info(f"查询支付状态: 订单号={trade_order_id}, 用户ID={current_user.id}")
        
        # 使用路径参数中的trade_order_id，也支持查询参数中的out_trade_order
        query_trade_order_id = out_trade_order or trade_order_id
        
        # 调用支付服务查询
        result = await payment_service.query_payment(
            trade_order_id=query_trade_order_id,
            open_order_id=open_order_id
        )
        
        logger.info(f"查询支付状态响应: {result}")
        
        # 直接返回符合虎皮椒接口格式的响应
        return JSONResponse(
            content=result,
            status_code=200
        )
        
    except Exception as e:
        # 记录详细错误信息
        error_detail = traceback.format_exc()
        logger.error(f"查询支付状态失败: {str(e)}\n{error_detail}")
        
        # 返回符合虎皮椒接口格式的错误响应
        error_response = {
            "errcode": 500,
            "errmsg": f"查询支付状态失败: {str(e)}",
            "hash": ""
        }
        
        return JSONResponse(
            content=error_response,
            status_code=200  # 虎皮椒接口通常返回200状态码，错误信息在errcode中
        )


@router.post("/notify")
async def payment_notify(
    request: Request,
    payment_service: PaymentService = Depends(get_payment_service)
):
    """支付回调通知接口
    
    处理虎皮椒支付平台的回调通知：
    - 接收POST表单数据
    - 验证回调参数和签名
    - 更新支付状态和用户订阅
    - 返回"success"表示处理成功，其他表示失败
    """
    try:
        # 记录请求基本信息
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        content_type = request.headers.get("content-type", "")
        
        logger.info(f"收到支付回调通知 - IP: {client_ip}, User-Agent: {user_agent}, Content-Type: {content_type}")
        
        # 获取请求数据
        notification_data = {}
        
        if content_type.startswith("application/json"):
            # 处理JSON数据（虽然文档说是表单，但保留兼容性）
            notification_data = await request.json()
            logger.info(f"支付回调数据(JSON): {notification_data}")
        elif content_type.startswith("application/x-www-form-urlencoded"):
            # 处理表单数据（虎皮椒标准格式）
            form_data = await request.form()
            notification_data = dict(form_data)
            logger.info(f"支付回调数据(表单): {notification_data}")
        else:
            # 尝试解析为表单数据
            try:
                form_data = await request.form()
                notification_data = dict(form_data)
                logger.info(f"支付回调数据(默认表单): {notification_data}")
            except Exception as parse_error:
                logger.error(f"无法解析回调数据，Content-Type: {content_type}, 错误: {str(parse_error)}")
                return "fail"
        
        # 验证数据不为空
        if not notification_data:
            logger.error("支付回调数据为空")
            return "fail"
        
        # 记录关键参数
        trade_order_id = notification_data.get("trade_order_id", "unknown")
        status = notification_data.get("status", "unknown")
        total_fee = notification_data.get("total_fee", "unknown")
        
        logger.info(f"处理支付回调 - 订单号: {trade_order_id}, 状态: {status}, 金额: {total_fee}")
        
        # 处理支付通知
        success = await payment_service.process_payment_notification(notification_data)
        
        if success:
            logger.info(f"支付回调处理成功 - 订单号: {trade_order_id}")
            return "success"  # 虎皮椒要求返回"success"字符串表示成功
        else:
            logger.warning(f"支付回调处理失败 - 订单号: {trade_order_id}")
            return "fail"  # 返回非"success"字符串表示失败，平台会重试
            
    except Exception as e:
        # 记录详细错误信息
        error_detail = traceback.format_exc()
        logger.error(f"支付回调处理异常: {str(e)}\n{error_detail}")
        return "fail"  # 异常情况返回失败，触发重试机制


@router.get("/return")
async def payment_return():
    """支付完成后的同步跳转页面"""
    return {"message": "支付处理中，请稍后刷新页面查看结果"}