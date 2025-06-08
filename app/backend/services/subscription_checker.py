import asyncio
import logging
from datetime import datetime, timezone
from typing import List

from ..models.user import User, SubscriptionType
from .redis_service import RedisService

logger = logging.getLogger(__name__)

class SubscriptionChecker:
    """订阅状态检查服务，定期检查并更新过期的会员状态"""
    
    def __init__(self, redis_service: RedisService):
        self.redis_service = redis_service
        self.check_interval = 3600  # 每小时检查一次
        self._running = False
        self._task = None
    
    async def start(self):
        """启动订阅检查服务"""
        if self._running:
            logger.warning("订阅检查服务已在运行")
            return
        
        self._running = True
        self._task = asyncio.create_task(self._check_loop())
        logger.info("订阅检查服务已启动")
    
    async def stop(self):
        """停止订阅检查服务"""
        if not self._running:
            return
        
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("订阅检查服务已停止")
    
    async def _check_loop(self):
        """检查循环"""
        while self._running:
            try:
                await self.check_expired_subscriptions()
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"订阅检查过程中发生错误: {str(e)}")
                await asyncio.sleep(60)  # 出错时等待1分钟后重试
    
    async def check_expired_subscriptions(self):
        """检查并处理过期的订阅"""
        try:
            logger.info("开始检查过期订阅")
            
            # 获取所有用户
            expired_users = await self._get_expired_users()
            
            if not expired_users:
                logger.info("没有发现过期的订阅")
                return
            
            logger.info(f"发现 {len(expired_users)} 个过期订阅")
            
            # 处理过期用户
            for user in expired_users:
                await self._handle_expired_user(user)
            
            logger.info(f"已处理 {len(expired_users)} 个过期订阅")
            
        except Exception as e:
            logger.error(f"检查过期订阅时发生错误: {str(e)}")
    
    async def _get_expired_users(self) -> List[User]:
        """获取所有过期的付费用户"""
        expired_users = []
        
        try:
            # 获取所有用户ID
            user_ids = await self._get_all_user_ids()
            
            if not user_ids:
                logger.info("没有找到任何用户")
                return expired_users
            
            current_time = datetime.now(timezone.utc)
            logger.info(f"开始检查 {len(user_ids)} 个用户的订阅状态")
            
            for user_id in user_ids:
                try:
                    user = await self.redis_service.get_user_by_id(user_id)
                    if not user:
                        logger.warning(f"无法获取用户数据: {user_id}")
                        continue
                    
                    # 检查是否是付费用户且已过期
                    if (user.subscription_type != SubscriptionType.TRIAL and 
                        user.subscription_expires_at and 
                        user.subscription_expires_at <= current_time):
                        expired_users.append(user)
                        logger.info(f"发现过期用户: {user.email} (ID: {user_id}), 订阅类型: {user.subscription_type}, 过期时间: {user.subscription_expires_at}")
                    
                except Exception as user_error:
                    logger.error(f"处理用户 {user_id} 时发生错误: {str(user_error)}")
                    continue
            
        except Exception as e:
            logger.error(f"获取过期用户列表时发生错误: {str(e)}")
        
        return expired_users
    
    async def _get_all_user_ids(self) -> List[str]:
        """获取所有用户ID"""
        try:
            # 使用Redis的SCAN命令获取所有用户键
            user_keys = []
            cursor = 0
            
            while True:
                try:
                    cursor, keys = self.redis_service.redis_client.scan(
                        cursor=cursor, 
                        match="user:*", 
                        count=100
                    )
                    # 确保keys是字符串列表
                    if isinstance(keys, list):
                        user_keys.extend([key for key in keys if isinstance(key, str) and key.startswith("user:")])
                    if cursor == 0:
                        break
                except Exception as scan_error:
                    logger.error(f"Redis SCAN操作失败: {str(scan_error)}")
                    break
            
            # 从键名中提取用户ID
            user_ids = []
            for key in user_keys:
                try:
                    if ":" in key:
                        user_id = key.split(":")[1]
                        if user_id:  # 确保用户ID不为空
                            user_ids.append(user_id)
                except Exception as parse_error:
                    logger.warning(f"解析用户键失败: {key}, 错误: {str(parse_error)}")
                    continue
            
            logger.info(f"找到 {len(user_ids)} 个用户ID")
            return user_ids
            
        except Exception as e:
            logger.error(f"获取用户ID列表时发生错误: {str(e)}")
            return []
    
    async def _handle_expired_user(self, user: User):
        """处理过期用户"""
        try:
            logger.info(f"处理过期用户: {user.email} (ID: {user.id})")
            
            # 记录过期信息
            subscription_type = user.subscription_type
            expires_at = user.subscription_expires_at
            
            # 将用户状态重置为试用版
            user.subscription_type = SubscriptionType.TRIAL
            user.subscription_expires_at = None
            user.api_calls_remaining = 0  # 过期后API调用次数归零
            
            # 更新用户信息
            await self.redis_service.update_user(user)
            
            logger.info(
                f"用户 {user.email} 的 {subscription_type} 订阅已过期 "
                f"(过期时间: {expires_at})，已重置为试用版"
            )
            
        except Exception as e:
            logger.error(f"处理过期用户 {user.id} 时发生错误: {str(e)}")
    
    async def check_user_subscription_status(self, user_id: str) -> bool:
        """检查单个用户的订阅状态，返回是否仍然有效"""
        try:
            user = await self.redis_service.get_user_by_id(user_id)
            if not user:
                return False
            
            # 如果是试用用户，直接返回True（由API调用次数限制）
            if user.subscription_type == SubscriptionType.TRIAL:
                return True
            
            # 检查付费用户是否过期
            if user.subscription_expires_at and user.subscription_expires_at <= datetime.now(timezone.utc):
                # 订阅已过期，更新用户状态
                await self._handle_expired_user(user)
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"检查用户 {user_id} 订阅状态时发生错误: {str(e)}")
            return False