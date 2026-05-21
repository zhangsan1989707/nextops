# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-05-22

### Added
- Dashboard quick action buttons with navigation support
- Dashboard error state UI with retry mechanism
- Server list manual refresh functionality
- Toast notifications for better UX feedback
- `.nightly` directory for automated development workflow
- `feature_ideas.md` for tracking feature inspiration

### Changed
- Refactored `loadData` in App.tsx to use `useCallback` for proper scope
- Improved loading states with refresh indicators

### Fixed
- Dashboard buttons now functional (were previously non-interactive)

---

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

[Unreleased]: https://github.com/nextops/nextops/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/nextops/nextops/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nextops/nextops/releases/tag/v0.1.0
