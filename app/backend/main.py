import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback

from app.backend.routes import api_router
from app.backend.dependencies import get_redis_service
from app.backend.services.subscription_checker import SubscriptionChecker

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("ai-hedge-fund")

app = FastAPI(title="AI Hedge Fund API", description="Backend API for AI Hedge Fund", version="0.1.0")

# 异常处理中间件
@app.middleware("http")
async def log_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        # 记录详细的异常信息
        error_detail = traceback.format_exc()
        logger.error(f"未捕获的异常: {str(e)}\n{error_detail}")
        
        # 返回错误响应
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "error_type": type(e).__name__}
        )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "https://*.aistockselect.com",  # 添加前端域名
        "https://www.aistockselect.com",  # 添加前端域名
        "https://*.zeabur.app"  # 允许所有Zeabur子域名
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routes
app.include_router(api_router)

# 全局订阅检查服务实例
subscription_checker = None

# 应用启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时执行的任务"""
    global subscription_checker
    try:
        # 初始化订阅检查服务
        redis_service = get_redis_service()
        subscription_checker = SubscriptionChecker(redis_service)
        await subscription_checker.start()
        logger.info("订阅检查服务已启动")
        
        # 应用启动初始化
        logger.info("应用启动完成")
    except Exception as e:
        logger.error(f"启动时初始化失败: {str(e)}")

# 应用关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行的任务"""
    global subscription_checker
    try:
        # 停止订阅检查服务
        if subscription_checker:
            await subscription_checker.stop()
            logger.info("订阅检查服务已停止")
        
        logger.info("应用关闭完成")
    except Exception as e:
        logger.error(f"关闭时清理失败: {str(e)}")

# 添加全局异常处理器
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # 记录详细的异常信息
    error_detail = traceback.format_exc()
    logger.error(f"全局异常处理器捕获到异常: {str(exc)}\n{error_detail}")
    
    # 返回错误响应
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "error_type": type(exc).__name__}
    )
