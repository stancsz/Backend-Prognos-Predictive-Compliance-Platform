# TECH LEAD: Prioritized Technical Backlog, Acceptance Criteria & Review Guidance

## Objective
Act as the Autonomous Tech Lead: own architecture decisions, remove blockers, enforce code quality and release safety, and deliver production-grade software for Project Constellation.

---

## Top-priority backlog (P0)
1. Infra & CI baseline (infra/ci-hardening)
   - Tasks: Terraform backend config + state, GitHub Actions pr-check (lint, typecheck, unit tests), container image scanning.
   - Acceptance: PRs block on lint/type/test; terraform fmt/validate run on infra PRs.

2. Auth & RBAC core (feat/auth-scaffold)
   - Tasks: OIDC Google + local dev fallback, role model, middleware enforcing RBAC.
   - Acceptance: login works; backend endpoints return 401/403 properly; unit tests cover role checks.

3. Evidence ingestion (feat/dms-upload)  completed (PoC), harden
   - Tasks: migrate metadata from JSONL to Postgres, add migrations (Flyway), E2E tests.
   - Acceptance: POST /uploads -> presigned URL; metadata persisted in Postgres; E2E passes against MinIO.

4. Worker & Extraction (feat/worker-extract)  PoC exists, harden
   - Tasks: queue-based worker (Rabbit/Kafka), retries, idempotency, metrics, traces.
   - Acceptance: worker processes uploads, writes checksum & extracted_text, exposes health endpoint, alerts on backlog.

5. Contract & E2E tests (feat/e2e-tests)
   - Tasks: Pact contract tests frontendapi; CI job runs ephemeral MinIO and E2E.
   - Acceptance: contract tests pass; CI runs e2e successfully in PR pipeline.

---

## Secondary backlog (P1)
- Search (OpenSearch) + vector DB (Pinecone/Milvus) integration
- Embeddings pipeline + ML infra (MLflow + model versioning)
- Client portal features: secure messaging, UI for mapping suggestions
- No-code workflow builder (templates)
- Billing: invoices + payments (stub then provider)

Acceptance for P1 items: documented runbooks, tests, and monitored rollout.

---

## Tech-debt & Production-readiness (must before GA)
- DB migrations enforced in CI (Flyway)
- Secrets management: HashiCorp Vault or cloud KMS integration
- Observability: OpenTelemetry traces, Prometheus metrics, Grafana dashboards
- SLOs & alerting: error-rate, latency, queue-depth alerts
- Dependency and security scanning in CI (Snyk / image scan)

Acceptance: documented runbooks + CI gates + alerting playbook.

---

## PR Review checklist (must be present in every PR)
- [ ] Summary & goal
- [ ] Tests added/updated (unit/integration/e2e)
- [ ] Lint & formatting passed
- [ ] Type checks passed
- [ ] Contract tests updated if API changed
- [ ] Security: no secrets, input validation, dependency scan
- [ ] Observability: metrics/traces/logging added
- [ ] DB migration included (if schema changed)
- [ ] Runbook/docs updated for operational steps
- [ ] Data/AI: explicit statement if data is sent to external models, consent flow present

PRs missing any item must be rejected until fixed.

---

## Release & rollback criteria
- Release gates:
  - All CI checks green
  - No critical security findings
  - Canary shows no error-rate regression for 15m
- Rollback:
  - Automated rollback on canary failure (>1% error-rate or 2x latency)
  - DB migrations must be backward-compatible; irreversible migrations require manual runbook

---

## Review feedback guidelines (for reviewers)
- Validate scope: small, single responsibility PRs only
- Verify performance: check database queries, N+1, indexes
- Validate security: secrets, auth, ORMs parameterized queries
- Confirm observability: metrics/traces exist for new code paths
- Require test coverage for any new business logic
- Approve only when runbook/ops steps are included for production changes

---

## Immediate actions I committed to
- Add `docs/TECH_LEAD.md` (this file)
- Enforce PR template + CI next (branch `chore/repo-playbooks`)
- Prioritize P0 tickets and assign owners in `docs/backlog.csv`

