# Technical Backlog & Acceptance Criteria — API (Tech Lead Deliverables)

This document lists prioritized technical debt, remediation tasks, and clear acceptance criteria so the repo reaches a locally-testable, production-ready baseline.

## 1 — CI: Run full integration suite (high)
- Problem: CI currently runs unit/build; integration (Postgres+MinIO) not executed.
- Tasks:
  - Add a job that spins up infra (docker compose), waits for readiness, exports DATABASE_URL/AWS_* into job env, runs `npm run test:integration:live`, tears down infra.
  - Add sensible timeouts and retries in CI.
- Acceptance criteria:
  - CI workflow runs successfully on PRs and main with integration job green.
  - Tests run deterministically < 10 minutes in CI environment.
- Notes: Use existing `infra/docker-compose.yml`.

## 2 — Deterministic infra for tests (high)
- Problem: Local dev and CI must share deterministic infra setup.
- Tasks:
  - Create `infra/test.env` with dev creds used by tests.
  - Add `scripts/test-infra-up.sh` and `scripts/test-infra-down.sh` for consistent bring-up/teardown.
  - Ensure healthchecks used by docker-compose are reliable.
- Acceptance criteria:
  - `scripts/test-infra-up.sh` returns 0 only when Postgres and MinIO are healthy.
  - `scripts/test-infra-down.sh` removes containers and volumes used during tests.

## 3 — DB migrations & schema management (high)
- Problem: App creates tables inline; migrations are missing/implicit.
- Tasks:
  - Adopt a migration tool (node-pg-migrate, knex, or simple SQL runner already present) and move CREATE TABLE statements into migrations.
  - Ensure tests run migrations before executing.
- Acceptance criteria:
  - Migrations applied by `npm run migrate-local` produce the expected schema.
  - Tests run migrations automatically in CI and local live tests.

## 4 — Test hygiene & fixtures (high)
- Problem: Live tests currently do best-effort cleanup.
- Tasks:
  - Implement test fixtures that create unique test schemas or clear tables reliably between tests.
  - Add helpers to create/delete S3 objects used by tests.
- Acceptance criteria:
  - Tests are idempotent when re-run; no leftover rows or S3 objects interfere with subsequent runs.

## 5 — Observability & structured logs (medium)
- Problem: Logs are console-based and not structured.
- Tasks:
  - Add structured logging (pino/winston) with JSON output and correlation IDs for requests.
  - Expose a /metrics endpoint (Prometheus exposition) for basic request counts/errors.
- Acceptance criteria:
  - Logs include request id, level, timestamp, and component; `/metrics` reports request_count and error_count.

## 6 — Secrets & local dev safety (medium)
- Problem: Dev creds are in docker-compose; refine handling.
- Tasks:
  - Move secrets to `.env` (excluded from VCS) and document `.env.example`.
  - Ensure CI uses encrypted secrets / actions secrets.
- Acceptance criteria:
  - No plaintext production secrets in repo; `.env.example` contains placeholders.

## 7 — Security hygiene (medium)
- Problem: App permits permissive dev auth and lacks rate-limits.
- Tasks:
  - Keep dev middleware behind env flag.
  - Add basic input validation and size limits for uploads.
  - Add dependency scanning (GitHub Actions) step.
- Acceptance criteria:
  - Dev auth disabled unless NODE_ENV=development.
  - CI runs dependency scan and reports findings.

## 8 — Code quality & pre-commit checks (low)
- Problem: Lint and formatting not enforced pre-commit.
- Tasks:
  - Add Husky pre-commit to run `npm run lint` and `npm run test:fast` (unit).
  - Add editorconfig and format step (prettier).
- Acceptance criteria:
  - Commits blocked locally when lint fails.

## 9 — OpenAPI & contract tests (low)
- Problem: OpenAPI present but no contract tests.
- Tasks:
  - Add basic contract tests verifying responses conform to the OpenAPI spec (e.g. using openapi-backend or a lightweight validator).
- Acceptance criteria:
  - Contract tests pass in CI.

## 10 — Documentation & onboarding (low)
- Problem: README needs clear dev run steps and testing commands.
- Tasks:
  - Document: dev startup, `npm run test`, `npm run test:integration`, `npm run test:integration:live`, and infra up/down scripts.
- Acceptance criteria:
  - New dev can run full test suite with documented steps.

---

## Immediate action items (next sprint — actionable)
- [ ] Add CI job to run `test:integration:live` using `infra/docker-compose.yml`.
- [ ] Implement `scripts/test-infra-up.sh` and `scripts/test-infra-down.sh`.
- [ ] Move inline schema creation into SQL migrations and run migrations at test startup.
- [ ] Harden tests with fixtures and deterministic teardown.
- [ ] Add structured logging and `/metrics`.
- [ ] Add `.env.example` and update docker-compose to read env file.
- [ ] Add pre-commit hooks to enforce lint/tests.

## Quick wins (can be completed this session)
- [x] Add JSONL integration tests (done)
- [x] Add live integration tests scaffolding and `test:integration:live` script (done)
- [x] Add test helpers for Postgres/MinIO (done)

---

If you want, I will:
- Bring up infra and run the live integration suite now; attempt fixes for any failures and push commits. (Requires approval to run docker-compose and push.)
- Or I can open a PR template and create issues for each backlog item with acceptance criteria.
