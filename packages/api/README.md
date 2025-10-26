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

Running live integration tests (Postgres + MinIO)
Prerequisites
- Docker Desktop / Docker Engine running locally.
- Ports 4000, 5432, 9000 available on localhost.
- From repo root ensure dependencies are installed: `npm ci`

Quick local flow (recommended)
1. Bring up infra:
   - ./scripts/test-infra-up.sh
   This will docker compose up --build the stack and wait for the API and MinIO readiness endpoints.

2. Run the live integration tests:
   - npm --prefix packages/api run test:integration:live

3. Teardown infra:
   - ./scripts/test-infra-down.sh

Notes
- The CI workflow includes an `integration-live` job that runs docker-compose on ubuntu-latest and executes the same live tests. See `.github/workflows/ci.yml`.
- If your host cannot run Docker, consider running the CI job or using remote Postgres/MinIO and configuring env vars (DATABASE_URL, AWS_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET) before running `npm --prefix packages/api run test:integration:live`.
- For deterministic runs add `infra/test.env` and load it when bringing up infra; this repo provides `scripts/test-infra-up.sh` and `scripts/test-infra-down.sh` for convenience.

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
