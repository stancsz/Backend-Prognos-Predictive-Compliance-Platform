# TODO - Implementation Plan (Actor)

This file tracks implementation tasks derived from README and planner.

- [x] Analyze requirements (README + packages/api/README.md)
- [x] Validate local dev setup (install & run API)
- [x] Implement / verify core HTTP endpoints (/health, /ready, /uploads, /mappings, /projects/{id}/summary)
- [ ] Ensure infra (Postgres + MinIO) boots via docker-compose
- [ ] Wire persistence (Postgres) and object storage (MinIO/S3)
- [ ] Add/verify DB migrations and seed data
- [ ] Implement worker integration and background jobs
- [ ] Complete OpenAPI spec and API contract conformance
- [ ] Make tests green (unit, integration, live)
- [ ] Dockerize & CI validation
- [ ] Frontend integration verification (end-to-end upload flow)

Per-task acceptance criteria and files to modify are tracked in the project planner.
