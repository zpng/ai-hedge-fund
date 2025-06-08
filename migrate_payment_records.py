#!/usr/bin/env python3
"""
支付记录数据迁移脚本

将现有的支付记录迁移到新的用户索引结构中，以提高查询性能。
这个脚本会扫描所有现有的支付记录，并为每个用户创建支付记录索引。
"""

import os
import sys
import logging
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.backend.services.redis_service import RedisService
from app.backend.models.payment import PaymentRecord

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def migrate_payment_records():
    """迁移支付记录到新的索引结构"""
    try:
        # 获取Redis连接
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        redis_service = RedisService(redis_url)
        
        logger.info("开始迁移支付记录...")
        
        migrated_count = 0
        error_count = 0
        
        # 使用SCAN命令获取所有支付记录
        cursor = 0
        while True:
            try:
                cursor, keys = redis_service.redis_client.scan(
                    cursor=cursor,
                    match="payment:*",
                    count=100
                )
                
                # 过滤出支付记录键（排除订单映射键和用户索引键）
                payment_keys = [
                    key for key in keys 
                    if isinstance(key, str) 
                    and key.startswith("payment:") 
                    and not key.startswith("payment:order:")
                    and not key.startswith("user_payments:")
                ]
                
                for key in payment_keys:
                    try:
                        # 获取支付记录数据
                        data = redis_service.redis_client.get(key)
                        if not data:
                            continue
                            
                        # 解析支付记录
                        payment_record = PaymentRecord.parse_raw(data)
                        
                        # 创建用户支付记录索引
                        user_payments_key = f"user_payments:{payment_record.user_id}"
                        timestamp = payment_record.created_at.timestamp()
                        
                        # 检查是否已经存在索引
                        if not redis_service.redis_client.zscore(user_payments_key, payment_record.id):
                            # 添加到有序集合
                            redis_service.redis_client.zadd(
                                user_payments_key, 
                                {payment_record.id: timestamp}
                            )
                            migrated_count += 1
                            logger.info(f"迁移支付记录: {payment_record.id} -> 用户: {payment_record.user_id}")
                        
                    except Exception as parse_error:
                        error_count += 1
                        logger.error(f"处理支付记录失败: {key}, 错误: {str(parse_error)}")
                        continue
                
                if cursor == 0:
                    break
                    
            except Exception as scan_error:
                logger.error(f"Redis SCAN操作失败: {str(scan_error)}")
                break
        
        logger.info(f"迁移完成！成功迁移 {migrated_count} 条记录，失败 {error_count} 条")
        
        # 验证迁移结果
        logger.info("验证迁移结果...")
        user_indexes = redis_service.redis_client.keys("user_payments:*")
        logger.info(f"创建了 {len(user_indexes)} 个用户支付记录索引")
        
        for user_index in user_indexes[:5]:  # 只显示前5个作为示例
            count = redis_service.redis_client.zcard(user_index)
            user_id = user_index.replace("user_payments:", "")
            logger.info(f"用户 {user_id} 有 {count} 条支付记录")
        
    except Exception as e:
        logger.error(f"迁移过程中发生错误: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_payment_records()