# Planner Tasks — Prognos API

This file contains the actionable tasks derived from the project plan for the Prognos backend API.

## Todo checklist
- [ ] Verify local dev setup and dependencies
- [ ] Stabilize /health and /ready endpoints
- [ ] Add robust readiness checks (Postgres + MinIO)
- [ ] Ensure DB migrations are idempotent and reliable
- [ ] Implement uploads API (S3/MinIO-backed)
- [ ] Implement mappings API (CRUD + listing)
- [ ] Implement project summary endpoint
- [ ] Sync and update OpenAPI spec
- [ ] Harden tests (cleanup, idempotency, live integration)
- [ ] Improve infra scripts & docker-compose reliability
- [ ] Fix CI workflow race conditions
- [ ] Verify frontend contract & add stubs if required
- [ ] Update documentation & developer quickstart

## Tasks (detailed)

1) Verify local dev setup and dependencies
- Objective: Confirm developer commands and dependency install work reliably.
- Files to inspect/modify:
  - `README.md`
  - `packages/api/package.json`
  - `packages/api/.env.example`
- Expected output:
  - `npm ci` completes
  - `npm --prefix packages/api run dev` starts server on port 4000
  - Quickstart documentation updated if discrepancies found

2) Stabilize /health and /ready endpoints
- Objective: Ensure deterministic health/readiness endpoints and tests.
- Files to modify:
  - `packages/api/src/app.ts`
  - `packages/api/src/server.ts`
  - `packages/api/test/health.test.ts`
  - `packages/api/test/ready.test.ts`
- Expected output:
  - Unit tests pass
  - `/health` returns 200 with `{ status: "ok" }`
  - `/ready` returns object containing boolean `ready`, `db`, `s3`, `bucket`

3) Add robust readiness checks (Postgres + MinIO)
- Objective: Make `/ready` verify DB connectivity and S3 bucket availability.
- Files to modify:
  - `packages/api/src/app.ts`
  - `packages/api/src/server.ts`
  - `packages/api/scripts/ensure_schema.js`
  - `scripts/test-infra-up.sh`
  - `infra/docker-compose.yml` (if needed)
- Expected output:
  - `/ready` returns `ready: true` only when DB and S3 are reachable
  - infra bring-up scripts wait on `/ready`

4) Ensure DB migrations are idempotent and reliable
- Objective: Make migrations safe for repeated runs and CI.
- Files to modify:
  - `infra/migrations/*.sql`
  - `packages/api/scripts/run_migrations*.js`
  - `packages/api/scripts/ensure_schema.js`
- Expected output:
  - Migrations run without errors in CI and locally
  - Tests can run migrations as part of setup

5) Implement uploads API (S3/MinIO-backed)
- Objective: Provide multipart file upload flow and persist metadata.
- Files to modify/create:
  - `packages/api/src/routes/uploads*.ts` or extend `src/app.ts`
  - `packages/api/src/app.ts` (route registration)
  - `packages/api/scripts/create_minio_bucket.js`
- Expected output:
  - `/uploads` accepts filename/projectId and returns presigned URL + metadata
  - Metadata persisted in Postgres (preferred) or JSONL fallback

6) Implement mappings API
- Objective: Provide CRUD for mappings used by frontend.
- Files to modify/create:
  - `packages/api/src/routes/mappings*.ts` or extend `src/app.ts`
  - `packages/api/openapi.yaml`
- Expected output:
  - `/mappings` GET/POST implemented and documented
  - Seed/sample data available under `packages/api/data` or JSONL

7) Implement project summary endpoint
- Objective: Aggregate per-project metrics for dashboard.
- Files to modify/create:
  - `packages/api/src/routes/projects*.ts` or extend `src/app.ts`
  - `packages/api/src/services/project-summary.ts` (new)
  - Integration tests under `packages/api/test/integration`
- Expected output:
  - `/projects/{id}/summary` returns counts and metadata matching frontend expectations

8) Sync and update OpenAPI spec
- Objective: Keep `openapi.yaml` aligned with implemented endpoints.
- Files to modify:
  - `packages/api/openapi.yaml`
  - `packages/api/README.md` (examples)
- Expected output:
  - OpenAPI includes `/health`, `/ready`, `/uploads`, `/mappings`, `/projects/{id}/summary`

9) Harden tests (cleanup, idempotency, live integration)
- Objective: Make tests deterministic and clean up external resources.
- Files to modify:
  - `packages/api/test/**`
  - `packages/api/test/helpers/live-helpers.ts`
  - `packages/api/test/integration-live/**`
- Expected output:
  - Live integration tests pass locally and in CI
  - Tests remove created S3 objects and DB rows

10) Improve infra scripts & docker-compose reliability
- Objective: Make infra bring-up/teardown robust and documented.
- Files to modify:
  - `infra/docker-compose.yml`
  - `scripts/test-infra-up.sh`
  - `scripts/test-infra-down.sh`
  - `DOCKER_COMPOSE_README.md`
- Expected output:
  - Infra scripts wait on `/ready` and handle retries/teardown cleanly

11) Fix CI workflow race conditions
- Objective: Ensure `.github/workflows/ci.yml` mirrors reliable local steps.
- Files to modify:
  - `.github/workflows/ci.yml`
  - `infra/CI_RUN.md` (optional)
- Expected output:
  - `integration-live` job consistently passes

12) Verify frontend contract & add stubs if required
- Objective: Ensure backend payloads/paths match frontend expectations.
- Files to inspect/modify:
  - `Frontend-Prognos-Predictive-Compliance-Platform/src/lib/api.ts`
  - `packages/api/openapi.yaml`
- Expected output:
  - Backend and frontend agree on API contract

13) Update documentation & developer quickstart
- Objective: Consolidate docs for running, testing, and CI.
- Files to modify:
  - `README.md`, `packages/api/README.md`, `DOCKER_COMPOSE_README.md`, `packages/api/.env.example`
- Expected output:
  - Clear guide for new contributors to run and test the project

## Execution order (recommended)
1 → 2 → 3 → 4 → 5 & 6 (parallel if separate devs) → 7 → 8 → 9 → 10 → 11 → 12 → 13
