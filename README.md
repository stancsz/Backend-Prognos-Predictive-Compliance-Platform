# Compliance Legal Tech SaaS — Developer README (Repivot: MVP-first)

Overview — repivot summary
This repository is a self-contained, developer-focused MVP: a minimal, production-alike ingestion pipeline that proves the core evidence collection and indexing workflow for a legal & compliance product. The goal is NOT to build the full Constellation platform yet — instead, prove the smallest, highest-value vertical slice that delivers repeatable developer velocity, deterministic CI, and production-quality primitives that can be iterated on safely.

Core mission for this repo (MVP)
- Validate a reliable presign → upload → ingest → index flow for evidence files using real infra (Postgres + S3-compatible MinIO) and real runtime behavior (API + worker + E2E).
- Harden the developer experience so contributors can run, test, and iterate locally and in CI without mocks or brittle wiring.
- Produce a repeatable set of artifacts (CI gates, runbooks, playbooks, PR/issue templates) so the team can scale execution without diverging architecture or scope.

What this repo currently contains (short)
- infra/docker-compose.yml — local Postgres + MinIO dev stack
- infra/migrations/001_create_evidence.sql — evidence table schema
- packages/api — presign endpoint and E2E test
- packages/worker — poller that downloads objects, computes checksum, extracts text, updates DB
- .github/workflows/e2e.yml — ephemeral infra CI that runs the end-to-end test

Why the repivot
Work has drifted toward broad platform thinking. That work is valuable, but it currently dilutes engineering velocity and makes it hard to measure progress. We must re-focus on completing a production-grade MVP slice first. After the slice is stable and well-tested, expand modules and the AI/data roadmap incrementally.

Demo & Proof-of-Concept (POC) requirements — must-have for MVP
- A short interactive demo is required to validate product fit and to demonstrate the core flow to stakeholders.
- A fully working POC is required: API, worker, DB, object storage, and a minimal client (web UI or CLI) that performs presign -> upload -> confirm indexing.
- The entire POC (server + client + infra) must be runnable inside the provided Docker environment (infra/docker-compose.yml). Running `docker-compose up --build` (or the CI reproduction script) should start Postgres, MinIO, API, worker, and a simple demo client or demo runner service.
- Acceptance criteria for demo/POC:
  - `docker-compose up --build` brings the environment up and the demo client can upload a sample file and show it indexed within the running UI or via the demo log output.
  - Demo includes a short README section or script that reproduces the flow in under 2 minutes.
  - POC is deterministic enough to run in CI (used by the E2E) or locally with infra/ci-run-e2e.sh.

MVP scope (this repo — next 4–8 weeks)
- Single vertical slice: secure upload + evidence persistence + worker indexing + deterministic E2E
- No external model integrations in CI; no marketplace APIs; no multi-framework intelligence yet
- Real infra only (Postgres + MinIO), deterministic scripts, clear runbooks for local dev and CI
- Demo & POC requirement enforced before any Phase 2 feature merges

Immediate priorities (P0)
1. Stabilize CI E2E: make .github/workflows/e2e.yml reliable; surface flaky test mitigations and artifacts.
2. Harden DB migrations: adopt simple migrations tooling and wire into CI.
3. Worker robustness: idempotency, retries/backoff, structured logging, health/readiness endpoints.
4. Observability: structured logs, basic metrics and request tracing for API + worker.
5. Test quality: replace any remaining mocks in tests with real integration flows; add worker idempotency and failure/retry tests.
6. Repo hygiene: add PR template, ISSUE_TEMPLATEs, CODEOWNERS, and lightweight pr-check.yml to enforce gates.
7. Demo & POC: add a minimal client demo (web or CLI) and ensure `infra/docker-compose.yml` starts server + client for local demos.

Near-term roadmap (deliverables)
- Week 0–1: Make infra/ci-run-e2e.sh deterministic and fast; ensure migration runs reliably in CI.
- Week 1–3: Implement idempotency in worker; add integration tests for retry scenarios.
- Week 3–5: Add pr-check CI with lint + typecheck + unit/integration tests; add PR & issue templates and CODEOWNERS.
- Week 5–8: Add runbooks/docs for dev onboarding (infra/README.md, docs/runbooks/*), publish AGENT playbooks to guide contributors.
- Week 6–8: Deliver demo & POC: client + server contained in docker-compose, demo instructions, and a short demo script.

How the AGENT playbooks fit (roles)
- Tech Lead: own architecture decisions, define acceptance criteria for the MVP slice, enforce PR gates.
- Senior Engineer: pick the highest-impact task from the backlog, state plan in PR, implement to production standards (no mocks), write tests & docs.
- QA: drive integration/E2E tests against real infra, fix flaky tests, verify idempotency and failure modes.
- Product: define the minimal acceptance criteria for the MVP slice and measure success (e.g., stable E2E in CI, reproducible local runs).

Acceptance criteria for the MVP
- CI passes E2E reliably for 5 consecutive runs without human intervention.
- Worker is idempotent for duplicate uploads and has retry/backoff behavior that recovers from transient infra failures.
- Migrations applied in CI automatically and deterministically.
- PRs require passing pr-check gates and a completed PR template checklist.
- Demo/POC runs via Docker Compose and demonstrates presign → upload → ingest → index.

Next actions (what I will do if instructed)
- Update AGENT/AGENT.md with completed role playbooks and commit.
- Add .github/PULL_REQUEST_TEMPLATE.md and ISSUE_TEMPLATEs, and a pr-check workflow on a branch `chore/repo-playbooks`.
- Implement worker idempotency tests and improve ci-run-e2e.sh to be less flaky.
- Add a minimal demo client and wire it into infra/docker-compose.yml so the demo runs with `docker-compose up --build`.
- Iterate on README and docs to reflect progress and milestones.

Contact / notes
- Treat this repository as the canonical MVP — keep scope narrow and production-quality. AI and data-driven features belong in Phase 2 once the MVP slice is stable and instrumented.
