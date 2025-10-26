# Backend refactor & rescanffold — Progress TODO

This file tracks the high-level work for rebuilding and cleaning the backend to provide a stable scaffold for the Frontend Prognos app.

Completed
- [x] Analyze repository and existing API package
- [x] Create OpenAPI spec placeholder (packages/api/openapi.yaml)
- [x] Scaffold minimal TypeScript API (packages/api/src/app.ts)
- [x] Add startup entrypoint (packages/api/src/server.ts)
- [x] Update packages/api/package.json (scripts, main)
- [x] Add packages/api/Dockerfile
- [x] Update infra/Dockerfile.api to use new server entrypoint
- [x] Add packages/api/README.md (dev + docker notes)
- [x] Archive legacy `packages/api/src/index.ts` -> `packages/api/src/index.legacy.ts`
- [x] Add basic integration test for /health (packages/api/test/health.test.ts)
- [x] Fix tsconfig to include test files (packages/api/tsconfig.json)
- [x] Add CI workflow (.github/workflows/ci.yml)
- [x] Commit and push scaffold, tests, Docker, OpenAPI, CI to origin/main
- [x] Update packages/api/package-lock.json and push

In progress / Next
- [ ] Remove/archive remaining legacy runtime files (finalize `index.legacy.ts` fate)
- [ ] Serve OpenAPI (Swagger UI) at `GET /api/docs` and/or publish static spec for frontend
- [ ] Add integration tests (no mocks) for:
  - [ ] POST /uploads (presign flow and JSONL fallback)
  - [ ] POST /mappings (persistence to Postgres/JSONL)
  - [ ] GET /projects/{id}/summary (counts end-to-end)
- [ ] Verify docker-compose integration (ensure infra/docker-compose.yml references and volumes work)
- [ ] Add migrations runner / formalize SQL migrations under infra/migrations
- [ ] Remove embedded frontend repository folder or convert to git submodule (`Frontend-Prognos-Predictive-Compliance-Platform`)
- [ ] Polish package.json scripts (prepare, clean) and developer docs in `packages/api/README.md`
- [ ] Harden CI (lint, typecheck, build, tests; caching; matrix if needed)
- [ ] Add observability basics (structured logs, health/metrics guidance)
- [ ] Coordinate with frontend: generate client types from OpenAPI and validate flows

How to run locally (dev)
- cd packages/api
- npm install
- npm run dev
- npm test

Notes
- package-lock.json was updated and committed after adding test deps; CI should run and validate.
- Next immediate priority: add integration tests for uploads/mappings/summary and serve OpenAPI UI so frontend can begin client generation.
