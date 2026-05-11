# NextOps 权限模型设计

## 1. 模型

NextOps 使用 RBAC + 租户隔离 + 资源范围控制。

权限判断维度：

- 用户属于哪个租户。
- 用户拥有哪些角色。
- 角色拥有哪些权限点。
- 用户可访问哪些团队、环境和服务器。
- 操作是否高风险，是否需要审批。

## 2. 默认角色

### Platform Admin

平台管理员，拥有全局配置、租户管理、模型管理和系统集成权限。

### Tenant Admin

租户管理员，管理本租户成员、团队、权限、资产和审批规则。

### Ops Engineer

运维工程师，可查看和操作被授权服务器，可执行脚本、处理告警和发起诊断。

### Developer

研发用户，可查看授权环境的告警、日志、指标和部署任务。

### Readonly

只读用户，仅可查看授权范围内的资源。

## 3. 关键权限点

- `dashboard:view`
- `chatops:use`
- `server:view`
- `server:create`
- `server:ssh`
- `server:agent_install`
- `server:diagnose`
- `alert:view`
- `alert:manage`
- `script:view`
- `script:create`
- `script:run`
- `command:manage`
- `tenant:manage`
- `approval:review`
- `model:manage`
- `member:manage`
- `role:manage`

## 4. 高风险操作

以下操作需要二次确认，生产环境默认进入审批：

- 执行脚本。
- 重启服务。
- 回滚发布。
- 删除文件。
- 批量操作服务器。
- 执行 AI 生成的修复方案。
- Web SSH 中执行敏感命令。

