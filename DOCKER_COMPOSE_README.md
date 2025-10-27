# One-command local demo (Docker Compose)

This README describes how to start the full Prognos stack locally with a single docker-compose command so the end product can be spun up easily for development or CI-style live integration tests.

Prerequisites
- Docker Desktop / Docker Engine installed and running
- Ports 4000, 5432, 9000 free on localhost
- Node/npm available for running tests or dev server locally

Quickstart — bring up the stack
1. From the repository root, run:
   - ./scripts/test-infra-up.sh

This script performs:
- docker-compose -f infra/docker-compose.yml up -d
- waits for Postgres, MinIO, and the API to be healthy
- creates the S3 bucket if necessary (MinIO)
- exits when the stack is ready to accept requests

Smoke test the stack
- Confirm API is listening on port 4000:
  - curl http://localhost:4000/health
- Run the live integration tests (Postgres + MinIO):
  - npm --prefix packages/api run test:integration:live

Teardown
- To stop and remove the infra started by the script:
  - ./scripts/test-infra-down.sh

Environment variables (optional)
- The infra scripts and tests will read these environment variables if you want to override defaults:
  - DATABASE_URL — Postgres connection string (when pointing to remote DB)
  - AWS_ENDPOINT — S3/MinIO endpoint (e.g. http://localhost:9000)
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - S3_BUCKET — bucket name to use

Notes and troubleshooting
- If you cannot run Docker locally, the CI job `integration-live` in .github/workflows/ci.yml runs an equivalent stack on GitHub Actions.
- The live integration tests will skip automatically if the required infra (Postgres or MinIO) is not reachable from the test runner.
- Ensure the ports above are free; common conflicts: local Postgres (5432) or other services using 4000/9000.
- If MinIO bucket creation fails, inspect docker logs for the MinIO container and verify credentials match the test helpers defaults (minioadmin/minioadmin).
- For a direct docker-compose command (without helper scripts), you can run:
  - docker-compose -f infra/docker-compose.yml up -d
  - (use the scripts above for the convenience checks and waits)

Expected services (from infra/docker-compose.yml)
- postgres (5432)
- minio (9000)
- api (Prognos API, port 4000)
- worker (background processor)
- demo-runner (optional automation harness)

This file documents the single-command flow used by developers and CI to launch the full demo stack for live integration testing and local development.
