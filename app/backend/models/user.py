from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class SubscriptionType(str, Enum):
    TRIAL = "trial"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class User(BaseModel):
    id: str
    phone: str
    created_at: datetime
    last_login: Optional[datetime] = None
    status: UserStatus = UserStatus.ACTIVE
    subscription_type: SubscriptionType = SubscriptionType.TRIAL
    subscription_expires_at: Optional[datetime] = None
    api_calls_remaining: int = 0
    total_api_calls: int = 0
    invited_by: Optional[str] = None  # User ID who invited this user


class InviteCode(BaseModel):
    code: str
    user_id: str  # Owner of the invite code
    created_at: datetime
    used_at: Optional[datetime] = None
    used_by: Optional[str] = None  # User ID who used this code
    is_active: bool = True


class VerificationCode(BaseModel):
    phone: str
    code: str
    created_at: datetime
    expires_at: datetime
    is_used: bool = False


class LoginRequest(BaseModel):
    phone: str = Field(..., description="User's phone number")


class VerifyCodeRequest(BaseModel):
    phone: str = Field(..., description="User's phone number")
    code: str = Field(..., description="Verification code")
    invite_code: Optional[str] = Field(None, description="Invite code for new users")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


class UserProfile(BaseModel):
    user: User
    invite_codes: list[InviteCode]
    subscription_info: dict


class SubscriptionRequest(BaseModel):
    subscription_type: SubscriptionType
    payment_method: str = "stripe"  # Future payment integration


class ApiUsageResponse(BaseModel):
    calls_remaining: int
    total_calls: int
    subscription_type: SubscriptionType
    subscription_expires_at: Optional[datetime]