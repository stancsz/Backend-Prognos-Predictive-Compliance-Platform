# MVP Readiness Checklist

Use this checklist to evaluate the MVP across Product, Technical, and Operational dimensions. Mark each item as complete when verified and add notes or links where appropriate.

## Product & Vision
- [x] Problem & Value Articulation — README defines the repo mission, problem, and value proposition (see `README.md` "Overview — repivot summary").
  - Evidence: `README.md` (overview, core mission).
- [x] Core Scenario Clarity — Core vertical slice (presign → upload → ingest → index) is explicitly defined as the single critical scenario.
  - Evidence: `README.md` "Core mission for this repo (MVP)" and "MVP scope".
- [x] Scope Boundaries — Exclusions for Phase 1 are documented (no external model integrations, restricted scope).
  - Evidence: `README.md` "MVP scope".
- [x] Success Metrics — Primary metric defined: "E2E CI: 5 consecutive successful E2E runs".
  - Evidence: `README.md` acceptance criteria and `.github/workflows/e2e.yml`. Aim: achieve 5 consecutive successful E2E runs in CI to validate stability.

## Technical Viability
- [x] Setup Instructions — Quick start and docker-compose instructions exist (`README.md` "Running the demo locally (docker-compose)").
  - Evidence: `README.md` quick start, `infra/docker-compose.yml`.
- [ ] Working Demo Proof — Demo runner exists and is documented (`infra/demo-runner/index.js` and README), but there are no embedded screenshots/GIFs/videos in docs.
  - Action: Capture a short GIF or screenshot of the demo-runner output and add to docs.
- [ ] Error Logging — Structured logging and observability are stated as priorities but implementation status should be verified in the running services (not yet confirmed).
  - Action: Verify API and worker logs contain structured JSON logs and add examples.
- [x] Deployment Simplicity — Demo and services are runnable via `docker-compose` with documented commands.
  - Evidence: `README.md` and `infra/docker-compose.yml`.
- [ ] Core Non-Functional — Minimum acceptable security/performance/responsiveness not yet validated; requires a short checklist/runbook.
  - Action: Run basic health checks and document results.
- [x] Dependencies Listed — Core external services (Postgres + MinIO) and runtime components (API, worker, demo-runner) are listed in README and infra files.
  - Evidence: `README.md`, `infra/docker-compose.yml`, `infra/migrations/001_create_evidence.sql`.

## Operational Readiness
- [ ] Code Quality / Review — PR templates and CI pr-check workflow exist to enforce standards (`.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/pr-check.yml`), but confirm that reviews have been performed for the release candidate.
  - Evidence: `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/pr-check.yml`.
  - Action: Ensure at least one PR with code review for the release is present.
- [x] Automated Testing — E2E tests and CI workflow are present (`packages/api/test/*`, `.github/workflows/e2e.yml`); core scenario covered by demo-runner and E2E.
  - Evidence: `packages/api/test/upload_e2e.js`, `packages/api/test/worker_idempotency_e2e.js`, `.github/workflows/e2e.yml`.
- [ ] Version Control — Release tagging/branch policy for the MVP release is not yet applied (no explicit release tag documented).
  - Action: Create a release tag/branch for the MVP and document.
- [ ] Known Issues — Top 3 known functional bugs/shortcuts are not listed in a single known-issues section.
  - Action: Add `docs/KNOWN_ISSUES.md` or a section in this file with the top 3 items.
- [x] Next Steps Plan — README contains a clear near-term roadmap and next actions to complete the MVP.
  - Evidence: `README.md` "Immediate priorities", "Near-term roadmap", "Next actions".

---

Evidence & quick links
- `README.md` — repo mission, demo instructions, acceptance criteria.
- `infra/docker-compose.yml` — local dev stack (Postgres + MinIO + services).
- `infra/demo-runner/index.js` — automated demo runner (presign → upload → poll → mapping → summary).
- `packages/api/test/` — E2E and worker tests (`upload_e2e.js`, `worker_idempotency_e2e.js`).
- `.github/workflows/e2e.yml` — CI E2E workflow.
- `infra/ci-run-e2e.sh`, `infra/CI_RUN.md` — CI reproduction and runbook.
- `infra/migrations/001_create_evidence.sql` — evidence schema.
- `packages/worker/src/index.ts` — worker implementation.

Suggested next actions (short)
- [ ] Define a single measurable success metric and add it under "Success Metrics".
- [ ] Capture a short demo GIF or screenshot and link it in docs.
- [ ] Verify structured logging and add sample log excerpts to docs.
- [ ] Create a `docs/KNOWN_ISSUES.md` with top 3 items.
- [ ] Tag the release/branch for the MVP and document the git tag.
- [ ] Run the E2E CI 5x and record results to validate acceptance criteria.
- [ ] Move completed evidence links into PR description when tagging release.

How to use:
1. Open this file during the final pre-release review.
2. For each checked item add a short note and link(s) to evidence (PRs, docs, screenshots, test runs).
3. When all boxes are checked, tag the current commit/release and record the release notes.
