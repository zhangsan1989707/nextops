# NextOps

NextOps is an AIOps and ChatOps operations platform with the product promise: "turn complex operations into one sentence."

## Local Demo

Requirements:

- Docker Desktop
- Node.js 20+
- npm 10+

Optional model secret:

```bash
cp .env.example .env
# set DEEPSEEK_API_KEY in .env
```

Run with Docker Compose:

```bash
npm run docker:deploy
```

Open:

- Web: http://localhost:3019
- API health: http://localhost:4000/health

## Repository Layout

```text
apps/
  api/      Express API demo service
  web/      React/Vite SaaS console demo
deploy/
  docker-compose.yml
docs/
  Product and engineering docs
```

## Current Demo Scope

- SaaS shell with left navigation.
- Dashboard.
- ChatOps mock control panel with Slash command hints.
- Server list and server health detail.
- Alert center, script center, slash commands, package management and file management.
- Tenant dashboard, approval review, model management, member management, team structure and role permissions.
- Model management supports adding local/Ollama, Deepseek and OpenAI-compatible models. Deepseek `deepseek-v4-flash` is the default demo model when configured.
- Docker Compose for web, API, PostgreSQL and Redis.
- Jenkins pipeline for install, lint, build, Docker build, local deploy and smoke test.

## Data Persistence

- PostgreSQL stores servers, alerts, scripts and AI model configuration.
- API startup runs lightweight schema migrations through the `schema_migrations` table.
- Demo seed data is inserted only when the related tables are empty.
- Model API keys are never returned by API responses. Deepseek uses `DEEPSEEK_API_KEY` from `.env`; user-added model keys are persisted for the local demo and should be encrypted before production use.

## CI/CD

Jenkins can use the repository `Jenkinsfile` directly.

Pipeline stages:

- `Install`: `npm ci`
- `Lint`: `npm run lint`
- `Build`: `npm run build`
- `Docker Build`: `docker compose -f deploy/docker-compose.yml build`
- `Deploy Local Demo`: `npm run docker:deploy` on `main` or when `DEPLOY_LOCAL=true`
- `Smoke Test`: `npm run smoke`

Local smoke test:

```bash
npm run smoke
```
