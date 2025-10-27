# Planner / Completed Tasks

This file summarizes implemented tasks from the Planner and lists next steps.

## Completed (verified locally)
- [x] Health and readiness endpoints
  - Files: `packages/api/src/app.ts`
  - Notes: `/health` and `/ready` endpoints implemented and unit tests pass.

- [x] Uploads endpoint (JSONL fallback + S3 presign)
  - Files: `packages/api/src/app.ts`, `packages/api/scripts/create_minio_bucket.js`
  - Notes: `POST /uploads` returns `uploadId`, `url` (presigned when S3 configured) and persists metadata to `data/evidence.jsonl` when Postgres is not configured. Integration tests validate JSONL flow.

- [x] Mappings endpoint (create + list)
  - Files: `packages/api/src/app.ts`
  - Notes: `POST /mappings` persists mapping to Postgres when available, else to `data/mappings.jsonl`. `GET /mappings?projectId=...` returns mappings.

- [x] Project summary endpoint
  - Files: `packages/api/src/app.ts`
  - Notes: `GET /projects/{id}/summary` returns aggregated counts (totalEvidence, indexedEvidence, mappingsCount, controlsTotal, controlsCovered). Integration tests validate counts using JSONL fallback.

- [x] OpenAPI spec for core endpoints
  - Files: `packages/api/openapi.yaml`
  - Notes: Spec documents `/health`, `/ready`, `/uploads`, `/frameworks`, `/mappings`, `/projects/{id}/summary`.

- [x] Basic local test harness
  - Files: `packages/api/package.json`, `packages/api/test/*`
  - Notes: `npm --prefix packages/api run test` passes locally (unit + integration JSONL tests).

## Remaining / Next steps
- [ ] DB migrations & automated apply during infra startup
  - Files: `infra/migrations/*`, `packages/api/scripts/run_migrations*.js`, `scripts/test-infra-up.sh`
  - Goal: Ensure Postgres migrations are applied in CI and local docker-compose run.

- [ ] Harden live integration tests (Postgres + MinIO)
  - Files: `packages/api/test/integration-live/*`, `scripts/test-infra-up.sh`, `scripts/test-infra-down.sh`, `infra/docker-compose.yml`
  - Goal: Make `npm --prefix packages/api run test:integration:live` reliable under Docker.

- [ ] CI workflow validation
  - Files: `.github/workflows/ci.yml`
  - Goal: Ensure `integration-live` job runs reliably on GitHub Actions.

- [ ] Frontend integration smoke test
  - Files: `Frontend-Prognos-Predictive-Compliance-Platform/src/lib/api.ts`
  - Goal: Confirm frontend calls match API spec and basic UI renders when pointing to local API.

- [ ] Documentation polish / onboarding
  - Files: `README.md`, `packages/api/README.md`, `DOCKER_COMPOSE_README.md`
  - Goal: Clear quickstart and env var guidance for local developers.

## How to run tests locally
1. Install dependencies (repo root)
```bash
npm ci
npm ci --prefix packages/api
```

2. Run unit + integration (JSONL) tests for API
```bash
npm --prefix packages/api run test
```

3. To run live integration tests (requires Docker)
```bash
./scripts/test-infra-up.sh
npm --prefix packages/api run test:integration:live
./scripts/test-infra-down.sh
