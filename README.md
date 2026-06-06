# NextOps

NextOps is an AIOps and ChatOps operations platform with the product promise: "turn complex operations into one sentence."

**Version**: v0.4.0 (Nightly) | **Tech Stack**: React 19 + Express + TypeScript + PostgreSQL + Redis

## Quick Start

Requirements:

- Docker Desktop
- Node.js 20+
- npm 10+

```bash
# 1. Clone and install
npm install

# 2. (Optional) Configure AI model key
cp .env.example .env
# Set DEEPSEEK_API_KEY in .env

# 3. Start all services
npm run docker:deploy

# 4. Open
# Web:  http://localhost:3019
# API:  http://localhost:4000/health

# 5. (Optional) Start local agent monitoring
npm run agent:local
```

## Repository Layout

```text
apps/
  api/      Express API service (23 route modules, JWT auth, rate limiting)
  web/      React/Vite SaaS console (16 pages, Feature Flag support)
  agent/    Lightweight Node.js metrics collector (zero runtime dependencies)
deploy/
  docker-compose.yml    # 4 services: web, api, postgresql 16, redis 7
docs/
  Product and engineering docs (8 documents)
scripts/
  smoke-test.sh, nightly-codex-dev.sh, install-nightly-codex-launchd.sh
```

## Current Demo Scope

- **SaaS shell** with left navigation and global layout.
- **Dashboard** with health metrics, quick action buttons, error state UI.
- **ChatOps** with natural language input, Slash command hints, history search, SSE streaming.
- **Server management** with real-time monitoring, CPU/memory trend charts (Feature Flag), health details.
- **Alert center** with batch operations (select, acknowledge, resolve), filtering.
- **Script center** with execution preview, confirmation modal, filtering.
- **Inspection center** with template management and report generation.
- **Knowledge base** with multi-category article management (incident, runbook, command, etc.).
- **Topology view** with business system visualization and node status.
- **Slash commands**, **package management**, **file management**.
- **Tenant dashboard**, **approval review**, **model management**, **member/team/role management**.
- **Model management**: local/Ollama, Deepseek, OpenAI-compatible models with API key encryption.
- **Docker Compose** for web (nginx), API, PostgreSQL 16, Redis 7 (with volumes, healthchecks, resource limits).
- **Jenkins pipeline** for install, lint, build, Docker build, local deploy and smoke test (6 stages).
- **Rate limiting** (2000 req/min per IP).
- **Feature Flag**: `VITE_ENABLE_SERVER_DETAIL_CHARTS` controls server detail chart feature.

## Data Persistence

- PostgreSQL stores servers, alerts, scripts, AI model configuration, members, teams, roles, permissions, and more.
- API startup runs 10 incremental schema migrations through the `schema_migrations` table.
- Demo seed data is inserted only when the related tables are empty.
- Model API keys are encrypted/decrypted via `crypto.ts`; never returned in API responses.
- Docker volumes (`nextops-postgres-data`, `nextops-redis-data`) ensure data persistence across container restarts.

## CI/CD

Jenkins can use the repository `Jenkinsfile` directly.

Pipeline stages:

- `Install`: `npm ci`
- `Lint`: `npm run lint`
- `Build`: `npm run build`
- `Docker Build`: `docker compose -f deploy/docker-compose.yml build`
- `Deploy Local Demo`: `npm run docker:deploy` on `main` or when `DEPLOY_LOCAL=true`
- `Smoke Test`: `npm run smoke` (verifies Agent registration, metrics, AI diagnosis, ChatOps plan/stream)

Local smoke test:

```bash
npm run smoke
```

## Local Machine Monitoring

Start the API/Web stack first:

```bash
npm run docker:deploy
```

Then run the local Agent on your Mac:

```bash
npm run agent:local
```

The Agent registers the current machine as a `local` server and reports CPU, memory,
disk, load average, processes, services, logs, network connections, and host inventory
to the API every 10 seconds (configurable via `NEXTOPS_AGENT_INTERVAL_MS`).

## Development

```bash
# Start individual services in dev mode
npm run dev -w @nextops/api    # API on port 4000
npm run dev -w @nextops/web    # Web on port 3000
npm run dev -w @nextops/agent  # Agent (local monitoring)

# Run all tests
npm run test

# Run lint (TypeScript type checking)
npm run lint

# Build all apps
npm run build
```

## Documentation

- [README.md](README.md) — Project overview and quick start
- [FEATURES.md](FEATURES.md) — Complete feature list and API reference
- [CODE_WIKI.md](CODE_WIKI.md) — Detailed code architecture and development guide
- [CHANGELOG.md](CHANGELOG.md) — Version history
- [docs/](docs/) — Product and engineering design documents
