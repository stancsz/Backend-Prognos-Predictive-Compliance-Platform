# Repo TODOs — Align with AGENT/TODO.md

This file lists concrete gaps, priorities, and actionable tasks to bring the repository into alignment with the high-level product requirements in `AGENT/TODO.md`. Use these items to triage work, create issues, and scaffold missing pieces (demos, docs, design, and feature scaffolding).

Summary
- The repo currently contains infrastructure, API, worker, and a demo runner, but lacks:
  - a user-friendly demo and run instructions
  - clear product README and docs mapping to the "Constellation" vision
  - scaffolding and TODOs in code where major features described in AGENT/TODO.md are missing
  - design assets / UX flows and a simple usable frontend experience
  - structured framework / controls data model and evidence -> control mapping
  - living dashboards, client portal, and workflow templates
  - tests and e2e flows that demonstrate core user journeys

High-level gaps mapped to AGENT/TODO.md
- Demo & onboarding: no clear, runnable end-to-end demo for a consultant to try the product quickly.
- Docs & README: missing product-oriented README that explains MVP scope, how to run demo, and next steps.
- Design & UX: no mockups / UX flows or simple web UI exposing client portal or dashboards.
- Core features: evidence repository, frameworks library (structured controls), mapping UI/workflow, analytics/dashboard, basic billing/time-tracking.
- Data strategy: no schema for structured compliance objects (controls, frameworks, evidence metadata).
- AI/automation: placeholder only — no integration or scaffolding for doc summarization or evidence mapping.
- Tests & CI: add e2e demo tests and improve existing tests to cover core flows.

Actionable checklist
- [x] Analyze requirements (read `AGENT/TODO.md`)
- [ ] Create a short, runnable demo (infra + api + worker + web) that shows: upload evidence -> map to control -> view simple dashboard
- [ ] Add a top-level "How to demo" section in README.md linking to demo runner and environment setup
- [ ] Create per-package TODOs:
  - [ ] `packages/api/TODO.md` — define APIs for frameworks, evidence, mapping, auth
  - [ ] `packages/web/TODO.md` — simple UI routes: login, upload, mapping, dashboard
  - [ ] `packages/worker/TODO.md` — evidence processing (OCR/NLP) scaffold and background jobs
  - [ ] `infra/TODO.md` — demo credentials, local env, docker-compose run steps
- [ ] Add structured data schema files (JSON/YAML) for frameworks & controls under `packages/api/data/` (scaffold SOC2 example)
- [ ] Insert inline TODO comments in key code locations (API endpoints, worker processing, web entrypoints) pointing to AGENT/TODO.md requirements
- [ ] Add a minimal design / UX folder (`design/`) with 2-3 annotated wireframes (upload, mapping, dashboard)
- [ ] Document MVP scope in README: single framework (SOC 2), single billing mode (hourly), key user flows
- [ ] Create an infra/demo README with commands to run a local demo using existing demo-runner
- [ ] Add automated demo smoke tests (infra/demo-runner + simple webdriver or puppeteer script)
- [ ] Prioritize backlog: map items from `docs/TECHNICAL_BACKLOG.md` to AGENT/TODO.md deliverables
- [ ] Add CONTRIBUTING.md and simple dev-run checklist for new contributors

Short-term priorities (first 2 days)
- [ ] README: add "Quick demo" and "MVP scope" sections
- [ ] Create `packages/api/TODO.md` and `infra/TODO.md`
- [ ] Scaffold `packages/api/data/soc2.jsonl` with one sample control and evidence mapping example
- [ ] Add inline TODOs to `packages/api/src/index.ts` and `packages/worker/src/index.ts` where evidence/workflow logic should live
- [ ] Add run instructions for `infra/demo-runner` in `infra/README.md`

How to use this file
- Convert each checklist item into issues with labels (priority/severity/component).
- Attach owners and estimate times for MVP items.
- Keep this file updated as pieces are completed.

Reference
- See `AGENT/TODO.md` for the full strategic vision and feature requirements to align with.
