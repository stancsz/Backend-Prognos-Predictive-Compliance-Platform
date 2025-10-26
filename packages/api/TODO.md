# packages/api TODO — Align with AGENT/TODO.md

Purpose
- Define API surface, data schema, and minimal endpoints to support the MVP demo:
  - evidence upload
  - frameworks (read-only SOC2 scaffold)
  - mapping evidence -> control
  - simple auth (dev-friendly token)
  - basic dashboard endpoints (summary counts)

Quick checklist
- [x] Create this TODO file
- [ ] Define JSON schema for frameworks, controls, evidence metadata (`packages/api/data/`)
- [ ] Add `packages/api/data/soc2.jsonl` scaffold (one or two sample controls)
- [ ] Implement endpoints (minimal):
  - [ ] POST /upload-evidence
  - [ ] GET /frameworks
  - [ ] GET /frameworks/:id/controls
  - [ ] POST /mappings
  - [ ] GET /projects/:id/summary
  - [ ] Basic dev auth middleware (token)
- [ ] Add unit tests for above endpoints (use existing test harness)
- [ ] Add inline TODO comments in `packages/api/src/index.ts` pointing to where each endpoint should live
- [ ] Document request/response examples in README or this file
- [ ] Wire demo-runner to call upload -> map -> summary endpoints

Notes
- Keep schemas small and explicit for the MVP (SOC2 only).
- Store sample framework(s) in `packages/api/data/` as JSONL so later imports are straightforward.
- Make endpoints idempotent and simple so infra/demo-runner can drive an end-to-end smoke demo.
