# Prognos — Backend (Predictive Compliance Platform)

Status: WIP — Backend rebuild in progress

This repository is intended to host the backend for the Frontend-Prognos application (see the `Frontend-Prognos-Predictive-Compliance-Platform/` folder). The current backend needs a full clean-up and rebuild to provide a stable, well-documented scaffold for frontend integration and future development.

## Goals
- Remove/clean legacy and experimental code.
- Scaffold a clean, well-documented backend API surface for the frontend.
- Provide a reproducible local/dev environment (Docker + compose).
- Add an OpenAPI/Swagger contract to drive frontend integration.
- Implement CI basics, tests, and developer guidance.

## Proposed tech stack (suggested)
- Language: TypeScript (Node.js)
- Web framework: Express / Fastify (TypeScript-first)
- Database: PostgreSQL (migrations via Knex/TypeORM/Prisma)
- Object store: MinIO (s3-compatible) — already used in infra
- Queue/worker: Redis / Bull or existing worker package
- Containerization: Docker + docker-compose (infra/)
- Testing: Jest / Supertest (API E2E)
- API spec: OpenAPI 3.0 (yaml) at packages/api/openapi.yaml

## Repository layout (current)
- packages/api — API implementation (TypeScript)
- packages/worker — background job code
- packages/web — example frontend (legacy)
- infra — docker compose, Dockerfiles, infra scripts
- Frontend-Prognos-Predictive-Compliance-Platform — actual frontend app
- docs — architecture notes, ERD, backlog, etc.

## Immediate next steps (scaffold & cleanup)
1. Audit and remove legacy files that won't be part of the new backend.
2. Define API surface via OpenAPI and store spec in `packages/api/`.
3. Create a minimal TypeScript backend scaffold (routes, auth stub, healthcheck, docs).
4. Add docker-compose service for the API (connected to infra/docker-compose.yml).
5. Wire CI to run lint, typecheck, and tests.
6. Add README sections inside `packages/api/` describing local dev steps and API endpoints.

## Getting started (developer)
1. Review infra/docker-compose.yml — it contains the database and MinIO services.
2. Add/maintain an OpenAPI spec at `packages/api/openapi.yaml`.
3. Create a minimal server in `packages/api/src/`:
   - health endpoint: `GET /health`
   - API root: `GET /api` (serves OpenAPI UI)
   - auth stub and example endpoints to match frontend needs.
4. Provide a local start: `docker-compose up` (api, db, minio) and `npm run dev` for local hot-reload (to be implemented in packages/api).

Example (once scaffolded):
```bash
# from repo root
cd packages/api
npm install
npm run dev
# or
docker-compose -f infra/docker-compose.yml up --build
```

## Frontend integration
- The frontend lives in `Frontend-Prognos-Predictive-Compliance-Platform/`. Use the OpenAPI spec to generate client types or mock servers for the frontend.
- Keep the API contract stable: changes to the spec must be reviewed and versioned.

## Docs & artifacts
- Keep architecture and decisions in `docs/` (ERD, sequence diagrams, MVP checklists).
- Add migration scripts to `infra/migrations/` and document usage.

## Contribution & Ownership
- Use PRs for changes. Include issue/PR templates where appropriate.
- Maintain clear CHANGELOG and versioning for API changes.

## Roadmap / TODO
- [ ] Audit and remove legacy backend code
- [ ] Create `packages/api/openapi.yaml` (OpenAPI spec)
- [ ] Scaffold minimal TypeScript API (health, docs, example endpoints)
- [ ] Add docker-compose service for the API and document local run
- [ ] Add CI for lint, typecheck, tests
- [ ] Implement basic integration tests (packages/api/test/)
- [ ] Document developer onboarding and API contract
- [ ] Coordinate with frontend team to validate the scaffold

## Contacts
- Repo owner: see git history / committers
- For architecture decisions: maintainers listed in `docs/TECH_LEAD.md`

---

This README is intentionally concise — more detailed developer guides, API specs, and setup docs should be added under `packages/api/` and `docs/` as the rebuild proceeds.
