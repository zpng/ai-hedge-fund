# AI对冲基金 - 用户认证系统

本项目已集成完整的用户认证系统，包括手机号验证码登录、邀请码机制、试用限制和付费订阅功能。

## 🚀 新增功能

### 1. 用户认证
- **手机号 + 验证码登录**：支持手机号注册和登录
- **JWT Token认证**：安全的会话管理
- **自动注册**：首次登录自动创建账户

### 2. 邀请码系统
- 每个用户可生成5个邀请码
- 新用户使用邀请码注册可获得5次免费API调用
- 邀请码使用状态跟踪

### 3. 订阅管理
- **试用版**：默认0次API调用（使用邀请码可获得5次）
- **月付会员**：¥99/月，无限API调用
- **年付会员**：¥999/年，无限API调用

### 4. API访问控制
- 只有登录用户才能访问 `/hedge-fund/run` 接口
- 试用用户有调用次数限制
- 付费用户无限制调用

## 🛠️ 技术架构

### 后端技术栈
- **FastAPI**：Web框架
- **Redis**：用户数据存储和会话管理
- **JWT**：Token认证
- **Pydantic**：数据验证

### 前端技术栈
- **React + TypeScript**：用户界面
- **Context API**：状态管理
- **Tailwind CSS**：样式框架

## 📦 安装和配置

### 1. 快速安装
```bash
# 运行安装脚本
./setup_auth.sh
```

### 2. 手动安装
```bash
# 安装Python依赖
poetry install

# 安装前端依赖
cd app/frontend
npm install
cd ../..
```

### 3. 环境配置
复制 `.env.example` 到 `.env` 并配置以下变量：

```env
# Redis配置（推荐使用Upstash）
UPSTASH_REDIS_URL=redis://your-redis-url

# JWT密钥（生产环境请更换）
JWT_SECRET_KEY=your-super-secret-jwt-key

# 其他API密钥...
```

## 🚀 运行应用

### 启动后端
```bash
cd app
poetry run python -m backend.main
```

### 启动前端
```bash
cd app/frontend
npm run dev
```

## 📱 使用流程

### 1. 用户注册/登录
1. 输入手机号
2. 获取验证码（开发环境会在控制台显示）
3. 输入验证码完成登录
4. 可选：输入邀请码获得5次免费试用

### 2. 使用API
1. 登录后可访问主界面
2. 试用用户有调用次数限制
3. 调用次数用完需要升级订阅

### 3. 管理账户
1. 点击右侧边栏的"用户设置"
2. 查看API使用情况
3. 生成和管理邀请码
4. 升级订阅计划

## 🔧 API接口

### 认证相关
- `POST /auth/send-code` - 发送验证码
- `POST /auth/verify` - 验证码登录
- `GET /auth/me` - 获取用户信息
- `GET /auth/usage` - 获取API使用情况
- `POST /auth/generate-invite-codes` - 生成邀请码
- `POST /auth/subscribe` - 订阅付费计划

### 业务接口
- `POST /hedge-fund/run` - 运行对冲基金分析（需要认证）

## 🔒 安全特性

1. **JWT Token认证**：安全的无状态认证
2. **验证码过期**：验证码5分钟后自动过期
3. **会话管理**：Redis存储用户会话
4. **API访问控制**：基于用户订阅状态的访问控制
5. **邀请码防滥用**：每个用户最多5个活跃邀请码

## 🎯 生产环境部署

### 1. 环境变量
```env
# 生产环境必须更换
JWT_SECRET_KEY=your-production-secret-key

# 使用Upstash Redis
UPSTASH_REDIS_URL=redis://your-upstash-redis-url
```

### 2. SMS服务集成
当前验证码在控制台显示，生产环境需要集成SMS服务：
- 阿里云短信服务
- 腾讯云短信
- Twilio

在 `app/backend/services/auth_service.py` 的 `send_verification_code` 方法中添加SMS发送逻辑。

### 3. 支付集成
当前订阅功能为模拟实现，生产环境需要集成支付服务：
- Stripe
- 支付宝
- 微信支付

在 `app/backend/routes/auth.py` 的 `subscribe` 方法中添加支付逻辑。

## 🐛 故障排除

### 常见问题

1. **Redis连接失败**
   - 检查Redis服务是否启动
   - 验证UPSTASH_REDIS_URL配置

2. **验证码收不到**
   - 开发环境查看控制台输出
   - 生产环境检查SMS服务配置

3. **Token过期**
   - JWT Token默认7天过期
   - 用户需要重新登录

4. **API调用失败**
   - 检查用户是否已登录
   - 验证试用次数是否用完

## 📈 监控和分析

建议在生产环境中添加：
- 用户行为分析
- API调用统计
- 错误日志监控
- 性能指标追踪

## 🤝 贡献

欢迎提交Issue和Pull Request来改进认证系统！

## 📄 许可证

本项目遵循原项目的许可证。