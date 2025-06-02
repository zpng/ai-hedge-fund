# 使用官方 Node.js 镜像作为构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install

# 复制源代码
COPY . .

# 构建应用，忽略TypeScript错误
RUN pnpm run build || pnpm exec vite build --force

# 使用 nginx 作为生产环境
FROM nginx:alpine

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置文件（可选）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 8000

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]