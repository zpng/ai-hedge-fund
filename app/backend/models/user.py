from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, EmailStr
import hashlib
import os


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
    email: EmailStr
    password_hash: str
    created_at: datetime
    last_login: Optional[datetime] = None
    status: UserStatus = UserStatus.ACTIVE
    subscription_type: SubscriptionType = SubscriptionType.TRIAL
    subscription_expires_at: Optional[datetime] = None
    api_calls_remaining: int = 0
    total_api_calls: int = 0
    invited_by: Optional[str] = None  # User ID who invited this user
    email_verified: bool = False
    new_user_gift_calls: int = 0  # API calls gifted for new user registration
    invite_gift_calls: int = 0  # API calls gifted from invite code
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password for storing."""
        salt = os.urandom(32)  # 32 bytes salt
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return salt.hex() + pwdhash.hex()
    
    @staticmethod
    def verify_password(stored_password: str, provided_password: str) -> bool:
        """Verify a stored password against one provided by user"""
        salt = bytes.fromhex(stored_password[:64])
        stored_hash = stored_password[64:]
        pwdhash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000).hex()
        return pwdhash == stored_hash


class InviteCode(BaseModel):
    code: str
    user_id: str  # Owner of the invite code
    created_at: datetime
    used_at: Optional[datetime] = None
    used_by: Optional[str] = None  # User ID who used this code
    is_active: bool = True


class VerificationCode(BaseModel):
    email: EmailStr
    code: str
    created_at: datetime
    expires_at: datetime
    is_used: bool = False


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    invite_code: Optional[str] = Field(None, description="Invite code for new users")


class VerifyEmailRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    code: str = Field(..., description="Verification code")


class SendVerificationRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    code: str = Field(..., description="Verification code")
    new_password: str = Field(..., description="New password")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


class InviteCodeWithEmail(InviteCode):
    used_by_email: Optional[str] = None


class UserProfile(BaseModel):
    user: User
    invite_codes: list[InviteCodeWithEmail]
    subscription_info: dict


class SubscriptionRequest(BaseModel):
    subscription_type: SubscriptionType
    payment_method: str = "stripe"  # Future payment integration


class ApiUsageResponse(BaseModel):
    calls_remaining: int
    total_calls: int
    new_user_gift_calls: int
    invite_gift_calls: int
    subscription_type: SubscriptionType
    subscription_expires_at: Optional[datetime]


class ClearUserDataRequest(BaseModel):
    email: EmailStr = Field(..., description="要清空数据的用户邮箱")