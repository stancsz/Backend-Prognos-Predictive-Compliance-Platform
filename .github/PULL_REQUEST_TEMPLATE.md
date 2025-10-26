### Summary
- Short description of what changed and why.

### Plan (one-line)
- Plan: _State the single most important thing this PR does and why it's the correct next step._

### Acceptance criteria
- List the measurable acceptance criteria this PR must satisfy (link tests, runbook steps, demo steps).

### Checklist (must pass before merge)
- [ ] Plan line present in PR description
- [ ] Tests added/updated (unit/integration/e2e) validating behavior
- [ ] Linter/formatting passes
- [ ] TypeScript typecheck passes
- [ ] Integration / E2E (presign → upload → ingest → index) passes locally or in CI
- [ ] DB migration added or migration strategy documented (if schema changed)
- [ ] Observability added (structured logs, basic metrics, traces) as applicable
- [ ] Health/readiness endpoints present for long-running services
- [ ] Demo/POC updated (if the change affects the demo flow)
- [ ] Docs/runbook updated (infra/README.md or docs/runbooks/*)
- [ ] Security review done for data exfiltration, secrets, third-party services

### Data / AI specific
- [ ] Does this send data to external models or services? If yes:
  - [ ] Confirm opt-in consent & data masking strategy
  - [ ] Document model id/version and retention policy
  - [ ] Provide a risk assessment in the PR description

### Notes
- Keep PRs small and focused (one P0 item per PR).
- State any manual verification steps required to reproduce the change locally (e.g., `bash infra/ci-run-e2e.sh`).
