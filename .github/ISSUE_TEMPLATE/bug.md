---
name: Bug
about: Report a bug or regression
labels: bug
---

### Summary
- Short description of the bug.

### Steps to reproduce
1. Environment (local/CI): 
2. Commands or actions to reproduce:
3. Expected result:
4. Actual result:

### Environment
- OS:
- Node/npm version:
- Docker / Docker Compose version (if relevant):
- Any relevant env vars (redact secrets):

### Severity
- P0 / blocker: prevents CI or demo from running
- P1 / high: core flow broken (presign → upload → ingest → index)
- P2 / medium: non-critical functionality
- P3 / low: minor or cosmetic

### Logs / Attachments
- Include relevant log snippets, stack traces, and CI job links.

### Proposed fix (optional)
- Short suggestion for how to fix.

### Acceptance criteria
- [ ] Repro steps produce expected result
- [ ] Added test(s) that validate the fix (unit/integration/E2E)
- [ ] Runbook/notes updated if operational steps changed

### Notes
- If the bug appears flaky, include CI run IDs and frequency observed.
