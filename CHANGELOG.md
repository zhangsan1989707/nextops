# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **服务器详情页图表优化**: 在服务器详情模态框中添加了可交互的 CPU 和内存趋势图
- 添加 Feature Flag `VITE_ENABLE_SERVER_DETAIL_CHARTS` 控制新功能的启用/禁用

## [0.4.0] - 2026-05-28 (Nightly)

### Added
- **ChatOps history search**: Search historical conversations by content, intent, or reply
- **Script execution preview**: Show script content, target servers, and confirm before execution
- Enhanced script list with filtering support
- Script execution modal with success feedback and loading state

## [0.3.0] - 2026-05-22 (Nightly)

### Added
- **Dashboard quick action buttons**: 查看详情 and AI分析 buttons now functional with navigation
- **Dashboard error state UI**: Shows friendly error message with retry button when loading fails
- **Server list refresh**: Manual refresh button with loading animation and toast feedback
- **Alert batch operations**: Checkbox selection, select all, batch acknowledge, batch resolve
- Toast notifications for better UX feedback

### Changed
- Refactored `loadData` in App.tsx to use `useCallback` for proper scope
- Refactored alert filtering to use `useCallback` for batch operations

### Fixed
- Dashboard buttons now functional (were previously non-interactive)

## [0.2.0] - 2026-05-22

### Added
- **巡检中心 (Inspection)**: 服务器巡检模板管理与报告生成
- **知识库 (Knowledge)**: 运维知识文章管理，支持故障案例、Runbook、命令参考等分类
- **拓扑视图 (Topology)**: 业务系统拓扑图可视化
- **AI 诊断独立路由**: `/api/diagnosis` 独立诊断端点
- **Agent 认证中间件**: `agent-auth.ts` 独立 Agent 注册认证
- **速率限制中间件**: `rate-limiter.ts` IP 级别 API 限流
- **前端架构重构**: 页面从 `components/` 迁移至 `pages/` 目录结构
- **前端 API 客户端层**: 新增 `api/`、`hooks/`、`routes/`、`utils/` 目录
- **后端 Services 层**: `identity.service.ts`、`model.service.ts`、`server.service.ts`
- `.nightly` directory for automated development workflow
- Nightly Codex automation with launchd scheduling

### Changed
- Refactored `loadData` in App.tsx to use `useCallback` for proper scope
- 前端采用页面级目录组织（Dashboard、ChatOps、Servers 等独立目录）
- API 路由模块化，每个路由独立文件
- Docker Compose 增加 volumes 持久化、healthcheck 和资源限制

### Fixed
- Dashboard buttons now functional (were previously non-interactive)

## [0.1.0] - 2026-05-21

### Added
- Initial release with full AIOps/ChatOps platform
- Dashboard with health metrics and alert timeline
- Server management with real-time monitoring
- ChatOps AI assistant with natural language support
- Alert center with severity classification
- Script center with execution support
- Slash commands for quick actions
- Package and file management
- Multi-tenant dashboard
- Approval workflow system
- Model management for AI providers
- Member, team, and role management
- Audit logging
- Docker Compose deployment (web + api + postgresql + redis)
- Jenkins CI/CD pipeline
- Local Agent for machine monitoring

[Unreleased]: https://github.com/nextops/nextops/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/nextops/nextops/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/nextops/nextops/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nextops/nextops/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nextops/nextops/releases/tag/v0.1.0
