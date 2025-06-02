FROM python:3.11-slim

WORKDIR /app

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 安装Poetry
RUN pip install poetry==1.7.1

# 复制依赖文件
COPY pyproject.toml poetry.lock* /app/

# 配置Poetry并安装依赖
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --only=main

# 复制源代码
COPY . /app/

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["python", "-m", "uvicorn", "app.backend.main:app", "--host", "0.0.0.0", "--port", "8080"]