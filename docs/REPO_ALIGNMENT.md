# Repo alignment with AGENT/TODO.md — Summary & Next Steps

This document summarizes what I added to align the repository with the high-level requirements in `AGENT/TODO.md`, what remains, and recommended next actions to produce a runnable demo and usable product surface.

What I added (completed)
- Top-level repo TODO: `TODO.md` — gap analysis and action checklist.
- Package TODOs:
  - `packages/api/TODO.md`
  - `packages/web/TODO.md`
  - `packages/worker/TODO.md`
  - `infra/TODO.md`
- API scaffolding:
  - Inline TODOs added to `packages/api/src/index.ts` describing required endpoints and behavior.
  - Demo framework data scaffold: `packages/api/data/soc2.jsonl` (SOC 2 sample controls).
- Worker scaffolding:
  - Inline TODOs added to `packages/worker/src/index.ts` describing processing responsibilities.
- README already contains a demo section and MVP scope; preserved and referenced by infra TODO.
- All new files are short, actionable, and map back to AGENT/TODO.md expectations.

Remaining high-impact items (recommended priority)
- Implement minimal API endpoints so demo-runner and a small UI/CLI can exercise mapping:
  - GET /frameworks
  - GET /frameworks/:id/controls
  - POST /mappings
  - GET /projects/:id/summary
  - add simple dev auth middleware
- Implement simple mapping persistence (mappings table or JSONL)
- Wire infra/demo-runner to call mapping + summary endpoints (currently only tests presign/upload)
- Add inline TODOs and quick scaffolding in web package (or a small CLI) to exercise mapping UI flows
- Add smoke test that runs: presign → PUT → worker indexing → mapping → summary (demo-runner)
- Add CONTRIBUTING.md and short infra/README.md (link from infra/TODO.md)
- Add a small design folder (wireframes) and short UX notes for upload → mapping → dashboard
- Add unit/integration tests for mapping endpoints and worker idempotency

Short-term actionable checklist (convert to issues)
- [ ] Implement GET /frameworks and controls endpoint (read from `packages/api/data/soc2.jsonl`)
- [ ] Implement POST /mappings and persist to DB or JSONL
- [ ] Implement GET /projects/:id/summary (counts & basic compliance status)
- [ ] Update `infra/demo-runner` to exercise mapping + summary
- [ ] Add a minimal UI or CLI to demonstrate mapping (packages/web or a tiny script)
- [ ] Add infra/README.md with exact env vars and quick start (refer to infra/TODO.md)

How to use this work
- Create issues from each checklist item and assign owners/estimates.
- Prioritize endpoints enabling demo-runner first (mapping + summary).
- Keep changes minimal and focused on the MVP path: presign → upload → ingest → map → summary.

If you want, I will:
- Implement the GET /frameworks and GET /frameworks/:id/controls endpoints next (quick change to packages/api/src/index.ts) and then pause for confirmation.
- Or implement POST /mappings and the summary endpoint next.

Choose which I should implement next; I will then apply one change and show results.
