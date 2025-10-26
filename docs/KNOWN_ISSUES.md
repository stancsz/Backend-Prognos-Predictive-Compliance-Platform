# Known Issues — MVP (Top 3)

This file records the top known functional bugs and technical shortcuts to discuss and triage before tagging the MVP release.

1) Flaky E2E in CI
- Symptom: End-to-end CI workflow (.github/workflows/e2e.yml) occasionally fails due to timing, infra startup, or demo-runner timeouts.
- Reproduction: Run CI E2E or `infra/ci-run-e2e.sh` repeatedly; failures typically surface as demo-runner timing out waiting for evidence to reach `status = indexed`.
- Impact: Blocks deterministic CI acceptance criteria and release gating.
- Mitigation / Next steps:
  - Harden `infra/ci-run-e2e.sh` and demo-runner timeouts; add retries/backoff for demo-runner polling.
  - Capture and upload logs/artifacts on failure (API, worker, demo-runner).
  - Add flaky-test mitigation steps to `infra/CI_RUN.md`.
  - Owner: CI / QA.

2) Structured logging/observability not verified
- Symptom: README and roadmap call for structured logs and metrics, but current services lack verified JSON logs and example log excerpts in docs.
- Reproduction: Start services (docker-compose) and inspect API/worker logs for structured fields (trace, request_id, level).
- Impact: Makes debugging, monitoring, and automated log analysis harder during CI incidents.
- Mitigation / Next steps:
  - Audit API and worker logging implementations; add structured JSON logging if missing.
  - Add sample log excerpts and a small "Log collection" section to infra/CI_RUN.md.
  - Add basic health and readiness endpoints verification in CI.
  - Owner: Backend / Observability.

3) No documented release tag / branch for MVP
- Symptom: No explicit release tag or documented branch policy exists for the MVP cut.
- Reproduction: Check git tags/branches for an `mvp` or `release` tag/branch.
- Impact: Harder to identify the exact commit used for demos and stakeholder reviews; releases may drift.
- Mitigation / Next steps:
  - Create a release branch (e.g., `release/mvp-v1`) or tag the current commit when checklist is complete.
  - Add a short "Tagging & release" section to this repo's release runbook with commands and required checklist items.
  - Owner: Tech Lead / Release Manager.

Additional notes
- Priority: P0 = Flaky E2E, P1 = Logging verification, P2 = Tagging/Release.
- For each issue, create a tracked GitHub Issue (link here once created) and reference back to this document when marking resolved.
