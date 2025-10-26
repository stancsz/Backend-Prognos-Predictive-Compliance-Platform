# packages/web TODO — Align with AGENT/TODO.md

Purpose
- Create a tiny, demo-focused frontend that exposes the MVP flows:
  - login/dev token entry
  - upload evidence (uses API /uploads presigned URL)
  - map uploaded evidence to controls (GET /frameworks, POST /mappings)
  - simple dashboard (GET /projects/:id/summary)

Quick checklist
- [x] Create this TODO file
- [ ] Minimal routes/pages:
  - [ ] /login (dev token / email)
  - [ ] /upload (form: filename, projectId, contentType; calls API -> presigned URL -> PUT)
  - [ ] /mapping (list controls for framework; allow selecting evidence -> create mapping)
  - [ ] /dashboard (show counts: uploaded, mapped, compliance status)
- [ ] Simple, dependency-free UI (vanilla HTML/JS or minimal Vite app)
- [ ] Wire to infra/demo-runner example data for smoke demo
- [ ] Add README snippet with dev run instructions and expected API env variables
- [ ] Add automated smoke script (optional) to emulate user flows for demo-runner

Notes
- Keep UI minimal — wireframes only to demonstrate core user journey.
- Use packages/api endpoints added by the API TODO for integration.
