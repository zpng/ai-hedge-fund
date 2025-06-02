import os
from functools import lru_cache
import os

from app.backend.services.redis_service import RedisService
from app.backend.services.auth_service import AuthService
from app.backend.services.payment_service import PaymentService


@lru_cache()
def get_redis_service() -> RedisService:
    """Get Redis service instance."""
    redis_url = os.getenv("UPSTASH_REDIS_URL", "redis://localhost:6379")
    return RedisService(redis_url)


@lru_cache()
def get_auth_service() -> AuthService:
    """Get Auth service instance."""
    redis_service = get_redis_service()
    secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    return AuthService(redis_service, secret_key)


@lru_cache()
def get_payment_service() -> PaymentService:
    """Get Payment service instance."""
    redis_service = get_redis_service()
    return PaymentService(redis_service)