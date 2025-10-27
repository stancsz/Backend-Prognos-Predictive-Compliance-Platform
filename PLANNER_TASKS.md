# Planner Tasks — Repository-wide Implementation Plan

Summary
- Source: root README.md
- Goal: Provide an ordered, actionable plan of coding tasks that an Actor can execute to get the backend and frontend working, validate integration, and prepare CI/push to main.

Guidelines for Actors
- Each task below includes: objective, files to modify, and expected output.
- Work sequentially. After completing each task, commit changes and run the relevant tests locally before moving on.
- Final step: push to remote `main`.

Ordered Tasks

1) Validate repository boots and tests locally
- Objective: Confirm dev environment and basic tests pass.
- Files to modify: none (read / run only)
- Expected output: `npm ci` completes, `npm --prefix packages/api run test` runs unit tests successfully. Document any environment gaps in TODO.md.

2) Standardize repo-level README and CONTRIBUTING notes
- Objective: Ensure quickstart instructions are clear and consistent with existing scripts.
- Files to modify: `README.md`, `DOCKER_COMPOSE_README.md`, `packages/api/README.md`
- Expected output: Clear instructions for `npm ci`, `./scripts/test-infra-up.sh`, `npm --prefix packages/api run test:integration:live`. No broken or missing commands.

3) Ensure API dev startup works (port 4000)
- Objective: Confirm `packages/api` can run in dev mode and listen on port 4000.
- Files to modify: `packages/api/package.json` (scripts) or `packages/api/src/index.ts` / `src/server.ts` if startup behavior needs fixes
- Expected output: `npm --prefix packages/api run dev` starts without errors and responds on `/health` and `/ready`.

4) Fix or add health & readiness endpoints tests
- Objective: Make sure `packages/api/test/health.test.ts` and `ready.test.ts` are stable and pass.
- Files to modify: `packages/api/test/*.ts`, `packages/api/src/app.ts`, `packages/api/src/server.ts`
- Expected output: Unit tests pass locally (`npm --prefix packages/api run test`).

5) Verify and improve integration test harness
- Objective: Ensure integration tests are idempotent and use migrations/scripts correctly.
- Files to modify: `packages/api/test/integration/*`, `packages/api/scripts/*`, `infra/migrations/*`, `infra/docker-compose.yml`
- Expected output: `npm --prefix packages/api run test:integration` passes against local infra or documented remote endpoints.

6) Fix live integration test flow (Postgres + MinIO)
- Objective: Ensure `./scripts/test-infra-up.sh` and `./scripts/test-infra-down.sh` reliably bring up and tear down infra for live tests.
- Files to modify: `scripts/test-infra-up.sh`, `scripts/test-infra-down.sh`, `infra/docker-compose.yml`, `packages/api/scripts/create_minio_bucket.js`
- Expected output: Running `./scripts/test-infra-up.sh` brings up services and `npm --prefix packages/api run test:integration:live` completes successfully.

7) Ensure DB migrations and schema initialization are reliable
- Objective: Make migrations idempotent and ensure tests run migrations automatically.
- Files to modify: `infra/migrations/*`, `packages/api/scripts/ensure_schema.js`, `packages/api/scripts/run_migrations*.js`
- Expected output: Test setup runs migrations and DB schema exists for tests; migrations don't fail on repeated runs.

8) Harden S3/MinIO interactions in tests
- Objective: Make S3 interactions idempotent and ensure test cleanup.
- Files to modify: `packages/api/test/*`, `packages/api/scripts/create_minio_bucket.js`, any S3 helper code
- Expected output: Tests that create S3 objects clean them up and can be re-run safely.

9) Update OpenAPI spec and API handlers mapping
- Objective: Keep `packages/api/openapi.yaml` in sync with implemented endpoints and return shapes.
- Files to modify: `packages/api/openapi.yaml`, `packages/api/src/*` (handlers and routes)
- Expected output: OpenAPI file accurately describes `/health`, `/ready`, `/uploads`, `/mappings`, `/projects/{id}/summary`, etc.

10) Add missing API endpoints required by frontend
- Objective: Implement any endpoints the frontend expects but are not present or incomplete.
- Files to modify: `packages/api/src/routes/*` or `packages/api/src/*.ts`, tests under `packages/api/test/`
- Expected output: Endpoints respond to expected request shapes and have unit+integration tests.

11) Implement integration test for frontend-backend pairing (optional demo)
- Objective: Provide a small demo script or fixture that exercises frontend against local API.
- Files to modify: `Frontend-Prognos-Predictive-Compliance-Platform/README_BACKEND_INTEGRATION.md`, `infra/demo-runner/*` or add a new script in `scripts/`
- Expected output: Script that boots local infra, starts frontend (or static build) and runs a smoke test against the API.

12) Improve CI job reliability
- Objective: Update `.github/workflows/ci.yml` to ensure integration-live job is resilient and fails fast on infra errors.
- Files to modify: `.github/workflows/ci.yml`
- Expected output: CI runs `integration-live` job, waits for readiness, runs live tests, and tears down stack.

13) Add developer convenience scripts
- Objective: Shortcuts for common developer flows (start api, start infra, run live tests).
- Files to modify: add/update `package.json` scripts at root and `packages/api/package.json`, create helper scripts in `scripts/`.
- Expected output: `npm run dev:api` or similar documented in README.

14) Add missing docs and tech-backlog entries
- Objective: Keep `packages/api/TECH_LEAD_BACKLOG.md` and `TODO.md` aligned with implementation tasks.
- Files to modify: `packages/api/TECH_LEAD_BACKLOG.md`, `TODO.md`, `REFORM_PLAN.md`
- Expected output: Updated backlog reflects remaining technical debt.

15) Finalize commit and push
- Objective: Commit all changes in small logical commits and push to `origin/main`.
- Files to modify: none (git operation)
- Expected output: Changes pushed to remote `main`. Ensure CI passes.

Task ordering notes
- Follow numeric order above. Tasks 1–4 validate local dev and unit tests and are prerequisites for integration work.
- Tasks 5–9 focus on making integration and live tests reliable.
- Tasks 10–12 implement missing API functionality and CI improvements.
- Tasks 13–15 finalize developer ergonomics and push to remote.

Checklist (progress)
- [x] Analyze requirements
- [ ] Create task list based on README
- [ ] Write planner task file (PLANNER_TASKS.md) with ordered tasks
- [ ] Commit changes
- [ ] Push to remote main
