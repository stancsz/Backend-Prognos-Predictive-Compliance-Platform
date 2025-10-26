# Prognos API (packages/api)

This folder contains the backend API for the Prognos frontend. The backend is being refactored and a minimal TypeScript scaffold has been added to accelerate integration with the frontend.

Status: WIP — scaffolded (app.ts, server.ts), Dockerfile, and basic project config.

Quickstart (local)
1. From repo root install dependencies:
   - cd packages/api
   - npm ci

2. Run in development (hot reload):
   - npm run dev
   This runs `ts-node-dev` against `src/server.ts` and starts the API on PORT (default 4000).

3. Run with Docker (uses infra/docker-compose.yml):
   - docker-compose -f infra/docker-compose.yml up --build
   Services started: postgres, minio, api, worker, demo-runner (per infra compose).

API contract
- OpenAPI placeholder: packages/api/openapi.yaml
- Important endpoints:
  - GET /health
  - GET /ready
  - POST /uploads
  - GET /frameworks
  - GET /frameworks/{id}/controls
  - POST /mappings
  - GET /projects/{id}/summary

Scaffold notes
- New entrypoint: src/server.ts -> starts the app via src/app.ts:startServer
- Persistence is pluggable:
  - If DATABASE_URL is set, Postgres is used.
  - Otherwise the code falls back to JSONL files under packages/api/data/
- S3: createS3ClientFromEnv reads AWS_ENDPOINT + credentials for MinIO usage.

Testing
- Test runner: mocha (existing) — supertest added as a dev dependency for endpoint tests
- Run tests:
  - npm test

Docker
- Local dev Dockerfile: packages/api/Dockerfile
- Infra build uses: infra/Dockerfile.api (updated to run `dist/server.js`)

Next steps (short)
- Add/restore OpenAPI spec content in packages/api/openapi.yaml
- Add basic integration test for /health (supertest)
- Decide fate of legacy `packages/api/src/index.ts` (archive or remove)
- Add CI workflow for lint, typecheck, tests

Contacts & references
- See top-level README.md and docs/ for architecture and roadmap.
