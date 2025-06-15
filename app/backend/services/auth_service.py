import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status
import logging
from app.backend.models.user import User
from app.backend.services.redis_service import RedisService
from app.backend.services.email_service import EmailService


class AuthService:
    def __init__(self, redis_service: RedisService, email_service: EmailService, secret_key: str, algorithm: str = "HS256"):
        self.redis_service = redis_service
        self.email_service = email_service
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.logger = logging.getLogger(__name__)
    
    async def send_verification_code(self, email: str) -> str:
        """Send verification code to user's email. Returns the code for testing purposes."""
        try:
            # Check if user already exists
            existing_user = await self.redis_service.get_user_by_email(email)
            if existing_user:
                # 如果用户已存在但邮箱未验证，允许重新发送验证码
                if not existing_user.email_verified:
                    code = await self.redis_service.create_verification_code(email)
                    email_sent = await self.email_service.send_verification_email(email, code)
                    if not email_sent:
                        self.logger.error(f"Failed to send verification email to {email}")
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="邮件发送失败，请检查邮箱地址是否正确或稍后重试"
                        )
                    self.logger.info(f"Verification code resent to existing unverified user: {email}")
                    return code
                # 如果用户已存在且邮箱已验证，提示用户直接登录
                self.logger.warning(f"Attempt to send verification code to already verified email: {email}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="该邮箱已注册并验证，请直接登录"
                )
            
            # 如果用户不存在，创建验证码并发送
            code = await self.redis_service.create_verification_code(email)
            email_sent = await self.email_service.send_verification_email(email, code)
            if not email_sent:
                self.logger.error(f"Failed to send verification email to new user: {email}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="邮件发送失败，请检查邮箱地址是否正确或稍后重试"
                )
            self.logger.info(f"Verification code sent to new user: {email}")
            return code
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error in send_verification_code for {email}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="系统错误，请稍后重试"
            )
    
    async def register(self, email: str, password: str, invite_code: Optional[str] = None) -> User:
        """Register a new user."""
        # 检查邮箱是否已验证
        if not await self.redis_service.is_email_verified(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not verified. Please verify your email first."
            )
        
        # 检查用户是否已存在
        existing_user = await self.redis_service.get_user_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # 处理邀请码
        invited_by = None
        if invite_code:
            if not await self.redis_service.validate_invite_code(invite_code):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid invite code"
                )
            
            # 使用邀请码
            invite = await self.redis_service.use_invite_code(invite_code, "temp_user_id")
            if invite:
                invited_by = invite.user_id
        
        # 创建新用户，并标记为已验证
        user = await self.redis_service.create_user(email, password, invited_by, email_verified=True)
        
        # 更新邀请码的实际用户ID
        if invite_code and invited_by:
            invite = await self.redis_service.use_invite_code(invite_code, user.id)
        
        # 发送欢迎邮件
        await self.email_service.send_welcome_email(email)
        
        # 发送管理员通知邮件
        await self.email_service.send_admin_notification_email(email)
        
        return user
    
    async def verify_email(self, email: str, code: str) -> bool:
        """Verify user's email with verification code."""
        # 验证验证码
        if not await self.redis_service.verify_code(email, code):
            return False
        
        # 标记邮箱为已验证
        await self.redis_service.mark_email_verified(email)
        return True
    
    async def login(self, email: str, password: str) -> dict:
        """Login user with email and password."""
        # Check if user exists
        user = await self.redis_service.get_user_by_email(email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not User.verify_password(user.password_hash, password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update last login time
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
    
    async def send_password_reset_code(self, email: str) -> str:
        """Send password reset code to user's email."""
        try:
            # Check if user exists
            user = await self.redis_service.get_user_by_email(email)
            if not user:
                # For security, don't reveal if email exists or not
                self.logger.warning(f"Password reset requested for non-existent email: {email}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="如果该邮箱已注册，您将收到密码重置邮件"
                )
            
            # Generate password reset code
            code = await self.redis_service.create_password_reset_code(email)
            
            # Send password reset email
            email_sent = await self.email_service.send_password_reset_email(email, code)
            if not email_sent:
                self.logger.error(f"Failed to send password reset email to {email}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="邮件发送失败，请检查邮箱地址是否正确或稍后重试"
                )
            
            self.logger.info(f"Password reset code sent to: {email}")
            return code
            
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error in send_password_reset_code for {email}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="系统错误，请稍后重试"
            )
    
    async def reset_password(self, email: str, code: str, new_password: str) -> bool:
        """Reset user's password with verification code."""
        try:
            # Check if user exists
            user = await self.redis_service.get_user_by_email(email)
            if not user:
                self.logger.warning(f"Password reset attempted for non-existent email: {email}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用户不存在"
                )
            
            # Verify password reset code
            if not await self.redis_service.verify_password_reset_code(email, code):
                self.logger.warning(f"Invalid password reset code for {email}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="验证码无效或已过期"
                )
            
            # Update password
            success = await self.redis_service.update_user_password(email, new_password)
            if not success:
                self.logger.error(f"Failed to update password for {email}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="密码更新失败，请稍后重试"
                )
            
            # Mark reset code as used
            await self.redis_service.use_password_reset_code(email, code)
            
            self.logger.info(f"Password reset successful for: {email}")
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error in reset_password for {email}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="系统错误，请稍后重试"
            )
    
    def _create_access_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=30)  # 30 days expiry
        
        to_encode = {"sub": user_id, "exp": expire}
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        # Create session in Redis
        self.redis_service.create_session(user_id)
        
        return encoded_jwt