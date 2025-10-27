# Prognos — API (packages/api)

This document explains how to run and test the Prognos API locally and in CI.

Prerequisites
- Node 18+ / npm
- Docker (for live integration tests)
- Ports: 4000 (API), 5432 (Postgres), 9000 (MinIO) available when using docker-compose

Install
1. From repo root:
   npm ci

2. Install only API deps (optional if working only in packages/api):
   npm ci --prefix packages/api

3. Copy example environment variables for local development (convenience):
   npm run copy-api-env

Run locally (dev)
- Start the API in dev mode (uses ts-node-dev):
  npm --prefix packages/api run dev
- Default port: 4000
- Dev environment variables (optional):
  - PORT (defaults to 4000)
  - DATABASE_URL (Postgres connection string)
  - AWS_ENDPOINT (MinIO/ S3 endpoint)
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - S3_BUCKET (bucket name)

Quick commands (build / start)
- Build:
  npm --prefix packages/api run build
- Start built server:
  npm --prefix packages/api run start

Health & readiness
- GET /health — basic status ({ status: "ok", db: boolean })
  - Example: `curl -sS http://localhost:4000/health | jq .`
- GET /ready — readiness check; returns { ready: boolean, db: boolean, s3: boolean, bucket: string }
  - Example: `curl -sS http://localhost:4000/ready | jq .`

OpenAPI and docs
- GET /api/openapi.yaml — serves the OpenAPI spec
- GET /api/docs — minimal Swagger UI for the spec

Tests
- Unit & integration tests (JSONL fallback, no infra needed):
  npm --prefix packages/api test
- Integration tests (non-live):
  npm --prefix packages/api run test:integration
- Live integration tests (requires docker infra):
  1. From repo root bring up infra:
     ./scripts/test-infra-up.sh
  2. Run live tests:
     npm --prefix packages/api run test:integration:live
  3. Teardown:
     ./scripts/test-infra-down.sh

Scripts
- Ensure DB schema (used in CI / migrations):
  npm --prefix packages/api run ensure-schema
- Run migrations:
  npm --prefix packages/api run migrate

Notes
- The API falls back to JSONL persistence under `packages/api/data/` if DATABASE_URL is not supplied; this makes local lightweight development fast and idempotent for tests.
- When running live integration tests, ensure MinIO and Postgres are reachable. The `create_minio_bucket.js` helper is used during startup to ensure the S3 bucket exists.
- Tests that interact with S3 or Postgres are written to be idempotent; if you add tests that create persistent resources, make sure they clean up after themselves.

Troubleshooting
- If ports conflict, stop the conflicting service or change ports in infra/docker-compose.yml.
- If MinIO bucket creation fails in CI, check AWS_ENDPOINT, credentials, and bucket name.

Further reading
- Root README.md for project-level instructions and infra composition.
- infra/README.md for docker-compose details.
