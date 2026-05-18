# NextOps 生产环境部署指南

## 服务器信息

- **公网 IP**: 47.109.85.168
- **私网 IP**: 172.19.36.57
- **SSH 用户**: root

## 一、部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    nginx    │  │   API       │  │  PostgreSQL │        │
│  │  (前端:3019) │  │  (:4000)   │  │  (:5432)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                  │
│         │                └────────┬───────┘                  │
│         │                         │                          │
│         │                    ┌─────────┐                     │
│         └───────────────────▶│  Redis  │                     │
│                              │ (:6379) │                     │
│                              └─────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## 二、关键配置要点

### 1. API 服务 - 环境变量加载

**必须添加 dotenv 配置**，否则环境变量无法在生产环境读取：

```typescript
// apps/api/src/db.ts
import dotenv from "dotenv";
dotenv.config();

import pg from "pg";
// ...
```

```typescript
// apps/api/src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
// ...
```

### 2. API 服务 - CORS 中间件

**必须配置 CORS**，否则前端跨域请求失败：

```typescript
// apps/api/src/index.ts
import cors from "cors";

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*",
  credentials: true
}));
```

### 3. 前端 nginx 配置

**关键点**：
- 监听端口改为 `80`（不是 3000）
- 代理路径用 `/api/`（带尾部斜杠）

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. docker-compose.yml 配置

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: nextops
      POSTGRES_USER: nextops
      POSTGRES_PASSWORD: nextops
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nextops -d nextops"]

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ../apps/api
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgres://nextops:nextops@postgres:5432/nextops
      REDIS_URL: redis://redis:6379
      ALLOWED_ORIGINS: "*"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  web:
    build:
      context: ../apps/web
    volumes:
      - ../apps/web/nginx.conf:/etc/nginx/conf.d/default.conf
    ports:
      - "3019:80"
    depends_on:
      - api
```

### 5. .env 文件

```env
PORT=4000
NODE_ENV=production
DATABASE_URL=postgres://nextops:nextops@postgres:5432/nextops
REDIS_URL=redis://redis:6379
JWT_SECRET=nextops-production-secret-key-2026
ALLOWED_ORIGINS=*
```

## 三、部署命令

### 1. 拉取代码

```bash
cd /root
git clone https://github.com/zhangsan1989707/nextops.git
```

### 2. 停止旧服务

```bash
# 停止所有相关进程
pkill -f 'node.*nextops' || true
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 4000/tcp 2>/dev/null || true
fuser -k 6379/tcp 2>/dev/null || true
```

### 3. 启动 Docker 服务

```bash
cd /root/nextops/deploy

# 停止旧容器（如果存在）
docker compose down

# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f
```

### 4. 验证服务

```bash
# 检查容器状态
docker ps

# 测试 API
curl http://127.0.0.1:4000/health

# 测试前端
curl http://127.0.0.1:3019/

# 通过前端代理测试 API
curl http://127.0.0.1:3019/api/models
```

## 四、常见问题排查

### 问题 1: 前端显示 "Failed to fetch"

**原因**: CORS 未配置或未生效

**解决**: 
1. 检查 API 是否添加了 cors 中间件
2. 检查 `ALLOWED_ORIGINS` 环境变量
3. 重启 API 容器

### 问题 2: 数据库连接失败 "ECONNREFUSED"

**原因**: 环境变量未加载（dotenv 未配置）

**解决**:
1. 在 `db.ts` 和 `index.ts` 开头添加 `dotenv.config()`
2. 确保 `.env` 文件存在
3. 重新编译并启动

### 问题 3: nginx 502 或无法访问

**原因**: nginx 监听端口与容器端口映射不匹配

**解决**:
1. nginx.conf 监听 `80` 端口
2. docker-compose 映射 `3019:80`
3. 代理配置用 `/api/` 路径

### 问题 4: 前端 API 请求地址错误

**原因**: 前端环境变量 `VITE_API_BASE_URL` 未配置

**解决**:
1. 构建时通过 `--build-arg` 传入
2. 或修改 nginx.conf 直接代理 `/api/` 请求

## 五、服务管理

```bash
# 查看所有容器
docker ps -a

# 查看日志
docker logs nextops-api --tail 100
docker logs nextops-web --tail 100

# 重启服务
docker compose restart api
docker compose restart web

# 停止所有服务
docker compose down

# 完全重建
docker compose down -v
docker compose up --build -d
```

## 六、端口说明

| 服务 | 容器内部端口 | 主机端口 | 用途 |
|------|-------------|---------|------|
| PostgreSQL | 5432 | 5432 | 数据库 |
| Redis | 6379 | 6379 | 缓存 |
| API | 4000 | 4000 | 后端 API |
| Web | 80 | 3019 | 前端界面 |

## 七、添加智谱 AI 模型

```bash
curl -X POST http://127.0.0.1:4000/api/models \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "glm-4.5-air",
    "name": "智谱 GLM-4.5-Air",
    "provider": "Zhipu AI (智谱)",
    "endpoint": "https://open.bigmodel.cn/api/paas/v4",
    "apiKey": "YOUR_API_KEY",
    "type": "chat",
    "contextWindow": "128k",
    "costLevel": "low",
    "capabilities": ["ChatOps", "日志诊断", "修复方案生成"],
    "setDefault": true
  }'
```

## 八、注意事项

1. **端口冲突**: 部署前检查端口是否被占用
2. **数据持久化**: Docker volumes 确保数据持久化
3. **健康检查**: PostgreSQL 和 Redis 需要健康检查通过后才启动 API
4. **网络模式**: 所有容器在同一个 bridge 网络中，通过服务名互相访问
