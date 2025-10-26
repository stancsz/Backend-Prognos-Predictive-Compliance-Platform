# Next-step plan for backend refactor (requires approval)

Summary
- Completed initial scaffold, OpenAPI, Dockerfile, CI, basic test and archived legacy index.ts.
- Next actions will finalize the scaffold, remove or archive remaining legacy runtime files, add more integration tests, and publish the OpenAPI contract (Swagger UI or static hosting).

Proposed next actions (one PR)
1. Remove or archive remaining legacy runtime files (finalize `index.legacy.ts` fate).
2. Add Swagger UI endpoint serving `packages/api/openapi.yaml` (GET /api/docs).
3. Add integration tests for:
   - POST /uploads (presign flow fallback)
   - POST /mappings
   - GET /projects/{id}/summary
4. Add lightweight migrations runner or document migration steps and move SQL to infra/migrations.
5. Polish package.json (add `prepare` script, ensure dev deps) and update README if needed.
6. Run CI in PR to verify lint, build, and tests pass.

Approval
- Reply with "yes" to approve these next actions and I will implement them (create files, tests, and CI updates). If you want to exclude or add any specific step, state it now.

Task progress
- [x] Analyze repository and existing API package
- [x] Create OpenAPI spec (packages/api/openapi.yaml)
- [x] Scaffold TypeScript API (packages/api/src/app.ts, packages/api/src/server.ts)
- [x] Archive legacy entrypoint -> packages/api/src/index.legacy.ts
- [x] Add Dockerfiles and update infra builds
- [x] Add CI workflow (.github/workflows/ci.yml)
- [x] Add basic integration test (packages/api/test/health.test.ts)
- [ ] Remove/archive remaining legacy runtime files
- [ ] Serve OpenAPI (Swagger UI) and finalize API contract
- [ ] Add more integration tests (uploads, mappings, summary)
- [ ] Add migrations runner / move SQL to infra/migrations
- [ ] Polish package.json and docs
