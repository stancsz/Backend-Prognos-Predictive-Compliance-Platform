# Project Constellation — Developer README

This repository contains the PoC and dev scaffolding for Project Constellation: a modular AI-native SaaS for legal & compliance consulting. This README summarizes the high-level vision (from AGENT/TODO.md), explains the current repo layout, and documents how to run the local dev ingestion E2E (presign → upload → persist → worker index).

## One-line summary of AGENT/TODO.md
Project Constellation is a phased, modular platform combining workflow (engagement, projects, docs) with a data-driven compliance intelligence core (structured frameworks, regulatory feeds, anonymized benchmarking). Start with an MVP that solves evidence collection + project workflow, then add the intelligence/data moat and AI features.

## Repo layout (relevant)
- infra/
  - docker-compose.yml — local dev Postgres + MinIO + Adminer
  - migrations/001_create_evidence.sql — evidence table migration
- packages/api/
  - src/index.ts — uploads API (presign PUT URL + persist metadata to Postgres or JSONL)
  - test/upload_e2e.js — E2E runner: POST /uploads → PUT presigned URL → verify Postgres row
  - scripts/create_minio_bucket.js — helper to create MinIO bucket
- packages/worker/
  - src/index.ts — worker: polls Postgres for uploaded_pending, downloads object from S3/MinIO, computes sha256, extracts text (pdf-parse), updates evidence row
- AGENT/TODO.md — strategic product blueprint and roadmap (source of the extended plan)

## Quickstart (local dev)
Prereqs: Docker / docker-compose, Node.js (LTS), npm, PostgreSQL/MinIO ports available.

1. Start infra
   - docker-compose up -d
   - Wait for Postgres and MinIO healthy.

2. Create required bucket (dev MinIO)
   - node packages/api/scripts/create_minio_bucket.js
   - or use `mc` if preferred.

3. Start API (example)
   - cd packages/api
   - npm install
   - set envs:
     - DATABASE_URL=postgresql://devuser:devpass@localhost:5432/plts_dev
     - AWS_ENDPOINT=http://localhost:9000
     - AWS_ACCESS_KEY_ID=minioadmin
     - AWS_SECRET_ACCESS_KEY=minioadmin
     - S3_BUCKET=local-minio-bucket
   - npm run dev

4. Start Worker (example)
   - cd packages/worker
   - npm install
   - set same envs as API (DATABASE_URL, AWS_ENDPOINT, AWS_*)
   - npm run dev

5. Run E2E test
   - From repo root: node packages/api/test/upload_e2e.js
   - The test:
     - POST /uploads → receives presigned PUT URL + uploadId + objectKey
     - PUT small payload to presigned URL
     - Query Postgres and assert evidence row exists (status = uploaded_pending)
   - Worker should pick up uploaded_pending rows, compute checksum & extracted_text, update status=indexed

## Current implemented behavior (dev)
- API presigns PUT URLs and persists metadata to Postgres (evidence table) or JSONL fallback.
- Worker polls Postgres for `uploaded_pending` rows, downloads from S3/MinIO, computes sha256, extracts text (pdf-parse optional), updates `checksum`, `extracted_text`, `status=indexed`, `indexed_at`.
- Infra compose file contains Postgres, MinIO, Adminer.
- E2E script verifies end-to-end ingestion to evidence row.

## Known gaps / next tasks (prioritized)
- Add robust migration tooling (Flyway / node-pg-migrate) and wire into infra.
- Harden error handling, retries and idempotency in API and worker.
- Add CI pipeline with ephemeral infra for E2E runs.
- Implement OCR fallback and chunked text extraction for large files.
- Add tests for worker processing and integrate into CI.
- Security: secrets management, least-privilege S3 creds, rate limiting.
- Observability: metrics, structured logging, health/readiness endpoints.

## How to contribute
- Follow the repo structure; keep infra-local helpers under infra/ and package code under packages/.
- When adding DB schema changes, add a migration under infra/migrations and reference it in migration tooling.
- Run E2E locally after changes: ensure API + Worker + infra up, then run packages/api/test/upload_e2e.js.

## Contact / References
See AGENT/TODO.md for the full strategic blueprint and product roadmap. Docs folder contains ERD and sequence diagrams for system interactions.
