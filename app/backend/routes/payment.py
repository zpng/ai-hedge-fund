import logging
from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from typing import Dict, Any
import traceback

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
    current_user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """查询支付状态"""
    try:
        logger.info(f"查询支付状态: 订单号={trade_order_id}, 用户ID={current_user.id}")
        result = await payment_service.query_payment(trade_order_id)
        logger.info(f"查询支付状态成功: {result}")
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        # 记录详细错误信息
        error_detail = traceback.format_exc()
        logger.error(f"查询支付状态失败: {str(e)}\n{error_detail}")
        
        # 返回错误响应
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询支付状态失败: {str(e)}"
        )


@router.post("/notify")
async def payment_notify(
    request: Request,
    payment_service: PaymentService = Depends(get_payment_service)
):
    """支付回调通知接口"""
    try:
        # 获取请求数据
        logger.info("收到支付回调通知")
        if request.headers.get("content-type", "").startswith("application/json"):
            notification_data = await request.json()
            logger.info(f"支付回调数据(JSON): {notification_data}")
        else:
            # 处理表单数据
            form_data = await request.form()
            notification_data = dict(form_data)
            logger.info(f"支付回调数据(表单): {notification_data}")
        
        # 处理支付通知
        success = await payment_service.process_payment_notification(notification_data)
        
        if success:
            logger.info("支付回调处理成功")
            return "success"  # 虎皮椒要求返回"success"字符串
        else:
            logger.warning("支付回调处理失败")
            return "fail"
    except Exception as e:
        # 记录详细错误信息
        error_detail = traceback.format_exc()
        logger.error(f"支付回调处理异常: {str(e)}\n{error_detail}")
        return "fail"


@router.get("/return")
async def payment_return():
    """支付完成后的同步跳转页面"""
    return {"message": "支付处理中，请稍后刷新页面查看结果"}