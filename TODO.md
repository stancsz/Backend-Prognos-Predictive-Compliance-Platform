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

Additional test/logs/CI tasks
- [ ] Add logs and artifact collection steps to README.md (ci-logs, test-results, screenshots/traces)
- [ ] Add frontend and optional frontend-static (nginx) services to infra/docker-compose.yml
- [ ] Add test-runner service and `wait-for-ready.sh` to infra (run E2E inside compose and exit with test status)
- [ ] Update scripts/test-infra-up.sh and scripts/test-infra-down.sh to support frontend + test-runner modes
- [ ] Update .github/workflows/ci.yml to run combined compose stack, run tests, collect logs, and upload artifacts
- [ ] Ensure tests emit machine-readable artifacts (junit/JSON) to `test-results/` for CI upload
- [ ] Verify CI produces uploaded artifacts and logs (confirm sample run)

Per-task acceptance criteria and files to modify are tracked in the project planner.
