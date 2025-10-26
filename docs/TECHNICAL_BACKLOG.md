# Prioritized Technical Backlog (short)

This file captures the next high-impact technical work required to harden the ingestion pipeline, CI, tests, and observability.

1) Stabilize CI E2E (priority: high)
- Goal: Make CI reliably validate presign -> upload -> worker processing.
- Tasks:
  - Ensure GitHub Actions runs worker-health E2E and idempotency E2E.
  - Add retries/timeouts and upload structured log artifacts on failure.
- Acceptance criteria:
  - CI "e2e" job completes reliably (≥3 consecutive runs) on main.
  - On failure, API & worker logs are attached as artifacts in JSONL or plain logs.
  - No fragile docker-exec psql usage left in CI.

2) Local CI reproduction robustness (priority: high)
- Goal: Developers reproduce CI locally with parity.
- Tasks:
  - Harden `infra/ci-run-e2e.sh` and `infra/ci-run-e2e.ps1` (idempotent, clear logs).
  - Document preconditions and runtime in `infra/CI_RUN.md`.
- Acceptance criteria:
  - Scripts run on machines with Docker+Node and exit 0 on success.
  - Scripts emit concise logs and store stdout/stderr artifacts on failure.

3) Worker reliability & observability (priority: high)
- Goal: Worker is idempotent, observable, and resilient.
- Tasks:
  - Ensure DB claiming is atomic (FOR UPDATE SKIP LOCKED + status transition).
  - Add structured logs with worker_id, trace/upload_id and metrics endpoints or counters.
  - Implement exponential backoff + retry metrics for S3 downloads.
- Acceptance criteria:
  - Worker exposes /health and /ready with lastIndexedAt and counts.
  - Reprocessing the same evidence yields no duplicates; idempotency test passes.
  - Logs include worker_id and upload_id for every processing unit.

4) E2E & regression tests (priority: high → medium)
- Goal: Real integration tests (no mocks) that cover critical flows.
- Tasks:
  - Add idempotency E2E (added).
  - Add worker-health E2E to CI (added).
  - Add a CI retry-once for flaky E2E runs or isolate flaky causes.
- Acceptance criteria:
  - E2E suite validates the ingestion pipeline and runs in CI within documented timeouts.
  - Regression tests added for any bug fixes.

5) Migrations & schema management (priority: medium)
- Goal: Deterministic migrations across environments.
- Tasks:
  - Keep or replace `run_migrations.js` with a robust migration runner (e.g., node-pg-migrate).
  - Add checksum/version guard to avoid reapplying migrations incorrectly.
- Acceptance criteria:
  - Migrations run reproducibly via `npm --prefix packages/api run migrate` both locally and in CI.

6) Logging & centralized observability (priority: medium)
- Goal: Consistent JSONL logs for easier triage.
- Tasks:
  - Standardize log schema: { ts, level, service, worker_id, trace_id, msg, meta }.
  - Add CI artifact upload of JSONL logs on failures.
- Acceptance criteria:
  - CI artifacts contain JSONL logs with consistent keys and are searchable.

7) Security & credential hygiene (priority: medium)
- Goal: Avoid leaking credentials and prepare for real S3.
- Tasks:
  - Ensure MinIO creds used in tests are ephemeral and documented.
  - Move any production-like secrets to CI secrets; do not commit plaintext credentials.
- Acceptance criteria:
  - No plaintext prod secrets in repo; CI uses Actions secrets for sensitive data.

8) Release readiness & runbook (priority: low → medium)
- Goal: Safe rollout and rollback.
- Tasks:
  - Create a release checklist and rollback runbook (monitoring, metrics thresholds).
  - Define release criteria (green CI, health endpoints passing).
- Acceptance criteria:
  - Runbook present and validated; alerts for processing error rate/backlog thresholds defined.

Quick next actionable items (immediate)
- Trigger CI: push an empty commit to main to run `.github/workflows/e2e.yml`.
- Run local reproduction: `bash infra/ci-run-e2e.sh` or PowerShell `infra/ci-run-e2e.ps1`.
- Monitor CI logs/artifacts and triage failures; fix code and add regression tests where necessary.

Notes
- New files added in this cycle: `packages/api/test/worker_idempotency_e2e.js`.
- CI/workflow and PowerShell fixes were committed and pushed to main.
