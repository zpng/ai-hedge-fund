import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback

from app.backend.routes import api_router
from app.backend.dependencies import get_redis_service

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

# 应用启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时执行的任务"""
    try:
        # 应用启动初始化
        logger.info("应用启动完成")
    except Exception as e:
        logger.error(f"启动时初始化失败: {str(e)}")

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
