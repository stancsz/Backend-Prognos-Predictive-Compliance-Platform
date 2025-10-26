# Technical Backlog — Prioritized (Tech Lead Deliverables)

This file lists prioritized technical debt and production-readiness tasks, each with clear acceptance criteria so work can be picked up and validated.

Priority ordering: P0 (highest) → P1 → P2

P0 — Demo / CI determinism (completed / verify)
- Task: Ensure full presign → upload → ingest → index demo runs deterministically in Docker and CI.
- Status: Implemented demo-runner, Dockerfiles, and wired CI to run demo-runner + idempotency E2E.
- Acceptance criteria:
  - `docker-compose -f infra/docker-compose.yml up --build` runs API + worker + Postgres + MinIO and demo-runner uploads sample and exits 0 within 2 minutes.
  - GitHub Actions `e2e` workflow runs demo-runner and idempotency E2E and uploads logs on failure.
  - Demonstrated 3 consecutive CI runs without transient failures.
- Notes: Verify CI artifacts and iterate on flaky tests.

P0 — Migrations & DB hygiene
- Task: Replace ad-hoc SQL apply with deterministic migrations tool; wire into CI.
- Suggested work:
  - Adopt a lightweight migrator (node-pg-migrate or simple script wrapper).
  - Ensure migrations run in CI before services start, or as part of API startup when safe.
- Acceptance criteria:
  - CI applies migrations idempotently and the evidence table schema is present before tests.
  - Local `npm run migrate --prefix packages/api` applies same changes.
  - Rollforward/rollback story documented for devs.

P0 — Worker robustness (idempotency, retries, backoff)
- Task: Harden worker behavior for network failure, S3 timeouts, and duplicate uploads.
- Suggested work:
  - Add structured retry/backoff for S3 downloads with capped retries and jitter.
  - Expand idempotency checks (ensure checksum reuse logic is safe with metadata differences).
  - Add health and readiness endpoints for the worker (metrics optional).
- Acceptance criteria:
  - Worker recovers from transient S3/Postgres errors and marks permanent failures as `index_error`.
  - Worker exposes a `/health` and `/ready` that reflect DB connectivity and last successful index time.
  - Unit/integration test validates retry path (simulate transient failure and recovery).

P1 — Observability & structured logging
- Task: Standardize logs (JSON), add minimal metrics counters and traceable request IDs.
- Acceptance criteria:
  - API and worker emit JSON log lines with ts/level/ctx.
  - Demo/CI captures logs; a simple grep script can pull correlation ids.
  - Basic Prometheus metrics endpoint on worker (optional) or counters logged.

P1 — CI gating and PR checks
- Task: Add pr-check workflow that runs lint, typecheck, unit tests, and fast smoke E2E (demo-runner or headless checks).
- Acceptance criteria:
  - `pr-check.yml` runs on PRs and blocks merging until passing.
  - PR template enforces Plan, Tests, and Acceptance Criteria fields.

P1 — Tests: integration & E2E expansion (no mocks)
- Task: Expand real-infra E2E tests:
  - Idempotency (exists)
  - Worker retry recovery
  - Upload/ingest latency bounds
- Acceptance criteria:
  - Tests run against docker-compose infra in CI.
  - Tests are deterministic and stable (less than 5% flakiness target).
  - Any flaky test is quarantined with a linked issue.

P2 — Repo hygiene & docs
- Task: Add CODEOWNERS, runbooks (ci-gates.md, worker-extract.md), and contributor onboarding.
- Acceptance criteria:
  - CODEOWNERS present and PR template enforced.
  - Runbooks provide commands to reproduce CI locally and triage steps for failures.

P2 — Security & secrets handling
- Task: Review secrets use in compose and CI, add guidance for local dev creds and CI secrets.
- Acceptance criteria:
  - No secrets checked into repo.
  - CI uses repository secrets for any cloud creds; local defaults documented.

How to pick up work
- Each task should be implemented on its own branch with:
  - A short plan in the PR description (one-line motivation + acceptance criteria).
  - Tests demonstrating the fix.
  - Small, reviewable commits and a final squash commit.

Recent completions (for context)
- Demo-runner + Dockerfiles + compose wiring — infra/demo-runner/*
- README updated with local demo instructions
- CI e2e workflow updated to run demo-runner then idempotency E2E
- Idempotency E2E test default API port aligned to compose (4000)

Task progress checklist
- [x] Analyze requirements and inspect docker-compose
- [x] Add demo-runner script and package.json
- [x] Create Dockerfile for API, worker, demo-runner
- [x] Wire services into infra/docker-compose.yml
- [x] Update README with demo instructions
- [x] Update CI e2e to run demo-runner and idempotency test
- [ ] Migrations tooling: adopt and wire into CI
- [ ] Worker: add retries/backoff and readiness endpoints
- [ ] Observability: JSON logs + basic metrics
- [ ] pr-check CI: lint/typecheck/tests gating
- [ ] Expand deterministic E2E tests and stabilize flaky tests
- [ ] Add CODEOWNERS and runbooks
- [ ] Security review & secret handling guidance
