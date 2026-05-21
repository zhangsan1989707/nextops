# NextOps 功能清单

## 项目概述

- **项目名称**: NextOps
- **产品类型**: AIOps / ChatOps 智能运维平台
- **产品标语**: 当复杂操作变成一句话
- **技术栈**: 
  - 后端: Node.js + Express + TypeScript
  - 前端: React + Vite + TypeScript
  - 数据库: PostgreSQL + Redis
  - 部署: Docker Compose
  - CI/CD: Jenkins

## 功能模块总览

### 1. 仪表盘 (Dashboard)
**路由**: `/`
**API**: `/api/dashboard/summary`

#### 功能点
- 展示服务器总数、在线数、异常数、未纳管数
- 展示CPU、内存、磁盘、网络总体健康度
- 展示当前告警数量，按严重级别分类
- 展示近24小时告警趋势、故障趋势和恢复趋势
- 展示最近执行的部署、巡检、脚本和AI诊断任务
- 展示高风险服务器、性能异常服务和待处理工单
- 支持按租户、团队、环境、标签、时间范围筛选
- 支持指标趋势图展示

#### 数据指标
- 平台资产健康度
- 告警收敛率
- 平均故障响应时间
- 平均故障恢复时间
- AI诊断采纳率

### 2. ChatOps AI助手
**路由**: `/chatops`
**API**: `/api/chatops/message`, `/api/chatops/stream`

#### 功能点
- 支持自然语言输入
- 支持Slash指令识别（以`/`开头）
- 支持上下文追问
- 支持部署、巡检、排障、日志查询、指标查询、服务器连接、脚本执行
- 支持AI返回执行计划
- 支持用户确认、取消、修改参数
- 支持实时任务日志输出（流式响应）
- 支持执行结果结构化展示
- 支持将诊断结果生成工单、脚本或知识库条目
- 支持历史会话检索
- 支持按租户和权限隔离会话数据
- 流式响应（SSE）

#### 示例输入
- "帮我巡检生产环境所有Web服务器"
- "查看10.0.1.21最近30分钟的CPU和nginx错误日志"
- "帮我分析这次数据库连接数飙升的原因"
- `/ssh 10.0.1.21 --port 22`
- `/deploy order-service --env prod --version 1.8.2`
- `/check prod-web --items cpu,memory,disk`

### 3. 告警中心
**路由**: `/alerts`
**API**: `/api/alerts`, `/api/alerts/:id`

#### 功能点
- 展示告警列表，支持严重级别、状态、来源、租户、服务器、时间筛选
- 告警状态包括：待处理、处理中、已恢复、已忽略、已关闭
- 支持告警详情页，展示触发规则、指标曲线、日志片段、影响资产和历史相似事件
- 支持AI一键诊断
- 支持告警认领、转派、备注、升级和关闭
- 支持告警规则新建、编辑、启用、禁用和克隆
- 支持通知策略配置，包括邮件、Webhook、企业IM和工单
- 支持告警静默、抑制、聚合和去重

### 4. 服务器管理
**路由**: `/servers`
**API**: `/api/servers`, `/api/servers/:id`, `/api/servers/:id/processes`, `/api/servers/:id/services`, `/api/servers/:id/logs`

#### 功能点
- 服务器列表展示IP、主机名、系统类型、环境、租户、状态、Agent状态、CPU、内存、磁盘使用率
- 支持按标签、环境、租户、状态、系统类型筛选
- 支持新增服务器（IP、端口、主机名、环境、标签）
- 支持输入IP和端口进行Web SSH连接
- 支持Agent一键部署
- 支持批量部署Agent
- 支持服务器详情页
- 支持查看CPU、内存、磁盘、网络、进程、端口、负载、文件系统
- 支持实时监控和性能图
- 支持查看系统详细配置（OS、内核、CPU型号、内存容量、磁盘分区、网卡、启动时间）
- 支持绑定专属告警规则
- 支持基础操作：重启服务、执行脚本、文件上传下载、查看日志、发起AI诊断

#### 服务器详情数据
- 主机信息（内核版本、CPU型号、CPU核心数、内存总量、磁盘总量）
- 运行时长
- 网卡信息
- 实时指标（CPU、内存使用率趋势）
- 进程列表
- 服务列表
- 最近日志
- 网络连接
- 磁盘详情

### 5. 脚本中心
**路由**: `/scripts`
**API**: `/api/scripts`, `/api/scripts/:id`, `/api/scripts/:id/run`

#### 功能点
- 支持脚本创建、编辑、复制、删除
- 支持Shell、Python、Ansible、SQL、Kubernetes YAML等类型
- 支持脚本版本管理
- 支持参数模板
- 支持执行目标选择
- 支持执行前风险提示
- 支持脚本审批
- 支持执行日志查看
- 支持脚本收藏、标签、分类和搜索
- 支持AI辅助生成脚本
- 支持AI解释脚本风险
- 支持运行脚本并创建任务记录

### 6. 命令中心
**路由**: `/commands`
**API**: `/api/slash-commands`

#### 功能点
- 支持新增、编辑、删除快捷指令
- 支持绑定脚本、插件动作、API、部署任务或诊断模板
- 支持参数配置
- 支持权限控制
- 支持指令启用、禁用
- 支持使用次数和成功率统计
- 支持在ChatOps中通过`/`唤起

#### 默认指令
- `/ssh` - SSH连接
- `/deploy` - 部署服务
- `/check` - 健康检查
- `/logs` - 日志查询
- `/metrics` - 指标查询
- `/restart` - 服务重启
- `/rollback` - 回滚
- `/alert` - 告警处理
- `/diagnose` - AI诊断

### 7. 包管理
**路由**: `/packages`
**API**: `/api/packages`

#### 功能点
- 支持包上传、下载、删除
- 支持版本管理
- 支持包类型分类
- 支持包元数据维护
- 支持与部署任务关联
- 支持权限控制
- 支持校验文件哈希
- 支持包使用记录

### 8. 文件管理
**路由**: `/files`
**API**: `/api/files`

#### 功能点
- 支持文件上传、下载、删除
- 支持文件目录管理
- 支持服务器文件浏览
- 支持文件分发到指定服务器
- 支持从服务器拉取文件
- 支持日志文件查看
- 支持文件操作审计

### 9. 租户管理
**路由**: `/tenants`
**API**: `/api/tenants`

#### 功能点
- 展示租户数量、资产数量、告警数量、任务数量
- 展示各租户资源健康度
- 展示各租户告警趋势
- 展示各租户AI使用量
- 支持租户启用、禁用和资源限制
- 支持租户级数据隔离

### 10. 审批中心
**路由**: `/approvals`
**API**: `/api/approvals`

#### 功能点
- 支持自动生成工单
- 支持用户手动提交工单
- 支持审批流配置
- 支持审批、驳回、转交、加签
- 支持关联ChatOps会话、脚本、服务器、告警和诊断报告
- 支持审批后自动执行
- 支持审批超时提醒
- 支持工单审计

### 11. 模型配置
**路由**: `/models`
**API**: `/api/models`

#### 功能点
- 支持配置模型供应商（OpenAI兼容）
- 支持配置API Key、Endpoint、模型名称和上下文长度
- 支持多模型路由
- 支持按场景选择模型（对话、诊断、脚本生成、日志摘要）
- 支持模型调用日志
- 支持成本统计
- 支持敏感信息脱敏策略
- 支持模型可用性检测
- 支持添加本地/Ollama、Deepseek和OpenAI兼容模型

### 12. 成员管理
**路由**: `/members`
**API**: `/api/members`

#### 功能点
- 支持成员邀请
- 支持成员启用、禁用
- 支持成员搜索和筛选
- 支持绑定团队和角色
- 支持查看成员操作记录
- 支持单点登录扩展

### 13. 团队管理
**路由**: `/teams`
**API**: `/api/teams`

#### 功能点
- 支持团队创建、编辑、删除
- 支持团队层级结构
- 支持团队成员管理
- 支持团队与租户、环境、服务器资源绑定
- 支持团队级权限继承

### 14. 角色管理
**路由**: `/roles`
**API**: `/api/roles`

#### 功能点
- 支持角色创建、编辑、删除
- 支持菜单权限、数据权限、操作权限
- 支持服务器级权限
- 支持脚本执行权限
- 支持SSH连接权限
- 支持告警处理权限
- 支持审批权限
- 支持最小权限原则
- 支持操作审计

## 平台管理功能

### 任务管理
**API**: `/api/tasks`

#### 功能点
- 任务记录创建和查询
- 支持多种任务类型（chatops_*、script_run等）
- 任务状态管理：planned、waiting_approval、running、completed、failed
- 风险等级标记
- 审批状态跟踪
- 关联资源（目标服务器、脚本等）

### Agent管理
**API**: `/api/agents`

#### 功能点
- Agent注册（公开端点）
- Agent指标上报
- 支持一键部署Agent
- 支持Agent安装脚本生成
- 支持Agent状态检测
- 支持Agent升级、卸载和重启
- 支持采集CPU、内存、磁盘、网络、进程、端口、系统配置
- 支持采集指定日志文件
- 支持执行平台下发的脚本任务
- 支持Agent与平台通信加密
- 支持离线告警
- 支持本地机器监控

### 审计日志
**API**: `/api/audit-logs`

#### 功能点
- 操作审计记录
- 记录操作类型、参与者、资源类型、资源ID、摘要、详情
- 支持按时间、操作类型、资源类型筛选

### 身份服务
**API**: `/api/auth`

#### 功能点
- 用户认证
- Token管理
- 会话管理

## AI能力

### AI诊断
**核心文件**: `apps/api/src/ai.ts`

#### 功能点
- 基于日志、指标、告警、部署记录和资产信息进行智能诊断
- 支持用户主动发起诊断
- 支持告警触发自动诊断
- 支持关联日志、指标、部署记录、脚本执行记录、工单和历史事件
- 支持性能趋势识别
- 支持异常模式识别
- 支持影响范围分析
- 支持生成可能原因列表
- 支持给出证据链
- 支持生成可执行修复方案
- 支持将修复方案转换为脚本草稿
- 支持人工确认后执行修复
- 支持诊断报告导出
- 支持本地模型和远程模型
- 支持流式响应

#### 诊断报告字段
- 问题摘要（summary）
- 影响范围
- 异常时间线
- 关键指标变化
- 关键日志证据（evidence）
- 可能原因（possibleCauses）
- 推荐修复方案（repairPlan）
- 风险提示（warnings）
- 后续观察指标

### 模型服务
**核心文件**: `apps/api/src/services/model.service.ts`

#### 功能点
- 模型配置管理
- 模型API密钥管理（支持环境变量引用）
- 模型连通性检测
- 支持OpenAI兼容接口
- 支持本地模型（localhost/127.0.0.1）
- 超时控制

## 中间件与基础设施

### 认证中间件
- JWT Token验证
- Agent认证（独立认证流程）
- 多租户数据隔离

### 限流中间件
- 基于IP的请求限流
- 可配置限流规则

### 错误处理
- 统一错误响应格式
- 错误日志记录

### 数据库
- PostgreSQL存储
- 轻量级Schema迁移
- 演示数据自动填充

## 前端组件

### 公共组件
- CommandPalette - 命令面板
- ServerHealth - 服务器健康状态
- Toast - 通知提示
- ErrorBoundary - 错误边界
- HealthRing - 健康度环形图
- LineChart - 折线图
- Sparkline - 微线图
- Skeleton - 加载骨架屏
- CopilotDrawer - AI助手抽屉

### 布局组件
- Layout - 主布局（侧边栏、顶栏、内容区）

### 页面组件
- Dashboard
- ChatOps
- Alerts
- Servers
- Scripts
- Commands
- Packages
- Files
- Tenants
- Approvals
- Models
- Members
- Teams
- Roles

### WebSocket支持
- 实时消息推送
- 任务状态更新

## 部署与运维

### Docker部署
- Web服务容器化
- API服务容器化
- PostgreSQL数据存储
- Redis缓存
- docker-compose编排

### CI/CD
- Jenkins流水线
- 阶段：Install、Lint、Build、Docker Build、Deploy Local Demo、Smoke Test

### 环境变量
- 数据库配置
- Redis配置
- AI模型API Key
- 允许的跨域来源
- 限流配置
- 端口配置

## 安全特性

- RBAC权限控制
- 多租户数据隔离
- API调用鉴权
- Agent通信加密
- 敏感信息脱敏（密码、Token、密钥、连接串）
- 操作审计日志
- 高危命令拦截
- 会话超时管理
- 审批流控制
- 服务器凭证加密存储

## 性能指标

- 仪表盘首屏加载时间不超过3秒
- 服务器列表支持万级资产分页和筛选
- ChatOps消息响应首token不超过5秒
- 实时监控刷新间隔可配置，默认5秒
- Web SSH输入延迟保持在可交互范围内

## API路由汇总

| 模块 | 路由 | 方法 | 描述 |
|------|------|------|------|
| Health | `/health` | GET | 健康检查 |
| Auth | `/api/auth/*` | * | 认证相关 |
| Dashboard | `/api/dashboard/summary` | GET | 仪表盘汇总数据 |
| Servers | `/api/servers` | GET, POST | 服务器列表、新增 |
| Servers | `/api/servers/:id` | GET, PUT | 服务器详情、更新 |
| Servers | `/api/servers/:id/processes` | GET | 进程列表 |
| Servers | `/api/servers/:id/services` | GET | 服务列表 |
| Servers | `/api/servers/:id/logs` | GET | 日志内容 |
| Agents | `/api/agents/*` | * | Agent管理（部分公开） |
| Alerts | `/api/alerts` | GET | 告警列表 |
| Alerts | `/api/alerts/:id` | GET | 告警详情 |
| Scripts | `/api/scripts` | GET | 脚本列表 |
| Scripts | `/api/scripts/:id` | GET | 脚本详情 |
| Scripts | `/api/scripts/:id/run` | POST | 运行脚本 |
| Slash-Commands | `/api/slash-commands` | * | Slash指令管理 |
| ChatOps | `/api/chatops/message` | POST | ChatOps消息 |
| ChatOps | `/api/chatops/stream` | POST | ChatOps流式响应 |
| Models | `/api/models` | * | 模型配置 |
| Members | `/api/members` | * | 成员管理 |
| Teams | `/api/teams` | * | 团队管理 |
| Roles | `/api/roles` | * | 角色管理 |
| Tasks | `/api/tasks` | * | 任务管理 |
| Approvals | `/api/approvals` | * | 审批管理 |
| Files | `/api/files` | * | 文件管理 |
| Packages | `/api/packages` | * | 包管理 |
| Tenants | `/api/tenants` | * | 租户管理 |
| Audit-Logs | `/api/audit-logs` | * | 审计日志 |

## 数据库表结构

核心数据表：
- servers - 服务器
- alerts - 告警
- scripts - 脚本
- slash_commands - Slash指令
- tasks - 任务记录
- models - AI模型配置
- members - 成员
- teams - 团队
- roles - 角色
- tenants - 租户
- packages - 包
- files - 文件
- approvals - 审批
- audit_logs - 审计日志
- server_inventory - 服务器资产信息
- server_metrics - 服务器指标
- extended_metrics - 扩展指标（进程、服务等）

## 技术债务与未来规划

### 已实现但需增强
- ChatOps执行器尚未完全接入
- Web SSH需要进一步完善
- 插件中心暂未实现
- 包管理和文件管理功能待完善

### 待实现功能
- 复杂跨云成本优化
- 自研完整CI/CD引擎
- 移动端原生App
- 高级AI诊断能力（完全自动化）

---

*文档生成时间: 2026-05-21*
*项目版本: V1.0*
