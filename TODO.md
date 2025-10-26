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

In progress / Next
- [ ] Restore and finalize OpenAPI spec content in `packages/api/openapi.yaml`
- [ ] Add CI workflow (lint, typecheck, test) in `.github/workflows/ci.yml`
- [ ] Add more integration tests (uploads, mappings, projects summary)
- [ ] Add Docker-compose integration note (verify infra/docker-compose.yml references)
- [ ] Decide fate of legacy code and remove or archive remaining legacy files
- [ ] Implement a stable migrations system and move SQL migration files to infra/migrations
- [ ] Add API docs / Swagger UI serve route or static spec packaging
- [ ] Coordinate with frontend team to generate client types and validate contract

How to run locally (dev)
- cd packages/api
- npm ci
- npm run dev   # hot-reload via ts-node-dev
- npm test

How to run with docker-compose (local)
- docker-compose -f infra/docker-compose.yml up --build

Notes
- The scaffold uses a pluggable persistence model: DATABASE_URL -> Postgres, fallback -> JSONL files in `packages/api/data`.
- S3/MinIO integration is driven by AWS_ENDPOINT / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY environment variables (infra compose already sets these for local dev).
- CI should run `npm ci` in `packages/api` then `npm run lint && npm run build && npm test`.

If you want, I can now:
- implement the CI workflow and add a simple GitHub Actions `ci.yml`, and
- finish the OpenAPI spec at `packages/api/openapi.yaml` to match the implemented endpoints.

Reply with "yes" to approve adding CI + finishing the OpenAPI spec and I'll proceed.
