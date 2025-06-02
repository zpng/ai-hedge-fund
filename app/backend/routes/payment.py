from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from typing import Dict, Any

from app.backend.models.user import User, SubscriptionType
from app.backend.models.payment import PaymentRecord
from app.backend.services.payment_service import PaymentService
from app.backend.services.redis_service import RedisService
from app.backend.dependencies import get_redis_service
from app.backend.routes.auth import get_current_user

router = APIRouter(prefix="/payment")


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
        # 检查用户是否已经是付费用户
        if current_user.subscription_type != SubscriptionType.TRIAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="您已经是付费用户，无需重复订阅"
            )
        
        # 创建支付记录
        payment_record = await payment_service.create_payment(current_user.id, subscription_type)
        
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
        result = await payment_service.query_payment(trade_order_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
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
        if request.headers.get("content-type", "").startswith("application/json"):
            notification_data = await request.json()
        else:
            # 处理表单数据
            form_data = await request.form()
            notification_data = dict(form_data)
        
        # 处理支付通知
        success = await payment_service.process_payment_notification(notification_data)
        
        if success:
            return "success"  # 虎皮椒要求返回"success"字符串
        else:
            return "fail"
    except Exception as e:
        print(f"支付回调处理失败: {str(e)}")
        return "fail"


@router.get("/return")
async def payment_return(request: Request):
    """支付成功跳转页面"""
    # 获取查询参数
    query_params = dict(request.query_params)
    trade_order_id = query_params.get("trade_order_id")
    
    if trade_order_id:
        # 可以重定向到前端的支付成功页面
        return JSONResponse({
            "status": "success",
            "message": "支付成功",
            "trade_order_id": trade_order_id
        })
    else:
        return JSONResponse({
            "status": "error",
            "message": "支付信息不完整"
        })