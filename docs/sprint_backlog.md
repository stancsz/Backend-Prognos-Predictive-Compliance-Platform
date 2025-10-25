# 6-Sprint Backlog (MVP — 6 months)

Assumptions
- Team: 2 backend, 2 frontend, 1 ML, 1 DevOps, 1 UX, part-time security/product.
- Sprint length: 3 weeks (Sprint 0 = 2 weeks).
- MVP scope: Modules 1–3 + SOC 2 controls + basic time tracking/invoicing.

Sprint 0 (2w) — Kickoff & Scaffolding
- S0-1: Repo skeleton & monorepo decision (Nx/Turborepo). Owner: DevOps. Est: 2d. AC: repo layout + README + CODEOWNERS in main branch.
- S0-2: Baseline CI (GitHub Actions) + PR checks. Owner: DevOps. Est: 2d. AC: pipeline runs lint/test/build on PRs.
- S0-3: Dev K8 cluster + secrets store (Vault/KMS). Owner: DevOps. Est: 4d. AC: dev cluster accessible, secrets stored securely.
- S0-4: Clickable UX prototype: client portal upload + mapping flow. Owner: UX. Est: 4d. AC: clickable prototype link.

Sprint 1 — Auth, Org, Project CRUD (3w)
- S1-1: Auth service (OIDC Google + local dev). Owner: Backend. Est: 6d. AC: login/logout, session, token validation.
- S1-2: Org, User, Role models + RBAC skeleton. Owner: Backend. Est: 4d. AC: API + unit tests enforce role checks.
- S1-3: Frontend auth flows + basic org/project UI. Owner: Frontend. Est: 6d. AC: create project, list projects, auth-protected routes.

Sprint 2 — DMS upload flow & extraction worker (3w)
- S2-1: Presigned upload endpoints + metadata persistence. Owner: Backend. Est: 5d. AC: POST /uploads returns presigned URL and uploadId.
- S2-2: Worker skeleton + queue (RabbitMQ). Owner: Backend/DevOps. Est: 4d. AC: worker consumes events and logs processing.
- S2-3: Text extraction PoC (PDF/ocr) and store extracted_text. Owner: ML. Est: 5d. AC: sample PDF processed, extracted_text saved.
- S2-4: Frontend upload UI and upload-complete flow. Owner: Frontend. Est: 4d. AC: user can upload and see processing status.

Sprint 3 — Controls model & manual mapping UI (3w)
- S3-1: Framework/Control/ControlVersion schema (SOC 2). Owner: Backend. Est: 5d. AC: API to list controls and versions.
- S3-2: Manual mapping API (evidence -> control) + AuditTrail. Owner: Backend. Est: 4d. AC: mappings persisted with audit events.
- S3-3: Mapping review UI (consultant) with accept/reject. Owner: Frontend. Est: 6d. AC: accept/reject updates mapping status and audit.
- S3-4: Seed SOC 2 dataset import. Owner: Backend. Est: 2d. AC: controls imported and visible in UI.

Sprint 4 — Search & AI suggestion PoC (3w)
- S4-1: Index extracted_text into OpenSearch. Owner: Backend/DevOps. Est: 4d. AC: searchable evidence text.
- S4-2: Embeddings pipeline (generate & store in vector DB). Owner: ML. Est: 6d. AC: vector stored and retrievable.
- S4-3: Similarity endpoint returns candidate controls. Owner: Backend/ML. Est: 5d. AC: /suggestions returns top-N with scores.
- S4-4: UI: show AI suggestions with confidence and provenance. Owner: Frontend. Est: 3d. AC: consultant can accept/reject suggestions.

Sprint 5 — Reporting, time tracking, invoicing (3w)
- S5-1: Basic client dashboard showing project posture. Owner: Frontend/Backend. Est: 6d. AC: dashboard reflects accepted mapping counts and status.
- S5-2: Time tracking API + UI (mobile-friendly). Owner: Backend/Frontend. Est: 6d. AC: record time entries against tasks/projects.
- S5-3: Single-mode invoicing (hourly). Owner: Backend. Est: 4d. AC: generate invoice PDF and mark paid via stubbed payments.

Sprint 6 — Staging pilot & hardening (3w)
- S6-1: Observability + SLOs (Prometheus + traces + alerts). Owner: DevOps. Est: 5d. AC: dashboards and alert rules in place.
- S6-2: Automated e2e tests + contract tests (Pact). Owner: Backend/Frontend. Est: 6d. AC: CI runs e2e and contract checks against staging.
- S6-3: Security review + pen-test plan and DPA draft. Owner: Security/Product. Est: 4d. AC: checklist complete and DPA template ready.
- S6-4: Onboard 1 pilot consulting firm; run pilot checklist. Owner: PM/Eng. Est: 5d. AC: pilot feedback logged and prioritized.

Ticketing conventions
- Each ticket must include: Description, Acceptance Criteria (pass/fail), Owner, Estimate, Priority.
- Use labels: area/backend, area/frontend, spike, infra, security, blocker.

Acceptance criteria examples (copy into tickets)
- "Given X, when Y, then Z" format.
- Include test steps and required metrics (latency, error budget) where applicable.

Notes & next steps
- After merging infra/ci-scaffold, create individual feature branches per ticket.
- Prioritize P0 technical debt items (contract tests, secrets rotation, DB migrations) in parallel to sprints.
