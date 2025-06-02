import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status
from app.backend.models.user import User
from app.backend.services.redis_service import RedisService


class AuthService:
    def __init__(self, redis_service: RedisService, secret_key: str, algorithm: str = "HS256"):
        self.redis_service = redis_service
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    async def send_verification_code(self, phone: str) -> str:
        """Send verification code to phone number. Returns the code for testing purposes."""
        code = await self.redis_service.create_verification_code(phone)
        
        # TODO: Integrate with SMS service (Twilio, Aliyun SMS, etc.)
        # For now, we'll just return the code for testing
        print(f"Verification code for {phone}: {code}")
        
        return code
    
    async def verify_and_login(self, phone: str, code: str, invite_code: Optional[str] = None) -> dict:
        """Verify code and login/register user."""
        # Verify the code
        if not await self.redis_service.verify_code(phone, code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code"
            )
        
        # Check if user exists
        user = await self.redis_service.get_user_by_phone(phone)
        
        if not user:
            # New user registration
            invited_by = None
            
            # Validate invite code if provided
            if invite_code:
                if not await self.redis_service.validate_invite_code(invite_code):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid invite code"
                    )
                
                # Use the invite code
                invite = await self.redis_service.use_invite_code(invite_code, "temp_user_id")
                if invite:
                    invited_by = invite.user_id
            
            # Create new user
            user = await self.redis_service.create_user(phone, invited_by)
            
            # Update invite code with actual user ID
            if invite_code and invited_by:
                invite = await self.redis_service.use_invite_code(invite_code, user.id)
        else:
            # Existing user login
            await self.redis_service.update_last_login(user.id)
        
        # Generate JWT token
        access_token = self._create_access_token(user.id)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
    
    async def get_current_user(self, token: str) -> User:
        """Get current user from JWT token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("sub")
            
            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            user = await self.redis_service.get_user_by_id(user_id)
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return user
            
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    async def check_api_access(self, user: User) -> bool:
        """Check if user has API access and consume one call if they do."""
        return await self.redis_service.consume_api_call(user.id)
    
    def _create_access_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=7)  # 7 days expiry
        
        to_encode = {"sub": user_id, "exp": expire}
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        return encoded_jwt