from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from app.backend.models.user import (
    LoginRequest, VerifyCodeRequest, LoginResponse, UserProfile, 
    SubscriptionRequest, ApiUsageResponse, User, SubscriptionType
)
from app.backend.services.auth_service import AuthService
from app.backend.services.redis_service import RedisService
from app.backend.dependencies import get_auth_service, get_redis_service

router = APIRouter(prefix="/auth")
security = HTTPBearer()


@router.post("/send-code")
async def send_verification_code(
    request: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Send verification code to phone number."""
    try:
        code = await auth_service.send_verification_code(request.phone)
        return {"message": "Verification code sent successfully", "code": code}  # Remove code in production
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification code: {str(e)}"
        )


@router.post("/verify", response_model=LoginResponse)
async def verify_code_and_login(
    request: VerifyCodeRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Verify code and login/register user."""
    result = await auth_service.verify_and_login(
        request.phone, 
        request.code, 
        request.invite_code
    )
    return result


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
        "total_api_calls": current_user.total_api_calls
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
            detail="You already have 5 active invite codes. Maximum limit reached."
        )
    
    # Generate remaining codes
    codes_to_generate = 5 - len(active_codes)
    new_codes = await redis_service._generate_invite_codes(current_user.id, codes_to_generate)
    
    return {
        "message": f"Generated {codes_to_generate} new invite codes",
        "new_codes": [code.code for code in new_codes]
    }


@router.post("/subscribe")
async def subscribe(
    request: SubscriptionRequest,
    current_user: User = Depends(get_current_user),
    redis_service: RedisService = Depends(get_redis_service)
):
    """Subscribe to a paid plan."""
    # TODO: Integrate with payment processor (Stripe, etc.)
    # For now, we'll just update the subscription directly
    
    if request.subscription_type == SubscriptionType.TRIAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot subscribe to trial plan"
        )
    
    await redis_service.update_subscription(current_user.id, request.subscription_type)
    
    return {
        "message": f"Successfully subscribed to {request.subscription_type} plan",
        "subscription_type": request.subscription_type
    }


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Logout user (invalidate token)."""
    # For JWT tokens, we can't really invalidate them server-side without a blacklist
    # In a production environment, you might want to implement a token blacklist in Redis
    return {"message": "Logged out successfully"}