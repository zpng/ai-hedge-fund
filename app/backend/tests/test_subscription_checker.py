import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from app.backend.models.user import User, SubscriptionType
from app.backend.services.subscription_checker import SubscriptionChecker
from app.backend.services.redis_service import RedisService


class TestSubscriptionChecker:
    """订阅检查服务测试"""
    
    @pytest.fixture
    def mock_redis_service(self):
        """模拟Redis服务"""
        redis_service = AsyncMock(spec=RedisService)
        redis_service.redis_client = MagicMock()
        return redis_service
    
    @pytest.fixture
    def subscription_checker(self, mock_redis_service):
        """创建订阅检查服务实例"""
        checker = SubscriptionChecker(mock_redis_service)
        checker.check_interval = 1  # 设置为1秒便于测试
        return checker
    
    def create_test_user(self, user_id: str, email: str, subscription_type: SubscriptionType, 
                        expires_at: datetime = None) -> User:
        """创建测试用户"""
        return User(
            id=user_id,
            email=email,
            password_hash="test_hash",
            created_at=datetime.now(),
            subscription_type=subscription_type,
            subscription_expires_at=expires_at,
            api_calls_remaining=10,
            total_api_calls=0,
            new_user_gift_calls=3,
            invite_gift_calls=5
        )
    
    @pytest.mark.asyncio
    async def test_check_expired_monthly_subscription(self, subscription_checker, mock_redis_service):
        """测试月付会员到期检查"""
        # 创建一个过期的月付用户
        expired_user = self.create_test_user(
            user_id="user1",
            email="test@example.com",
            subscription_type=SubscriptionType.MONTHLY,
            expires_at=datetime.now() - timedelta(days=1)  # 昨天过期
        )
        
        # 模拟获取用户ID列表
        mock_redis_service.redis_client.scan.side_effect = [
            (0, ["user:user1"])  # 返回一个用户
        ]
        
        # 模拟获取用户信息
        mock_redis_service.get_user_by_id.return_value = expired_user
        
        # 执行检查
        await subscription_checker.check_expired_subscriptions()
        
        # 验证用户状态被更新
        mock_redis_service.update_user.assert_called_once()
        updated_user = mock_redis_service.update_user.call_args[0][0]
        
        assert updated_user.subscription_type == SubscriptionType.TRIAL
        assert updated_user.subscription_expires_at is None
        assert updated_user.api_calls_remaining == 0
    
    @pytest.mark.asyncio
    async def test_check_expired_yearly_subscription(self, subscription_checker, mock_redis_service):
        """测试年付会员到期检查"""
        # 创建一个过期的年付用户
        expired_user = self.create_test_user(
            user_id="user2",
            email="yearly@example.com",
            subscription_type=SubscriptionType.YEARLY,
            expires_at=datetime.now() - timedelta(days=1)  # 昨天过期
        )
        
        # 模拟获取用户ID列表
        mock_redis_service.redis_client.scan.side_effect = [
            (0, ["user:user2"])
        ]
        
        # 模拟获取用户信息
        mock_redis_service.get_user_by_id.return_value = expired_user
        
        # 执行检查
        await subscription_checker.check_expired_subscriptions()
        
        # 验证用户状态被更新
        mock_redis_service.update_user.assert_called_once()
        updated_user = mock_redis_service.update_user.call_args[0][0]
        
        assert updated_user.subscription_type == SubscriptionType.TRIAL
        assert updated_user.subscription_expires_at is None
        assert updated_user.api_calls_remaining == 0
    
    @pytest.mark.asyncio
    async def test_check_valid_subscription(self, subscription_checker, mock_redis_service):
        """测试有效订阅不会被修改"""
        # 创建一个有效的月付用户
        valid_user = self.create_test_user(
            user_id="user3",
            email="valid@example.com",
            subscription_type=SubscriptionType.MONTHLY,
            expires_at=datetime.now() + timedelta(days=15)  # 15天后过期
        )
        
        # 模拟获取用户ID列表
        mock_redis_service.redis_client.scan.side_effect = [
            (0, ["user:user3"])
        ]
        
        # 模拟获取用户信息
        mock_redis_service.get_user_by_id.return_value = valid_user
        
        # 执行检查
        await subscription_checker.check_expired_subscriptions()
        
        # 验证用户状态没有被更新（因为订阅仍然有效）
        mock_redis_service.update_user.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_check_trial_user_ignored(self, subscription_checker, mock_redis_service):
        """测试试用用户被忽略"""
        # 创建一个试用用户
        trial_user = self.create_test_user(
            user_id="user4",
            email="trial@example.com",
            subscription_type=SubscriptionType.TRIAL
        )
        
        # 模拟获取用户ID列表
        mock_redis_service.redis_client.scan.side_effect = [
            (0, ["user:user4"])
        ]
        
        # 模拟获取用户信息
        mock_redis_service.get_user_by_id.return_value = trial_user
        
        # 执行检查
        await subscription_checker.check_expired_subscriptions()
        
        # 验证试用用户没有被处理
        mock_redis_service.update_user.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_check_user_subscription_status_expired(self, subscription_checker, mock_redis_service):
        """测试单个用户订阅状态检查 - 过期情况"""
        # 创建一个过期用户
        expired_user = self.create_test_user(
            user_id="user5",
            email="expired@example.com",
            subscription_type=SubscriptionType.MONTHLY,
            expires_at=datetime.now() - timedelta(hours=1)  # 1小时前过期
        )
        
        # 模拟获取用户信息
        mock_redis_service.get_user_by_id.return_value = expired_user
        
        # 检查用户订阅状态
        result = await subscription_checker.check_user_subscription_status("user5")
        
        # 验证返回False（订阅无效）
        assert result is False
        
        # 验证用户状态被更新
        mock_redis_service.update_user.assert_called_once()
        updated_user = mock_redis_service.update_user.call_args[0][0]
        assert updated_user.subscription_type == SubscriptionType.TRIAL
    
    @pytest.mark.asyncio
    async def test_check_user_subscription_status_valid(self, subscription_checker, mock_redis_service):
        """测试单个用户订阅状态检查 - 有效情况"""
        # 创建一个有效用户
        valid_user = self.create_test_user(
            user_id="user6",
            email="valid@example.com",
            subscription_type=SubscriptionType.YEARLY,
            expires_at=datetime.now() + timedelta(days=100)  # 100天后过期
        )
        
        # 模拟获取用户信息
        mock_redis_service.get_user_by_id.return_value = valid_user
        
        # 检查用户订阅状态
        result = await subscription_checker.check_user_subscription_status("user6")
        
        # 验证返回True（订阅有效）
        assert result is True
        
        # 验证用户状态没有被更新
        mock_redis_service.update_user.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_check_user_subscription_status_trial(self, subscription_checker, mock_redis_service):
        """测试单个用户订阅状态检查 - 试用用户"""
        # 创建一个试用用户
        trial_user = self.create_test_user(
            user_id="user7",
            email="trial@example.com",
            subscription_type=SubscriptionType.TRIAL
        )
        
        # 模拟获取用户信息
        mock_redis_service.get_user_by_id.return_value = trial_user
        
        # 检查用户订阅状态
        result = await subscription_checker.check_user_subscription_status("user7")
        
        # 验证返回True（试用用户总是有效，由API调用次数限制）
        assert result is True
        
        # 验证用户状态没有被更新
        mock_redis_service.update_user.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_service_start_stop(self, subscription_checker):
        """测试服务启动和停止"""
        # 启动服务
        await subscription_checker.start()
        assert subscription_checker._running is True
        assert subscription_checker._task is not None
        
        # 停止服务
        await subscription_checker.stop()
        assert subscription_checker._running is False