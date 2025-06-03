import json
import random
import string
from datetime import datetime, timedelta
from typing import Optional, List
import redis
from app.backend.models.user import User, InviteCode, VerificationCode, SubscriptionType, UserStatus


class RedisService:
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
    
    # User management
    async def create_user(self, email: str, password: str, invited_by: Optional[str] = None, email_verified: bool = False) -> User:
        user_id = self._generate_user_id()
        password_hash = User.hash_password(password)
        user = User(
            id=user_id,
            email=email,
            password_hash=password_hash,
            created_at=datetime.now(),
            subscription_type=SubscriptionType.TRIAL,
            api_calls_remaining=5 if invited_by else 0,  # 5 free calls if invited
            invited_by=invited_by,
            email_verified=email_verified
        )
        
        # Store user data
        user_key = f"user:{user_id}"
        self.redis_client.hset(user_key, "data", user.model_dump_json())
        
        # Index by email
        self.redis_client.set(f"email:{email}", user_id)
        
        # Generate initial invite codes for the user
        await self._generate_invite_codes(user_id, 5)
        
        return user
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        user_id = self.redis_client.get(f"email:{email}")
        if not user_id:
            return None
        return await self.get_user_by_id(user_id)
        
    async def verify_user_email(self, user_id: str) -> None:
        user = await self.get_user_by_id(user_id)
        if user:
            user.email_verified = True
            await self.update_user(user)
    
    async def is_email_verified(self, email: str) -> bool:
        """检查邮箱是否已验证，用于注册前的验证"""
        # 检查是否有验证记录
        key = f"verified_email:{email}"
        return bool(self.redis_client.exists(key))
    
    async def mark_email_verified(self, email: str) -> None:
        """标记邮箱为已验证，用于注册前的验证"""
        # 标记邮箱为已验证
        key = f"verified_email:{email}"
        self.redis_client.set(key, "1")
        
        # 标记验证码为已使用
        verification_key = f"verification:{email}"
        verification_data = self.redis_client.get(verification_key)
        if verification_data:
            verification = VerificationCode.model_validate_json(verification_data)
            verification.is_used = True
            self.redis_client.setex(verification_key, 300, verification.model_dump_json())
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        user_data = self.redis_client.hget(f"user:{user_id}", "data")
        if not user_data:
            return None
        return User.model_validate_json(user_data)
    
    async def update_user(self, user: User) -> None:
        user_key = f"user:{user.id}"
        self.redis_client.hset(user_key, "data", user.model_dump_json())
    
    async def update_last_login(self, user_id: str) -> None:
        user = await self.get_user_by_id(user_id)
        if user:
            user.last_login = datetime.now()
            await self.update_user(user)
    
    # Verification code management
    async def create_verification_code(self, email: str) -> str:
        code = self._generate_verification_code()
        verification = VerificationCode(
            email=email,
            code=code,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(minutes=5)
        )
        
        # Store verification code (expires in 5 minutes)
        key = f"verification:{email}"
        self.redis_client.setex(key, 300, verification.model_dump_json())
        
        return code
    
    async def verify_code(self, email: str, code: str) -> bool:
        key = f"verification:{email}"
        verification_data = self.redis_client.get(key)
        
        if not verification_data:
            return False
        
        verification = VerificationCode.model_validate_json(verification_data)
        
        if verification.is_used or verification.expires_at < datetime.now():
            return False
        
        if verification.code != code:
            return False
        
        # Mark as used
        verification.is_used = True
        self.redis_client.setex(key, 300, verification.model_dump_json())
        
        return True
    
    # Invite code management
    async def _generate_invite_codes(self, user_id: str, count: int) -> List[InviteCode]:
        invite_codes = []
        for _ in range(count):
            code = self._generate_invite_code()
            invite = InviteCode(
                code=code,
                user_id=user_id,
                created_at=datetime.now()
            )
            
            # Store invite code
            self.redis_client.hset(f"invite:{code}", "data", invite.model_dump_json())
            
            # Add to user's invite codes list
            self.redis_client.sadd(f"user_invites:{user_id}", code)
            
            invite_codes.append(invite)
        
        return invite_codes
    
    async def get_user_invite_codes(self, user_id: str) -> List[InviteCode]:
        codes = self.redis_client.smembers(f"user_invites:{user_id}")
        invite_codes = []
        
        for code in codes:
            invite_data = self.redis_client.hget(f"invite:{code}", "data")
            if invite_data:
                invite_codes.append(InviteCode.model_validate_json(invite_data))
        
        return invite_codes
    
    async def use_invite_code(self, code: str, used_by: str) -> Optional[InviteCode]:
        invite_data = self.redis_client.hget(f"invite:{code}", "data")
        if not invite_data:
            return None
        
        invite = InviteCode.model_validate_json(invite_data)
        
        if not invite.is_active or invite.used_at:
            return None
        
        # Mark as used
        invite.used_at = datetime.now()
        invite.used_by = used_by
        invite.is_active = False
        
        # Update in Redis
        self.redis_client.hset(f"invite:{code}", "data", invite.model_dump_json())
        
        return invite
    
    async def validate_invite_code(self, code: str) -> bool:
        invite_data = self.redis_client.hget(f"invite:{code}", "data")
        if not invite_data:
            return False
        
        invite = InviteCode.model_validate_json(invite_data)
        return invite.is_active and not invite.used_at
    
    # API usage tracking
    async def consume_api_call(self, user_id: str) -> bool:
        """Consume one API call. Returns True if successful, False if no calls remaining."""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        # Check if user has active subscription
        if user.subscription_type != SubscriptionType.TRIAL:
            if user.subscription_expires_at and user.subscription_expires_at > datetime.now():
                user.total_api_calls += 1
                await self.update_user(user)
                return True
            else:
                # Subscription expired, revert to trial with 0 calls
                user.subscription_type = SubscriptionType.TRIAL
                user.api_calls_remaining = 0
                user.subscription_expires_at = None
                await self.update_user(user)
                return False
        
        # Trial user - check remaining calls
        if user.api_calls_remaining <= 0:
            return False
        
        user.api_calls_remaining -= 1
        user.total_api_calls += 1
        await self.update_user(user)
        
        return True
    
    async def add_api_calls(self, user_id: str, calls: int) -> None:
        """Add API calls to user's remaining count (for trial users)."""
        user = await self.get_user_by_id(user_id)
        if user and user.subscription_type == SubscriptionType.TRIAL:
            user.api_calls_remaining += calls
            await self.update_user(user)
    
    # Subscription management
    async def update_subscription(self, user_id: str, subscription_type: SubscriptionType) -> None:
        user = await self.get_user_by_id(user_id)
        if not user:
            return
        
        user.subscription_type = subscription_type
        
        if subscription_type == SubscriptionType.MONTHLY:
            user.subscription_expires_at = datetime.now() + timedelta(days=30)
        elif subscription_type == SubscriptionType.YEARLY:
            user.subscription_expires_at = datetime.now() + timedelta(days=365)
        else:
            user.subscription_expires_at = None
        
        await self.update_user(user)
    
    # Session management
    async def create_session(self, user_id: str) -> str:
        session_token = self._generate_session_token()
        session_key = f"session:{session_token}"
        
        # Store session for 24 hours
        self.redis_client.setex(session_key, 86400, user_id)
        
        return session_token
    
    async def get_user_from_session(self, session_token: str) -> Optional[User]:
        session_key = f"session:{session_token}"
        user_id = self.redis_client.get(session_key)
        
        if not user_id:
            return None
        
        return await self.get_user_by_id(user_id)
    
    async def invalidate_session(self, session_token: str) -> None:
        session_key = f"session:{session_token}"
        self.redis_client.delete(session_key)
    
    # Helper methods
    def _generate_user_id(self) -> str:
        return ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    
    def _generate_verification_code(self) -> str:
        return ''.join(random.choices(string.digits, k=6))
    
    def _generate_invite_code(self) -> str:
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    def _generate_session_token(self) -> str:
        return ''.join(random.choices(string.ascii_letters + string.digits, k=32))