# NextOps 项目 Code Wiki

## 1. 项目概述

NextOps 是一个 **AIOps 与 ChatOps 运维平台**，产品理念为 "将复杂运维操作化为一句话"。它是一个多租户 SaaS 运维管理系统，支持服务器纳管、AI 诊断、自动化脚本执行、审批工单、ChatOps 交互等核心场景。

| 属性 | 值 |
|------|-----|
| 项目名称 | NextOps |
| 版本 | 0.1.0 |
| 架构模式 | Monorepo（多应用架构） |
| 包管理 | npm Workspaces |
| 后端 | Express.js + PostgreSQL + TypeScript |
| 前端 | React 19 + Vite + TypeScript |
| Agent | 轻量级 Node.js 采集端 |

---

## 2. 项目目录结构

```
nextops/
├── apps/                          # 应用层（monorepo workspace）
│   ├── api/                       # 后端 Express API 服务
│   ├── web/                       # 前端 React 单页应用
│   └── agent/                     # 轻量级服务器指标采集 Agent
├── deploy/                        # 部署配置
│   └── docker-compose.yml         # Docker Compose 编排（web + api + postgresql + redis）
├── docs/                          # 产品与工程技术文档
├── scripts/                       # 运维与 CI/CD 脚本
│   ├── smoke-test.sh              # 冒烟测试
│   └── nightly-codex-dev.sh       # 夜间构建脚本
├── package.json                   # 根 package.json（管理 workspace）
├── .env.example                   # 环境变量示例
├── Jenkinsfile                    # CI/CD 流水线配置
└── README.md                      # 项目说明文档
```

---

## 3. 应用模块详细分析

### 3.1 后端 API 模块 (`apps/api`)

**包名**: `@nextops/api`
**端口**: `4000`（可配置 `PORT` 环境变量）

#### 3.1.1 技术栈

| 类别 | 技术 | 用途 |
|------|------|------|
| 框架 | Express.js | HTTP 服务与路由 |
| 运行时 | Node.js (ESM) | JavaScript 运行时 |
| 数据库 | PostgreSQL (pg 库) | 关系型数据存储 |
| 认证 | JWT (jsonwebtoken) | 令牌签发与验证 |
| 密码 | bcryptjs | 密码哈希 |
| 开发 | tsx watch | TypeScript 热重载开发 |
| 类型 | TypeScript 5.7 | 类型安全 |
| CORS | cors | 跨域请求控制 |

#### 3.1.2 目录结构

```
apps/api/src/
├── index.ts                       # 应用入口（Express 初始化、路由注册、启动）
├── db.ts                          # 数据库层（连接池、类型定义、迁移、种子数据、CRUD）
├── middleware/
│   ├── auth.ts                    # JWT 认证中间件
│   └── error.ts                   # 全局错误处理中间件
└── routes/
    ├── health.ts                  # 健康检查路由
    ├── auth.ts                    # 认证路由（登录/注册）
    ├── dashboard.ts               # 仪表盘数据路由
    ├── servers.ts                 # 服务器管理路由
    ├── agents.ts                  # Agent 注册与指标上报（含公开端点）
    ├── alerts.ts                  # 告警中心路由
    ├── scripts.ts                 # 脚本中心路由
    ├── slash-commands.ts          # Slash 命令路由
    ├── chatops.ts                 # ChatOps 路由
    ├── models.ts                  # AI 模型管理路由
    ├── members.ts                 # 成员管理路由
    ├── teams.ts                   # 团队结构路由
    ├── roles.ts                   # 角色权限路由
    ├── tasks.ts                   # 任务记录路由
    ├── approvals.ts               # 审批工单路由
    ├── files.ts                   # 文件管理路由
    ├── packages.ts                # 包管理路由
    ├── tenants.ts                 # 多租户路由
    └── audit-logs.ts              # 审计日志路由
```

#### 3.1.3 入口文件 ([index.ts](file:///Users/leohang/project/nextops/apps/api/src/index.ts))

**核心启动流程**:
1. 加载 `.env` 配置
2. 创建 Express 应用实例
3. 注册 JSON 解析中间件
4. 配置 CORS（通过 `ALLOWED_ORIGINS` 环境变量）
5. 注册路由：
   - `/health` — 健康检查（公开）
   - `/api/auth` — 认证（公开）
   - `/api/agents` — Agent 注册/指标（部分公开）
   - 其余所有 `/api/*` 路由均通过 `authMiddleware` 保护
6. 注册全局错误处理器（必须在最后）
7. 初始化数据库（迁移 + 种子数据）
8. 启动 HTTP 服务

**路由注册一览**:

| 路径前缀 | 中间件 | 功能域 |
|----------|--------|--------|
| `/health` | 无 | 健康检查 |
| `/api/auth` | 无（公开） | 登录、注册、获取用户信息 |
| `/api/agents` | 部分端点公开 | Agent 注册、指标上报 |
| `/api/dashboard` | `authMiddleware` | 仪表盘数据聚合 |
| `/api/servers` | `authMiddleware` | 服务器 CRUD |
| `/api/alerts` | `authMiddleware` | 告警列表与详情 |
| `/api/scripts` | `authMiddleware` | 脚本查询 |
| `/api/models` | `authMiddleware` | AI 模型管理（CRUD + 启停 + 设默认） |
| `/api/members` | `authMiddleware` | 成员管理（列表、角色更新、状态切换） |
| `/api/teams` | `authMiddleware` | 团队结构 |
| `/api/roles` | `authMiddleware` | 角色权限 |
| `/api/tasks` | `authMiddleware` | 任务记录 |
| `/api/approvals` | `authMiddleware` | 审批工单 |
| `/api/files` | `authMiddleware` | 文件管理 |
| `/api/packages` | `authMiddleware` | 包分发管理 |
| `/api/tenants` | `authMiddleware` | 多租户管理 |
| `/api/audit-logs` | `authMiddleware` | 审计日志 |
| `/api/slash-commands` | `authMiddleware` | Slash 命令目录 |
| `/api/chatops` | `authMiddleware` | ChatOps 交互 |

#### 3.1.4 数据库层 ([db.ts](file:///Users/leohang/project/nextops/apps/api/src/db.ts))

**连接池配置**:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://nextops:nextops@localhost:5432/nextops",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});
```

**数据库初始化流程**:
```
initializeDatabase()
  ├── runMigrations()          # 执行 schema_migrations 追踪的增量迁移
  ├── cleanupDemoData()        # 当 CLEANUP_DEMO_DATA=true 时清理演示数据
  ├── seedIdentityAccess()     # 种子数据：权限、角色、团队、成员
  ├── seedOperationalCatalogs()# 种子数据：Slash 命令
  └── seedDemoAssets()         # 种子数据：服务器、告警、脚本、AI 模型等
```

**迁移列表（共 10 个）**:

| 迁移 ID | 内容 |
|---------|------|
| `0001_core_assets` | 核心表：`servers`、`alerts`、`scripts` |
| `0002_ai_models` | AI 模型表：`ai_models`，含单一默认模型的唯一约束 |
| `0003_identity_access` | 身份表：`members`、`teams`、`roles`、`permissions` |
| `0004_approval_tickets` | 审批工单表：`approval_tickets` |
| `0005_operational_catalogs` | 运维目录：`slash_commands`、`packages`、`managed_files`、`tenants` |
| `0006_task_audit_records` | 任务与审计表：`task_records`、`audit_logs` |
| `0007_agent_metrics` | Agent 指标表：`agent_instances`、`server_inventory`、`server_metrics` |
| `0008_extended_metrics` | 扩展指标字段：top_processes、services、recent_logs 等 |
| `0009_password_auth` | 成员密码字段：`password_hash` |
| `0010_resource_type` | 服务器类型字段：`type` |

**核心数据类型**:

| 类型 | 说明 |
|------|------|
| `ServerRecord` | 服务器基础信息（IP、主机名、环境、资源使用率等） |
| `ServerInventoryRecord` | 服务器硬件清单（内核、CPU 型号/核数、内存、磁盘等） |
| `ServerMetricRecord` | 服务器性能指标（含 top_processes、services 等扩展字段） |
| `AgentRegistrationInput` | Agent 注册参数 |
| `AgentMetricInput` | Agent 指标上报参数 |
| `AiModelRecord` | AI 模型配置（支持 chat/embedding 类型） |
| `MemberRecord` | 成员信息（含密码哈希） |
| `TeamRecord` | 团队信息（支持树形层级结构） |
| `RoleRecord` | 角色定义（含权限列表） |
| `ApprovalTicketRecord` | 审批工单 |
| `TaskRecordInput` / `TaskRecord` | 任务执行记录 |
| `AuditLogInput` / `AuditLogRecord` | 审计日志 |
| `AlertRecord` | 告警记录 |
| `ScriptRecord` | 脚本定义 |
| `SlashCommandRecord` | Slash 命令 |
| `PackageRecord` | 软件包 |
| `ManagedFileRecord` | 托管文件 |
| `TenantRecord` | 租户信息 |

**核心数据库函数**:

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `initializeDatabase()` | 无 | Promise\<void\> | 运行迁移 + 种子数据初始化 |
| `runMigrations()` | 无 | Promise\<void\> | 增量执行未应用的数据迁移 |
| `getServers()` | 无 | Promise\<ServerRecord[]\> | 获取所有服务器列表 |
| `createServer()` | `ServerRecord` | Promise\<ServerRecord\> | 创建新服务器记录 |
| `updateServer()` | `id`, `Record<string, unknown>` | Promise\<ServerRecord \| null\> | 更新服务器字段 |
| `registerAgent()` | `AgentRegistrationInput` | Promise\<ServerRecord\> | Agent 注册（事务：创建服务器 + agent实例 + 硬件清单） |
| `recordAgentMetrics()` | `agentId`, `AgentMetricInput` | Promise\<ServerMetricRecord \| null\> | 记录 Agent 指标（事务：更新服务器状态 + 插入指标 + 更新硬件清单） |
| `getServerMetrics()` | `serverId`, `limit` | Promise\<ServerMetricRecord[]\> | 获取服务器历史指标 |
| `createAiModel()` | `AiModelInput` | Promise\<AiModelRecord\> | 创建 AI 模型（自动取消其他默认模型） |
| `toggleAiModel()` | `id` | Promise\<AiModelRecord \| null\> | 启用/禁用模型（自动重新分配默认模型） |
| `setDefaultAiModel()` | `id` | Promise\<AiModelRecord \| null\> | 设置为默认模型 |
| `deleteAiModel()` | `id` | Promise\<boolean\> | 删除模型（自动重新分配默认模型） |
| `getMembers()` | 无 | Promise\<MemberRecord[]\> | 获取所有成员 |
| `getMemberByEmail()` | `email` | Promise\<MemberRecord & {passwordHash} \| null\> | 根据邮箱查询（含密码哈希） |
| `toggleMember()` | `id` | Promise\<MemberRecord \| null\> | 启用/禁用成员 |
| `updateMemberRole()` | `id`, `role` | Promise\<MemberRecord \| null\> | 更新成员角色 |
| `getTeams()` | 无 | Promise\<TeamRecord[]\> | 获取团队树（含成员列表） |
| `getRoles()` | 无 | Promise\<RoleRecord[]\> | 获取角色列表 |
| `toggleRole()` | `id` | Promise\<RoleRecord \| null\> | 启用/禁用角色 |
| `toggleRolePermission()` | `id`, `permission` | Promise\<RoleRecord \| null\> | 切换角色权限 |
| `getApprovalTickets()` | 无 | Promise\<ApprovalTicketRecord[]\> | 获取审批工单列表 |
| `reviewApprovalTicket()` | `id`, `action`, `comment` | Promise\<ApprovalTicketRecord \| null\> | 审批工单（通过/拒绝） |
| `createAuditLog()` | `AuditLogInput` | Promise\<AuditLogRecord\> | 创建审计日志 |
| `getAuditLogs()` | `limit` | Promise\<AuditLogRecord[]\> | 查询审计日志 |
| `createTaskRecord()` | `TaskRecordInput` | Promise\<TaskRecord\> | 创建任务记录 |
| `getTaskRecords()` | `limit` | Promise\<TaskRecord[]\> | 查询任务记录 |

#### 3.1.5 中间件

**认证中间件** ([auth.ts](file:///Users/leohang/project/nextops/apps/api/src/middleware/auth.ts)):
- 验证请求头中的 JWT 令牌
- 检查用户权限状态
- 将用户信息附加到请求上下文

**错误处理中间件** ([error.ts](file:///Users/leohang/project/nextops/apps/api/src/middleware/error.ts)):
- 全局异常捕获
- 统一错误响应格式

#### 3.1.6 安全设计

- JWT 令牌认证保护所有业务 API
- 密码使用 bcrypt 哈希存储
- API 响应中不暴露模型 API 密钥
- CORS 需显式配置 `ALLOWED_ORIGINS`
- 审计日志记录关键操作（审计跟踪）
- 生产环境建议加密存储模型 API Key

---

### 3.2 前端 Web 模块 (`apps/web`)

**包名**: `@nextops/web`
**端口**: `3000`（开发环境）

#### 3.2.1 技术栈

| 类别 | 技术 | 用途 |
|------|------|------|
| 框架 | React 19 | UI 组件框架 |
| 构建 | Vite 6 | 前端构建工具 |
| 语言 | TypeScript 5.7 | 类型安全 |
| 图标 | lucide-react | 图标库 |
| 渲染 | ReactDOM 19 | DOM 渲染 |

#### 3.2.2 核心组件

**主应用** ([App.tsx](file:///Users/leohang/project/nextops/apps/web/src/App.tsx)):
- 应用主入口，包含完整的页面逻辑
- 左侧导航栏：仪表盘、ChatOps、服务器、告警、脚本、Slash 命令、包管理、文件管理、租户、审批、模型、成员、团队、角色
- API 集成层：
  ```typescript
  function getAuthHeaders()     // 获取认证请求头
  function postJson(url, data)  // POST 请求辅助函数
  ```
- 状态管理：使用 React `useState` 进行本地状态管理
- 模型管理页面完整实现（列表、搜索、筛选、添加、编辑、删除、启停、连接测试）

**模型组件** ([Models.tsx](file:///Users/leohang/project/nextops/apps/web/src/components/Models.tsx)):
- 模型管理独立组件
- 预定义模型模板：智谱 AI、OpenAI、DeepSeek、Ollama、本地模型等
- 支持本地/Ollama、Deepseek、OpenAI 兼容模型的添加

#### 3.2.3 前端功能域

| 功能模块 | 说明 |
|----------|------|
| 仪表盘 | 系统数据汇总与可视化 |
| ChatOps | 模拟控制面板与 Slash 命令提示 |
| 服务器列表 | 纳管服务器列表与健康详情 |
| 告警中心 | 告警列表与状态 |
| 脚本中心 | 脚本模板库 |
| Slash 命令 | ChatOps 命令参考 |
| 包管理 | 软件包版本管理 |
| 文件管理 | 托管文件列表 |
| 租户面板 | 多租户概览 |
| 审批工单 | 审批流程管理 |
| 模型管理 | AI 模型配置（支持添加/编辑/删除/启停/设默认） |
| 成员管理 | 用户列表与角色分配 |
| 团队结构 | 组织架构展示 |
| 角色权限 | RBAC 权限矩阵 |

#### 3.2.4 API 集成

前端通过 REST API 与后端通信：
- 使用 `fetch` API 进行 HTTP 请求
- 通过 `getAuthHeaders()` 附加 JWT 认证头
- 后端地址通过环境变量或默认配置指定

---

### 3.3 Agent 模块 (`apps/agent`)

**包名**: `@nextops/agent`

#### 3.3.1 技术栈

| 类别 | 技术 | 用途 |
|------|------|------|
| 运行时 | Node.js (ESM) | 轻量级运行时 |
| 开发 | tsx watch | 热重载开发 |
| 类型 | TypeScript 5.7 | 类型安全 |

#### 3.3.2 核心功能

**Agent 工作流程**:
1. **注册阶段**: 向 API 上报本机信息（主机名、IP、操作系统、硬件清单）
2. **指标采集**: 收集系统指标（CPU、内存、磁盘、负载）
3. **定时上报**: 每 10 秒向 API 发送指标数据
4. **扩展采集**: 可选采集进程列表、服务状态、系统日志、网络连接、磁盘详情

**核心数据结构** (`Inventory`):
```typescript
type Inventory = {
  kernel: string;
  cpuModel: string;
  cpuCores: number;
  memoryTotalMb: number;
  diskTotalGb: number;
  uptimeSeconds: number;
  networkCards: string[];
  bootTime: string;
};
```

**关键函数**:

| 函数 | 说明 |
|------|------|
| `main()` | Agent 主函数：注册 → 发送指标 → 设置定时任务 |
| `sendMetrics()` | 采集并上报各类系统指标 |
| `postJson()` | HTTP POST 请求，实现与 API 的通信 |

**环境变量**:

| 变量 | 说明 |
|------|------|
| `API_URL` | API 服务地址 |
| `AGENT_ID` | Agent 唯一标识 |
| `INTERVAL_MS` | 上报间隔（毫秒） |

---

## 4. 依赖关系图

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│                   (前端 Web)                     │
└─────────────────────┬───────────────────────────┘
                      │ HTTP/REST (JWT Auth)
                      ▼
┌─────────────────────────────────────────────────┐
│              Express API Server                  │
│                   (Port 4000)                    │
│  ┌────────────────────────────────────────────┐  │
│  │  Routes (17 个路由模块)                     │  │
│  │  ├── health / auth (公开)                  │  │
│  │  ├── servers / alerts / scripts ...        │  │
│  │  └── models / members / teams / roles ...  │  │
│  ├────────────────────────────────────────────┤  │
│  │  Middleware                                │  │
│  │  ├── authMiddleware (JWT 验证)             │  │
│  │  └── errorHandler (全局错误)               │  │
│  ├────────────────────────────────────────────┤  │
│  │  Database Layer (db.ts)                    │  │
│  │  ├── Migrations (10 个)                    │  │
│  │  ├── Seed Data (演示数据)                   │  │
│  │  └── CRUD Functions (40+)                  │  │
│  └────────────────────────────────────────────┘  │
└──────────────┬──────────────────┬────────────────┘
               │                  │
               ▼                  ▼
┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL     │    │      Redis       │
│   (核心数据存储)  │    │   (会话/缓存)    │
└──────────────────┘    └──────────────────┘
               ▲
               │ HTTP/REST
┌──────────────────────────────────┐
│        Agent (采集端)            │
│  ┌────────────────────────────┐  │
│  │ register → sendMetrics →   │  │
│  │ setInterval(10s)           │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## 5. 数据模型关系

```
servers (1) ──────< (N) alerts
   │
   │ (1) ──────< (N) agent_instances
   │                    │
   │                    │ (1) ──── (N) server_metrics
   │                    │
   │                    └─── (1) ──── (1) server_inventory
   │
servers (type) ── 区分 "server" 或其他资源类型

members ──(N:1)── teams (树形层级结构，通过 parent_id)
roles  ──(N:M)── permissions (通过数组字段关联)

approval_tickets ──(关联)── scripts / packages / servers (通过 related_resource)

task_records ── 记录自动化任务执行
audit_logs ── 记录系统操作审计

tenants ── 多租户隔离
ai_models ── AI 模型配置（单默认约束）
```

---

## 6. 项目运行方式

### 6.1 环境要求

| 依赖 | 最低版本 |
|------|----------|
| Docker Desktop | 任意最新版本 |
| Node.js | 20+ |
| npm | 10+ |

### 6.2 快速启动

```bash
# 1. 克隆项目后，安装依赖
npm install

# 2. 配置环境变量（可选，用于配置 AI 模型密钥）
cp .env.example .env
# 编辑 .env 设置 DEEPSEEK_API_KEY

# 3. Docker Compose 一键启动（Web + API + PostgreSQL + Redis）
npm run docker:deploy

# 4. 访问服务
# Web:    http://localhost:3019
# API:    http://localhost:4000/health

# 5. （可选）启动本地 Agent
npm run agent:local
```

### 6.3 Docker Compose 相关命令

| 命令 | 说明 |
|------|------|
| `npm run docker:up` | 构建并启动所有服务（前台） |
| `npm run docker:deploy` | 构建并以后台模式启动所有服务 |
| `npm run docker:down` | 停止并移除所有服务 |
| `npm run docker:logs` | 查看服务日志 |
| `npm run docker:restart` | 重启所有服务 |

### 6.4 开发模式

| 应用 | 启动命令 | 端口 |
|------|----------|------|
| API | `npm run dev -w @nextops/api` | 4000 |
| Web | `npm run dev -w @nextops/web` | 3000 |
| Agent | `npm run dev -w @nextops/agent` | N/A |

### 6.5 构建与测试

```bash
# 全局构建
npm run build

# 全局 Lint（TypeScript 类型检查）
npm run lint

# 全局测试
npm run test

# 冒烟测试
npm run smoke
```

### 6.6 CI/CD (Jenkins Pipeline)

**Pipeline 阶段**:

| 阶段 | 命令 | 说明 |
|------|------|------|
| Install | `npm ci` | 安装依赖 |
| Lint | `npm run lint` | TypeScript 类型检查 |
| Build | `npm run build` | 构建所有应用 |
| Docker Build | `docker compose -f deploy/docker-compose.yml build` | 构建 Docker 镜像 |
| Deploy Local | `npm run docker:deploy` | 部署到本地环境（`main` 分支或 `DEPLOY_LOCAL=true`） |
| Smoke Test | `npm run smoke` | 冒烟测试 |

---

## 7. 数据持久化

| 存储 | 内容 | 说明 |
|------|------|------|
| **PostgreSQL** | 服务器、告警、脚本、AI 模型配置、成员、团队、角色、权限、审批工单、Slash 命令、包、文件、租户、任务记录、审计日志、Agent 实例、服务器清单、服务器指标 | 核心业务数据 |
| **schema_migrations** | 迁移版本追踪 | API 启动时自动运行未应用的迁移 |
| **种子数据** | 演示用示例数据 | 仅在相关表为空时插入，可通过 `SEED_DEMO_DATA=false` 禁用 |
| **模型 API Key** | `DEEPSEEK_API_KEY` 环境变量或数据库字段 | 生产环境前必须加密存储 |

---

## 8. 权限模型 (RBAC)

### 8.1 预定义角色

| 角色 | 范围 | 核心权限 |
|------|------|----------|
| **Owner** | global | 全部管理能力（dashboard:read, server:manage, script:execute, approval:review, model:manage, member:manage, role:manage） |
| **SRE** | tenant | 巡检、告警、诊断、常规自动化（dashboard:read, server:manage, script:execute, approval:request） |
| **Reviewer** | tenant | 审批高风险操作（dashboard:read, approval:review, script:read） |
| **Developer** | team | 只读与低风险操作（dashboard:read, server:read, script:read, approval:request） |

### 8.2 权限列表

| 权限 Key | 标签 | 分组 |
|----------|------|------|
| `dashboard:read` | 查看仪表盘 | 核心业务 |
| `server:read` | 查看服务器 | 资产 |
| `server:manage` | 管理服务器 | 资产 |
| `script:read` | 查看脚本 | 自动化 |
| `script:execute` | 执行脚本 | 自动化 |
| `approval:request` | 发起审批 | 审批 |
| `approval:review` | 审核工单 | 审批 |
| `model:manage` | 管理模型 | 设置 |
| `member:manage` | 管理成员 | 设置 |
| `role:manage` | 管理角色 | 设置 |

---

## 9. 环境变量

### 9.1 API 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `4000` | API 服务端口 |
| `DATABASE_URL` | `postgres://nextops:nextops@localhost:5432/nextops` | PostgreSQL 连接字符串 |
| `ALLOWED_ORIGINS` | 无 | CORS 允许的前端地址（逗号分隔） |
| `DEEPSEEK_API_KEY` | 无 | Deepseek API 密钥 |
| `SEED_DEMO_DATA` | `true`（非 false 即启用） | 是否加载演示种子数据 |
| `CLEANUP_DEMO_DATA` | 无 | 启动时是否清理演示服务器数据 |

### 9.2 Agent 环境变量

| 变量 | 说明 |
|------|------|
| `API_URL` | API 服务地址 |
| `AGENT_ID` | Agent 唯一标识 |
| `INTERVAL_MS` | 指标上报间隔（毫秒） |

---

## 10. 本地监控

```bash
# 1. 先启动 API/Web 服务栈
npm run docker:deploy

# 2. 在本地 Mac 上启动 Agent
npm run agent:local

# Agent 会将本机注册为 "local" 服务器，每 10 秒上报：
# - CPU 使用率
# - 内存使用率
# - 磁盘使用率
# - 负载均值
# - 硬件清单信息
```

---

## 11. 当前演示范围

| 模块 | 功能状态 |
|------|----------|
| SaaS Shell | 左侧导航栏 |
| 仪表盘 | 数据汇总展示 |
| ChatOps | 模拟控制面板 + Slash 命令提示 |
| 服务器列表 | 列表 + 健康详情 |
| 告警中心 | 告警列表 |
| 脚本中心 | 脚本模板库 |
| Slash 命令 | 命令参考 |
| 包管理 | 版本管理 |
| 文件管理 | 托管文件 |
| 租户面板 | 多租户概览 |
| 审批工单 | 审批流程 |
| 模型管理 | AI 模型配置（本地/Ollama/Deepseek/OpenAI 兼容） |
| 成员管理 | 用户管理 |
| 团队结构 | 组织架构 |
| 角色权限 | RBAC 权限矩阵 |
| Docker Compose | web + api + PostgreSQL + Redis |
| Jenkins Pipeline | 安装、Lint、构建、Docker 构建、本地部署、冒烟测试 |
| Agent | 本机指标采集（Mac） |

---

## 12. 技术决策与架构特点

### 12.1 架构决策

| 决策 | 理由 |
|------|------|
| **Monorepo + Workspace** | 统一管理多个应用（api/web/agent），简化依赖管理 |
| **Express.js** | 轻量级、成熟稳定、生态丰富 |
| **PostgreSQL (原生 pg)** | 关系型数据强一致，JSONB 支持灵活扩展字段 |
| **无 ORM** | 直接使用 SQL，保持轻量和可控的数据库操作 |
| **内联迁移** | 无需额外迁移工具，代码即迁移 |
| **TypeScript** | 端到端类型安全 |
| **React 19** | 最新稳定版本，性能优化 |
| **Vite** | 快速构建，优秀的开发体验 |
| **JWT 认证** | 无状态认证，适合 API 架构 |

### 12.2 设计模式

- **Repository 模式**: `db.ts` 集中管理所有数据访问逻辑
- **Middleware 链式模式**: Express 中间件处理认证、错误
- **事务模式**: 关键操作（Agent 注册、模型默认切换）使用数据库事务
- **种子数据模式**: 演示数据仅在表为空时插入
- **迁移版本模式**: `schema_migrations` 表追踪已应用的迁移

---

## 13. 扩展开发指南

### 13.1 添加新的 API 路由

1. 在 `apps/api/src/routes/` 创建新路由文件
2. 在 `apps/api/src/index.ts` 导入并注册路由
3. 在 `apps/api/src/db.ts` 添加对应的数据类型和 CRUD 函数
4. 如需要新表，在 `migrations` 数组添加迁移

### 13.2 添加新的前端页面

1. 在 `apps/web/src/` 创建新的组件文件
2. 在 `App.tsx` 的左侧导航栏添加入口
3. 使用 `getAuthHeaders()` 和 `postJson()` 与后端 API 交互

### 13.3 扩展 Agent 采集指标

1. 在 `apps/agent/src/index.ts` 的 `sendMetrics()` 中添加新的采集逻辑
2. 在 `apps/api/src/db.ts` 的 `AgentMetricInput` 类型中添加对应字段
3. 更新数据库迁移以支持新字段

---

## 14. 已知限制与改进方向

| 限制 | 说明 |
|------|------|
| 模型 API Key 明文存储 | 生产环境前需加密 |
| 无独立的 Service 层 | 数据访问逻辑集中在 `db.ts`，复杂业务逻辑可抽取 Service |
| Agent 仅支持 Mac 本地 | 可扩展至 Linux/Windows |
| 无前端路由系统 | 当前为单页应用，可引入 react-router |
| 无前端状态管理库 | 使用 React 原生状态管理，复杂场景建议引入 Zustand/Redux |
| 密码哈希使用固定盐值 | 生产环境应使用独立盐值 |
| Agent 注册端点公开 | 生产环境需要加入注册认证机制 |
