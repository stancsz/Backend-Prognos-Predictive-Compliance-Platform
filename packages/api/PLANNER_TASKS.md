# Planner / Task List

This file captures the Planner's actionable tasks for the API package. Each task includes: objective, files to modify, and expected output. Tasks are ordered for minimal dependency friction and to support incremental implementation and testing.

## High-level checklist
- [x] Analyze README and create project plan
- [x] Read existing PLANNER_TASKS.md
- [x] Update PLANNER_TASKS.md with concrete tasks
- [ ] Commit & push changes to remote main

---

## Tasks (ordered)

1) Setup local dev & CI sanity
- Objective: Ensure developers can build, run, and test the repo locally and that CI job runs the docker-compose stack.
- Files to modify: `README.md` (root), `packages/api/.env.example`, `.github/workflows/ci.yml`
- Expected output: Clear quickstart steps; CI workflow invokes `./scripts/test-infra-up.sh` and `npm --prefix packages/api run test:integration:live` successfully.

2) Verify backend dev server
- Objective: Confirm backend dev server runs and responds on port 4000.
- Files to modify: `packages/api/package.json` (scripts), `packages/api/src/index.ts`, `packages/api/src/app.ts`, `packages/api/src/server.ts`
- Expected output: `npm --prefix packages/api run dev` starts API on port 4000; `/health` and `/ready` return 200 and expected payloads; document curl examples in `packages/api/README.md`.

3) Harden /health and /ready
- Objective: Make health and readiness endpoints reliable and include DB and MinIO checks.
- Files to modify: `packages/api/src/app.ts`, `packages/api/src/index.ts`, `packages/api/src/server.ts`, `packages/api/test/health.test.ts`, `packages/api/test/ready.test.ts`
- Expected output: `/health` returns basic app health JSON; `/ready` performs DB + MinIO checks; tests cover healthy and failure scenarios.

4) Stabilize infra docker-compose scripts
- Objective: Ensure `infra/docker-compose.yml`, `scripts/test-infra-up.sh` and `scripts/test-infra-down.sh` reliably bring up and tear down Postgres + MinIO + API + worker for tests.
- Files to modify: `infra/docker-compose.yml`, `scripts/test-infra-up.sh`, `scripts/test-infra-down.sh`, `DOCKER_COMPOSE_README.md` or `infra/README.md`
- Expected output: Running `./scripts/test-infra-up.sh` completes with services healthy and ready; teardown script removes services; docs updated.

5) Ensure DB migrations are applied in test infra
- Objective: Ensure infra migrations are executed automatically when infra brought up or tests start.
- Files to modify: `infra/migrations/*`, `packages/api/scripts/run_migrations*.js`, `scripts/test-infra-up.sh`
- Expected output: Database schema created (matches `infra/migrations/001_create_evidence.sql`); integration tests run against migrated schema.

6) Implement uploads + MinIO bucket management
- Objective: Implement and validate `POST /uploads` endpoint with S3/MinIO compatibility and idempotent bucket creation.
- Files to modify: `packages/api/src/app.ts` (upload route), `packages/api/src/*` helper modules, `packages/api/scripts/create_minio_bucket.js`, `packages/api/test/upload_e2e.js`, `packages/api/.env.example`
- Expected output: Uploads succeed against MinIO when running docker-compose; bucket script can be invoked during infra startup; upload integration test passes and cleans S3 objects it creates.

7) Implement mappings endpoints
- Objective: Implement `/mappings` API endpoints required by frontend and tests (list, create, update if expected).
- Files to modify: `packages/api/src/app.ts` (mappings handlers), new helper modules under `packages/api/src/` if needed, `packages/api/test/integration/integration.test.ts`
- Expected output: Endpoints respond with expected JSON shape, covered by integration tests, compatible with frontend expectations.

8) Implement projects summary endpoint
- Objective: Implement `/projects/{id}/summary` endpoint to return project metadata and calculated summary used by frontend.
- Files to modify: `packages/api/src/app.ts` (handler), DB access helpers under `packages/api/src/`, possible migration changes
- Expected output: Endpoint returns documented schema (counts, metrics) and integration tests validate correctness.

9) Align OpenAPI spec
- Objective: Keep `packages/api/openapi.yaml` in sync with implemented endpoints and payload shapes.
- Files to modify: `packages/api/openapi.yaml`, `packages/api/README.md`
- Expected output: OpenAPI documents `/health`, `/ready`, `/uploads`, `/mappings`, `/projects/{id}/summary`.

10) Harden integration tests
- Objective: Make live and integration tests deterministic, idempotent, and self-cleaning.
- Files to modify: `packages/api/test/*` (integration.test.ts, upload_e2e.js, worker_* tests), `packages/api/test/helpers/live-helpers.ts`
- Expected output: `npm --prefix packages/api run test:integration:live` passes reliably on CI and locally after `./scripts/test-infra-up.sh`; tests cleanup created DB rows and S3 objects.

11) Worker health & idempotency
- Objective: Ensure worker process (`packages/worker`) runs in infra, processes jobs, is idempotent, and exposes a health check.
- Files to modify: `packages/worker/src/index.ts`, `packages/worker/package.json`, `infra/docker-compose.yml`, `packages/api/test/worker_health_e2e.js`, `packages/api/test/worker_idempotency_e2e.js`
- Expected output: Worker starts in docker-compose, responds to health checks, processes job(s) deterministically and tests pass.

12) Frontend integration smoke
- Objective: Verify frontend communicates with implemented API endpoints and UI components render expected data.
- Files to modify: `Frontend-Prognos-Predictive-Compliance-Platform/src/lib/api.ts` (adjust base URLs or payload parsing), `Frontend-Prognos-Predictive-Compliance-Platform/README_BACKEND_INTEGRATION.md`
- Expected output: Running frontend locally against local API (port 4000) shows pages that depend on `/projects/{id}/summary`, `/mappings`, uploads; minimal smoke e2e steps documented.

13) Documentation & backlog updates
- Objective: Update docs, TODOs, and PLANNER_TASKS with the implemented changes and next steps.
- Files to modify: `packages/api/PLANNER_TASKS.md`, `packages/api/README.md`, `packages/api/TECH_LEAD_BACKLOG.md`, `TODO.md`, `REFORM_PLAN.md`
- Expected output: Project documentation reflects new behavior, known limitations, and next-priority tickets.

---

## Notes for Actors
- Keep each change small and include tests where relevant.
- Update `openapi.yaml` and docs together with endpoint changes.
- Prefer idempotent infra/test operations and ensure cleanup.
- When adding migrations, place them under `infra/migrations/` and ensure test setup applies them.
- For CI pushes or infra changes, verify on a fork/feature branch before merging to `main`.
