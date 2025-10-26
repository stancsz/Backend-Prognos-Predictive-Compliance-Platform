# Backend refactor & rescanffold — Progress TODO

This file tracks the high-level work for rebuilding and cleaning the backend to provide a stable scaffold for the Frontend Prognos app.

Completed
- [x] Analyze repository and existing API package
- [x] Create OpenAPI spec (packages/api/openapi.yaml)
- [x] Scaffold TypeScript API (packages/api/src/app.ts, packages/api/src/server.ts)
- [x] Archive legacy entrypoint -> packages/api/src/index.legacy.ts
- [x] Add Dockerfiles and update infra builds
- [x] Update packages/api/package.json (scripts, main)
- [x] Add packages/api/README.md
- [x] Add basic integration test for /health (packages/api/test/health.test.ts)
- [x] Fix tsconfig to include test files (packages/api/tsconfig.json)
- [x] Add CI workflow (.github/workflows/ci.yml)
- [x] Commit and push scaffold, tests, Docker, OpenAPI, CI to origin/main
- [x] Update packages/api/package-lock.json and push
- [x] Serve OpenAPI (Swagger UI) at `GET /api/docs`

In progress / Next (priority order)
- [ ] Add integration tests (no mocks) for:
  - [ ] POST /uploads (presign flow and JSONL fallback)
  - [ ] POST /mappings (persistence to Postgres/JSONL)
  - [ ] GET /projects/{id}/summary (counts end-to-end)
- [ ] Verify docker-compose integration (ensure infra/docker-compose.yml references and volumes work)
- [ ] Add migrations runner / formalize SQL migrations under infra/migrations
- [ ] Remove or convert the embedded frontend folder (`Frontend-Prognos-Predictive-Compliance-Platform`) to a submodule
- [ ] Polish package.json scripts (prepare, clean) and developer docs in `packages/api/README.md`
- [ ] Harden CI (lint, typecheck, build, tests; caching; matrix if needed)
- [ ] Add observability basics (structured logs, health/metrics guidance)
- [ ] Coordinate with frontend: generate client types from OpenAPI and validate flows

How to run locally (dev)
- cd packages/api
- npm install
- npm run dev
- npm test
- docker-compose -f infra/docker-compose.yml up --build (for integration work)

Notes
- package-lock.json was updated and committed after adding test deps; CI should run and validate.
- Next immediate priority: implement integration tests for uploads/mappings/summary and run them against postgres+minio via infra/docker-compose.
