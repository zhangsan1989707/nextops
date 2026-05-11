# NextOps API 接口文档

## 1. 基础约定

- Base URL: `/api`
- 请求与响应格式：JSON
- 鉴权：V1 Demo 暂不启用，后续使用 Bearer Token
- 多租户：后续通过 Token 解析 `tenant_id`

## 2. 健康检查

### GET /health

返回 API 服务状态。

## 3. 仪表盘

### GET /api/dashboard/summary

返回资产、告警、任务和 AI 诊断统计。

## 4. ChatOps

### POST /api/chatops/message

请求：

```json
{
  "message": "帮我巡检生产环境所有 Web 服务器"
}
```

响应：

```json
{
  "intent": "health_check",
  "riskLevel": "low",
  "plan": ["识别目标服务器", "采集指标", "生成巡检摘要"],
  "reply": "已生成巡检计划，等待确认执行。"
}
```

## 5. 服务器

### GET /api/servers

返回服务器列表。

### GET /api/servers/:id

返回服务器详情。

### POST /api/servers

新增服务器。

### POST /api/servers/:id/agent/install-plan

生成 Agent 安装计划。

### POST /api/servers/:id/diagnose

发起 AI 诊断。

## 6. 告警

### GET /api/alerts

返回告警列表。

### POST /api/alerts/:id/diagnose

对告警发起 AI 诊断。

## 7. 脚本

### GET /api/scripts

返回脚本列表。

### POST /api/scripts

创建脚本。

### POST /api/scripts/:id/run

执行脚本。

## 8. 快捷指令

### GET /api/slash-commands

返回可用 Slash 指令。

## 9. 后续补充

- 登录与成员 API。
- 租户 API。
- 权限与角色 API。
- Web SSH WebSocket 协议。
- Agent 注册、心跳、指标上报 API。
- 插件动作 API。

