# NextOps 数据库表结构设计

## 1. 设计原则

- 所有业务数据带 `tenant_id`，支持多租户隔离。
- 关键表保留 `created_at`、`updated_at`。
- 高风险操作写入审计日志。
- 凭证类数据只保存密文或引用，不保存明文。

## 2. 核心表

### tenants

租户表。

- id
- name
- slug
- status
- created_at
- updated_at

### users

成员表。

- id
- tenant_id
- email
- name
- password_hash
- status
- created_at
- updated_at

### teams

团队结构表。

- id
- tenant_id
- parent_id
- name
- created_at
- updated_at

### roles

角色表。

- id
- tenant_id
- name
- description
- created_at
- updated_at

### permissions

权限点表。

- id
- code
- name
- category

### role_permissions

角色权限关系表。

- role_id
- permission_id

### user_roles

用户角色关系表。

- user_id
- role_id

### servers

服务器资产表。

- id
- tenant_id
- team_id
- ip
- port
- hostname
- os
- environment
- status
- agent_status
- ssh_status
- tags
- cpu_model
- cpu_cores
- memory_total_mb
- disk_total_gb
- created_at
- updated_at

### server_metrics

服务器指标快照表。

- id
- tenant_id
- server_id
- cpu_usage
- memory_usage
- disk_usage
- load_avg
- network_in
- network_out
- collected_at

### agent_instances

Agent 实例表。

- id
- tenant_id
- server_id
- version
- status
- last_heartbeat_at
- install_method
- created_at
- updated_at

### alert_rules

告警规则表。

- id
- tenant_id
- name
- scope_type
- scope_id
- metric
- operator
- threshold
- duration_seconds
- severity
- enabled
- created_at
- updated_at

### alerts

告警事件表。

- id
- tenant_id
- rule_id
- server_id
- title
- severity
- status
- triggered_at
- recovered_at
- assignee_id
- summary
- created_at
- updated_at

### scripts

脚本表。

- id
- tenant_id
- name
- type
- content
- version
- parameters
- risk_level
- created_by
- created_at
- updated_at

### slash_commands

快捷指令表。

- id
- tenant_id
- command
- name
- description
- action_type
- action_config
- enabled
- created_at
- updated_at

### operation_tasks

任务执行表。

- id
- tenant_id
- type
- status
- target_type
- target_id
- input
- output
- created_by
- started_at
- finished_at
- created_at

### ai_diagnoses

AI 诊断记录表。

- id
- tenant_id
- source_type
- source_id
- summary
- evidence
- possible_causes
- repair_plan
- risk_level
- status
- created_by
- created_at

### audit_logs

审计日志表。

- id
- tenant_id
- user_id
- action
- resource_type
- resource_id
- risk_level
- request_payload
- result
- ip_address
- created_at

## 3. 后续迁移建议

V1 Demo 先使用 mock 数据。阶段 3 引入 ORM 和迁移工具，推荐 Prisma 或 Drizzle。表结构确定后，再补充索引、唯一约束、外键和数据保留策略。

