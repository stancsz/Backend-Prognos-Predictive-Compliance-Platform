# infra TODO — Align with AGENT/TODO.md

Purpose
- Provide infra-focused, demo-runner, and local-dev run instructions so contributors can quickly run the MVP demo and validate end-to-end flows.

Quick summary
- The repo includes a demo-runner (`infra/demo-runner`) and compose/Docker assets, but lacks a concise infra README and clear env/run steps for a fast local demo. This file lists the minimal infra work to enable the "upload -> worker -> summary" smoke demo.

High-level goals
- Make it possible to run a local demo quickly (no cloud required) using MinIO + Postgres (docker-compose) or dev fallbacks (JSONL).
- Document required env variables, minimal commands, and how the demo-runner exercises the API + worker.
- Provide smoke-test commands for CI / maintainers.

Environment variables (minimum for local demo)
- S3 (MinIO) / local fallback:
  - AWS_ENDPOINT (e.g., http://localhost:9000)
  - S3_BUCKET (default `local-minio-bucket`)
  - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (MinIO defaults: `minioadmin` / `minioadmin`)
- Postgres (optional, JSONL fallback is supported):
  - DATABASE_URL (e.g., `postgres://user:pass@localhost:5432/dev`)
- API/Worker:
  - PORT (API server port, default 4000)
  - WORKER_PORT (worker health server, default 4001)
  - WORKER_POLL_MS (worker poll interval)
- Dev tokens (for demo-runner):
  - X-DEV-TOKEN or pass `X-USER-EMAIL` header via demo-runner

Quick run (local, Docker-based recommended)
1. Start dependant services with docker-compose:
```bash
# from repo root
docker-compose up -d
```

2. Start API (dev):
```bash
# in one terminal (uses local env or docker compose)
cd packages/api && npm install && npm run dev
```

3. Start Worker (dev):
```bash
cd packages/worker && npm install && npm run dev
```

4. Run demo-runner to exercise flow (upload -> worker -> summary):
```bash
node infra/demo-runner/index.js
# or
cd infra/demo-runner && npm install && node index.js
```

Expected flow exercised by demo-runner
- Calls API POST /uploads to request presigned PUT URL.
- Uploads sample file to S3/MinIO using the presigned URL.
- Worker polls DB/JSONL, downloads object, extracts text and updates evidence metadata.
- Demo-runner queries summary endpoint (to be implemented) or inspects `packages/api/data/evidence.jsonl` to confirm indexing.

Actionable checklist
- [x] Create this infra TODO
- [ ] Add `infra/README.md` with trimmed run instructions and expected demo outputs (short quick-start)
- [ ] Add docker-compose service definitions for a reproducible local demo (if not already present)
- [ ] Document minimal env vars and example `.env.demo` file
- [ ] Wire `infra/demo-runner` to call the API mapping and summary endpoints once implemented
- [ ] Add smoke test script that fails fast if core flow breaks (upload -> worker -> indexed)
- [ ] Add CI job / workflow snippet that runs the smoke demo on PRs (optional)

MVP alignment notes
- Scope for MVP demo: single framework (SOC2), single billing mode (hourly), evidence upload -> control mapping -> simple dashboard/summary.
- See `AGENT/TODO.md` and `packages/api/TODO.md` for API surface and product expectations.

How to use
- Convert checklist items into issues and assign owners.
- Keep this file minimal; link to `infra/README.md` for verbose run instructions.
