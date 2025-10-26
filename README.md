# Compliance Legal Tech SaaS — Developer README

Overview
This repository implements a minimal ingestion pipeline for evidence files:
- API (presign endpoint) generates S3 PUT presigned URLs and persists metadata to Postgres.
- MinIO is used as the S3-compatible dev storage for local runs and CI.
- Worker polls Postgres for uploaded items, downloads from S3, computes a sha256 checksum, extracts text (pdf-parse fallback to UTF-8), and updates the evidence row.
- E2E test verifies presign -> upload -> DB persist -> worker indexing.

Quick repo layout
- infra/
  - docker-compose.yml — Postgres + MinIO dev stack
  - migrations/001_create_evidence.sql — evidence table schema
  - ci-run-e2e.sh — local script to reproduce CI (starts infra, runs migration, starts API & worker, runs E2E)
- packages/api
  - src/index.ts — API server (POST /uploads => presign, persist metadata)
  - test/upload_e2e.js — E2E script used by CI
  - scripts/create_minio_bucket.js — idempotent helper to create MinIO bucket
- packages/worker
  - src/index.ts — worker that downloads objects, computes checksum, extracts text, updates DB
- .github/workflows/e2e.yml — GitHub Actions workflow that runs ephemeral infra and executes the E2E

Local quickstart (Linux / macOS)
1) Start dev infra:
```bash
docker-compose -f infra/docker-compose.yml up -d --build
```

2) Apply DB migration (optional: infra script will do this in CI reproduction):
```bash
POSTGRES_CONTAINER=$(docker ps --filter "ancestor=postgres:15-alpine" --format "{{.Names}}" | head -n1)
docker exec -i "$POSTGRES_CONTAINER" sh -c 'psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres}' < infra/migrations/001_create_evidence.sql
```

3) Install dependencies:
```bash
npm install --prefix packages/api
npm install --prefix packages/worker
```

4) Ensure MinIO bucket (idempotent):
```bash
node packages/api/scripts/create_minio_bucket.js
```

5) Start worker and API (background):
```bash
npm --prefix packages/worker run dev &> /tmp/worker.log &
npm --prefix packages/api run dev &> /tmp/api.log &
```

6) Run the E2E test (presign -> PUT -> verify DB row):
```bash
node packages/api/test/upload_e2e.js
```

Local CI reproduction (recommended)
A helper script exists to reproduce the CI run locally and validate the full path:
```bash
bash infra/ci-run-e2e.sh
```
What the script does:
- Starts infra via docker-compose
- Waits for Postgres and MinIO
- Installs package dependencies
- Ensures MinIO bucket exists
- Applies DB migration
- Starts API and worker (logs to /tmp)
- Runs `packages/api/test/upload_e2e.js`
- Dumps logs and exits non-zero on failure
- Tears down infra on completion

GitHub Actions CI
- Workflow: .github/workflows/e2e.yml
- Triggers: push to main and pull requests
- Behavior: spins up ephemeral Postgres + MinIO, applies migration, starts API & worker, runs E2E test, captures logs on failure, and tears down infra.

Verify commits pushed
```powershell
git log --oneline -n 5
git show 8886953:infra/ci-run-e2e.sh
git show 32a9c09:.github/workflows/e2e.yml
```

Next recommended priorities
- Update and enforce migrations tooling (node-pg-migrate or similar) and wire it into CI
- Add integration tests validating worker idempotency and failure/retry behavior
- Harden API & worker: idempotency keys, retries with backoff, structured logs, health/readiness endpoints
- Implement a simple frontend upload UI (presign + PUT + progress + evidence list) and add UI E2E tests
- Add CI observability (artifacts, test results) and flaky-test mitigation (retries/waits)

Contact / notes
- For AI-driven testing / assistants, the user prefers `vscode-lm:copilot/gpt5-mini`.
- All CI artifacts and scripts are intentionally real (no mocks) to validate production-like behavior.
