from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
import logging
from app.backend.models.user import (
    LoginRequest, VerifyEmailRequest, RegisterRequest, SendVerificationRequest,
    LoginResponse, UserProfile, SubscriptionRequest, ApiUsageResponse, 
    User, SubscriptionType, ForgotPasswordRequest, ResetPasswordRequest, ClearUserDataRequest
)
from app.backend.services.auth_service import AuthService
from app.backend.services.redis_service import RedisService
from app.backend.dependencies import get_auth_service, get_redis_service

router = APIRouter(prefix="/auth")
security = HTTPBearer()
logger = logging.getLogger(__name__)


@router.post("/send-code")
async def send_verification_code(
    request: SendVerificationRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Send verification code to user's email."""
    try:
        code = await auth_service.send_verification_code(request.email)
        return {"message": "验证码发送成功", "code": code}  # Remove code in production
    except HTTPException as e:
        # 记录业务逻辑错误
        logger.warning(f"Send verification code failed for {request.email}: {e.detail}")
        raise e
    except Exception as e:
        # 记录系统错误
        logger.error(f"System error when sending verification code to {request.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"发送验证码失败: {str(e)}"
        )


@router.post("/verify-email")
async def verify_email(
    request: VerifyEmailRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Verify user's email with verification code."""
    result = await auth_service.verify_email(request.email, request.code)
    if result:
        return {"message": "邮箱验证成功"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码无效或已过期"
        )


@router.post("/register")
async def register_user(
    request: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
    redis_service: RedisService = Depends(get_redis_service)
):
    """Register a new user with email and password."""
    # 检查邮箱是否已验证
    is_verified = await redis_service.is_email_verified(request.email)
    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱未验证，请先验证邮箱后再注册"
        )
        
    user = await auth_service.register(
        request.email,
        request.password,
        request.invite_code
    )
    return {"message": "注册成功", "user_id": user.id}


@router.post("/login", response_model=LoginResponse)
async def login_user(
    request: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Login with email and password."""
    result = await auth_service.login(request.email, request.password)
    return result


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Send password reset code to user's email."""
    try:
        code = await auth_service.send_password_reset_code(request.email)
        return {"message": "如果该邮箱已注册，您将收到密码重置邮件", "code": code}  # Remove code in production
    except HTTPException as e:
        logger.warning(f"Forgot password failed for {request.email}: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"System error when sending password reset code to {request.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"发送密码重置邮件失败: {str(e)}"
        )


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Reset user's password with verification code."""
    try:
        success = await auth_service.reset_password(request.email, request.code, request.new_password)
        if success:
            return {"message": "密码重置成功，请使用新密码登录"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码重置失败"
            )
    except HTTPException as e:
        logger.warning(f"Password reset failed for {request.email}: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"System error when resetting password for {request.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"密码重置失败: {str(e)}"
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """Dependency to get current authenticated user."""
    return await auth_service.get_current_user(credentials.credentials)


@router.get("/me", response_model=UserProfile)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    redis_service: RedisService = Depends(get_redis_service)
):
    """Get current user profile with invite codes."""
    invite_codes = await redis_service.get_user_invite_codes(current_user.id)
    
    subscription_info = {
        "type": current_user.subscription_type,
        "expires_at": current_user.subscription_expires_at,
        "api_calls_remaining": current_user.api_calls_remaining,
        "total_api_calls": current_user.total_api_calls,
        "new_user_gift_calls": current_user.new_user_gift_calls,
        "invite_gift_calls": current_user.invite_gift_calls
    }
    
    return UserProfile(
        user=current_user,
        invite_codes=invite_codes,
        subscription_info=subscription_info
    )


@router.get("/usage", response_model=ApiUsageResponse)
async def get_api_usage(
    current_user: User = Depends(get_current_user)
):
    """Get user's API usage information."""
    return ApiUsageResponse(
        calls_remaining=current_user.api_calls_remaining,
        total_calls=current_user.total_api_calls,
        new_user_gift_calls=current_user.new_user_gift_calls,
        invite_gift_calls=current_user.invite_gift_calls,
        subscription_type=current_user.subscription_type,
        subscription_expires_at=current_user.subscription_expires_at
    )


@router.post("/generate-invite-codes")
async def generate_invite_codes(
    current_user: User = Depends(get_current_user),
    redis_service: RedisService = Depends(get_redis_service)
):
    """Generate new invite codes for the user (max 5 active codes)."""
    # Check current invite codes
    current_codes = await redis_service.get_user_invite_codes(current_user.id)
    active_codes = [code for code in current_codes if code.is_active and not code.used_at]
    
    if len(active_codes) >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您已有5个有效邀请码，已达到最大限制"
        )
    
    # Generate remaining codes
    codes_to_generate = 5 - len(active_codes)
    new_codes = await redis_service._generate_invite_codes(current_user.id, codes_to_generate)
    
    return {
        "message": f"已生成 {codes_to_generate} 个新邀请码",
        "new_codes": [code.code for code in new_codes]
    }


@router.post("/subscribe")
async def subscribe(
    request: SubscriptionRequest,
    current_user: User = Depends(get_current_user),
    redis_service: RedisService = Depends(get_redis_service)
):
    """Subscribe to a paid plan."""
    # 此方法已被弃用，改为使用虎皮椒支付
    # 请使用 /payment/create 接口创建支付订单
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="此接口已弃用，请使用虎皮椒支付接口"
    )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Logout user (invalidate token)."""
    # For JWT tokens, we can't really invalidate them server-side without a blacklist
    # In a production environment, you might want to implement a token blacklist in Redis
    return {"message": "退出登录成功"}


@router.post("/clear-user-data")
async def clear_user_data(
    request: ClearUserDataRequest,
    current_user: User = Depends(get_current_user),
    redis_service: RedisService = Depends(get_redis_service)
):
    """清空指定邮箱用户的所有数据（仅限特定管理员账号）"""
    # 检查当前用户是否为指定的管理员邮箱
    if current_user.email != "1014346275@qq.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限执行此操作"
        )
    
    try:
        success = await redis_service.clear_user_data_by_email(request.email)
        if success:
            return {"message": f"用户 {request.email} 的所有数据已清空"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
    except Exception as e:
        logger.error(f"清空用户数据失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="清空用户数据失败"
        )