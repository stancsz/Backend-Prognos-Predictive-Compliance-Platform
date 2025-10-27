# Prognos — Backend + Frontend (monorepo)

This repository contains the Prognos frontend and its corresponding backend API. The backend API implementation that the frontend expects to talk to lives at `packages/api`. The frontend app is located at `Frontend-Prognos-Predictive-Compliance-Platform/`.

Use this README for a high-level orientation and quick commands to get the backend and its live integration tests running.

## Layout (important)
- Backend API: `packages/api/` — this is the server the frontend calls (endpoints: `/health`, `/ready`, `/uploads`, `/mappings`, `/projects/{id}/summary`, etc.)
- Frontend app: `Frontend-Prognos-Predictive-Compliance-Platform/`
- Infra & docker-compose: `infra/docker-compose.yml` — brings up Postgres, MinIO, API, worker, demo-runner
- Tests: `packages/api/test/` (unit, integration, and live integration tests)
- Local infra helpers: `scripts/test-infra-up.sh`, `scripts/test-infra-down.sh`

## Quickstart — backend (local)
1. Install dependencies:
   - To install only the API dependencies (recommended when working on the backend): `npm ci --prefix packages/api`
   - To install all workspace dependencies from the repo root:
     - If a root `package-lock.json` exists, run `npm ci`
     - Otherwise run `npm install` (this will create a lockfile for reproducible installs)

   Optionally copy the example environment file for local development:
   - cp packages/api/.env.example .env

2. Install only for API (if working inside `packages/api`):
   - npm ci --prefix packages/api

3. Run backend in development:
   - npm --prefix packages/api run dev
   - Default port: 4000

4. Build and run via Docker Compose (recommended for integration with Postgres + MinIO):
   - ./scripts/test-infra-up.sh
   - npm --prefix packages/api run test:integration:live
   - ./scripts/test-infra-down.sh

Notes:
- `scripts/test-infra-up.sh` will bring up `infra/docker-compose.yml` and wait for API + MinIO readiness.
- If Docker is not available locally, CI includes an `integration-live` job that runs the same docker-compose stack on GitHub Actions.

## Running live integration tests (Postgres + MinIO)
Prerequisites:
- Docker Desktop / Docker Engine running locally.
- Ports 4000, 5432, 9000 available on localhost.
- From repo root: `npm ci`

Local steps:
1. Bring up infra
   - ./scripts/test-infra-up.sh
2. Run live tests
   - npm --prefix packages/api run test:integration:live
3. Teardown
   - ./scripts/test-infra-down.sh

Environment variables (optional)
- You can bypass local docker by pointing the API tests at remote services via:
  - DATABASE_URL
  - AWS_ENDPOINT
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - S3_BUCKET

## CI
A GitHub Actions job `integration-live` is included in `.github/workflows/ci.yml`. It brings up the docker-compose stack, waits for readiness, runs the live tests, and tears down the stack.

## Contributing / Next steps
- If you are working on the frontend, use `packages/api` as the API server reference.
- When adding DB schema changes, prefer migrations under `infra/migrations/` and ensure test setup runs migrations.
- If you add tests that create S3 objects or DB rows, make them idempotent and clean up after themselves.

## Contact / References
- Backend code: `packages/api/src/`
- API OpenAPI spec placeholder: `packages/api/openapi.yaml`
- Tech backlog: `packages/api/TECH_LEAD_BACKLOG.md`
