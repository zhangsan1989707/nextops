# NextOps

NextOps is an AIOps and ChatOps operations platform with the product promise: "turn complex operations into one sentence."

## Local Demo

Requirements:

- Docker Desktop
- Node.js 20+
- npm 10+

Run with Docker Compose:

```bash
npm run docker:up
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
- Alert, script, tenant, approval, model, member and permission placeholders.
- Docker Compose for web, API, PostgreSQL and Redis.
