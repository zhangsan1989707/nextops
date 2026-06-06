# NextOps API 接口文档

## 1. 基础约定

- Base URL: `/api`
- 请求与响应格式：JSON
- 鉴权：JWT Bearer Token（`Authorization: Bearer <token>`）
- Agent 鉴权：`x-agent-token` 请求头（`AGENT_TOKEN` 环境变量）
- 多租户：通过 JWT Token 解析 `tenant_id`
- 速率限制：默认 2000 req/min/IP

## 2. 健康检查

### GET /health

返回 API 服务状态。公开端点，无需认证。

## 3. 认证

### POST /api/auth/login

用户登录，返回 JWT Token。

### POST /api/auth/register

用户注册。

### GET /api/auth/me

获取当前用户信息（需 JWT 认证）。

## 4. 仪表盘

### GET /api/dashboard/summary

返回资产、告警、任务和 AI 诊断统计。

## 5. ChatOps

### POST /api/chatops/message

请求：

```json
{
  "message": "帮我巡检生产环境所有 Web 服务器",
  "useModel": true
}
```

响应：

```json
{
  "taskId": "task-xxx",
  "intent": "health_check",
  "riskLevel": "low",
  "plan": ["识别目标服务器", "采集指标", "生成巡检摘要"],
  "reply": "已生成巡检计划，等待确认执行。",
  "executionMode": "planned_only",
  "mode": "model"
}
```

### POST /api/chatops/stream

流式响应 (SSE)，支持 `event: chunk` 和 `event: done` 事件。

## 6. 服务器

### GET /api/servers

返回服务器列表。

### GET /api/servers/:id

返回服务器详情（含实时指标、硬件清单、进程、服务等）。

### POST /api/servers

新增服务器。

### PUT /api/servers/:id

更新服务器信息。

### POST /api/servers/:id/diagnose

对服务器发起 AI 诊断。

## 7. 告警

### GET /api/alerts

返回告警列表。

### POST /api/alerts

创建告警。

### PUT /api/alerts/:id

更新告警（认领、转派、关闭等）。

## 8. AI 诊断

### POST /api/diagnosis/alert/:alertId

对告警发起 AI 诊断，返回诊断报告：

```json
{
  "summary": "问题摘要",
  "evidence": ["证据1", "证据2"],
  "possibleCauses": ["原因1", "原因2"],
  "repairPlan": ["修复步骤1", "修复步骤2"],
  "warnings": ["风险提示"],
  "mode": "model"
}
```

## 9. 巡检

### GET /api/inspection/templates

获取巡检模板列表。

### POST /api/inspection/templates

创建巡检模板。

### POST /api/inspection/run

按服务器执行巡检，返回巡检报告。

## 10. 知识库

### GET /api/knowledge

获取知识文章列表（支持分类筛选）。

### POST /api/knowledge

创建知识文章。

### PUT /api/knowledge/:id

更新知识文章。

### DELETE /api/knowledge/:id

删除知识文章。

## 11. 拓扑

### GET /api/topology

返回业务系统拓扑结构数据。

## 12. 脚本

### GET /api/scripts

返回脚本列表。

### POST /api/scripts

创建脚本。

### POST /api/scripts/:id/run

执行脚本。

## 13. 快捷指令

### GET /api/slash-commands

返回可用 Slash 指令。

## 14. 模型管理

### GET /api/models

获取 AI 模型列表。

### POST /api/models

添加模型配置（支持 OpenAI 兼容接口）。

### PUT /api/models/:id

更新模型配置。

### DELETE /api/models/:id

删除模型。

## 15. 成员管理

### GET /api/members

获取成员列表。

### PUT /api/members/:id/role

更新成员角色。

### PUT /api/members/:id/toggle

启用/禁用成员。

## 16. 团队管理

### GET /api/teams

获取团队树结构（含成员列表）。

## 17. 角色管理

### GET /api/roles

获取角色列表。

### PUT /api/roles/:id/toggle

启用/禁用角色。

### PUT /api/roles/:id/permissions

切换角色权限。

## 18. 任务管理

### GET /api/tasks

获取任务记录列表。

## 19. 审批管理

### GET /api/approvals

获取审批工单列表。

### POST /api/approvals/:id/review

审批工单（通过/拒绝）。

## 20. Agent 管理（公开端点）

### POST /api/agents/register

Agent 注册（需 `x-agent-token` 请求头）。

### POST /api/agents/:agentId/metrics

Agent 指标上报（需 `x-agent-token` 请求头）。

## 21. 文件管理

### GET /api/files

获取文件列表。

### POST /api/files

上传文件。

## 22. 包管理

### GET /api/packages

获取包列表。

## 23. 租户管理

### GET /api/tenants

获取租户列表。

## 24. 审计日志

### GET /api/audit-logs

获取审计日志列表。

## 25. 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `4000` | API 服务端口 |
| `DATABASE_URL` | `postgres://nextops:nextops@localhost:5432/nextops` | PostgreSQL 连接 |
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接 |
| `JWT_SECRET` | 必填 | JWT 签名密钥 |
| `ENCRYPTION_KEY` | 必填 | 数据加密密钥 |
| `AGENT_TOKEN` | 必填 | Agent 注册认证令牌 |
| `DEEPSEEK_API_KEY` | 可选 | Deepseek API 密钥 |
| `OPENAI_API_KEY` | 可选 | OpenAI API 密钥 |
| `ALLOWED_ORIGINS` | 无 | CORS 允许的源（逗号分隔） |
| `CLEANUP_DEMO_DATA` | `false` | 启动时是否清理演示数据 |
| `SEED_DEMO_DATA` | `true` | 是否加载演示种子数据 |

