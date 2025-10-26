# packages/worker TODO — Align with AGENT/TODO.md

Purpose
- Provide background processing for the demo MVP:
  - process uploaded evidence from S3/MinIO
  - extract text (OCR/NLP) and compute checksum
  - create evidence -> control mapping suggestions (scaffold)
  - persist processed metadata to Postgres or JSONL fallback
  - publish simple events/results the demo-runner or API can consume

Quick checklist
- [x] Create this TODO file
- [ ] Add inline TODO comments in `packages/worker/src/index.ts` for:
  - evidence download + checksum verification
  - text extraction hook (OCR / plain-text / PDF)
  - NLP extraction + simple rule-based control suggestion
  - persist extracted_text and status back to API DB/JSONL
  - idempotency for retries (use evidence id + checksum)
- [ ] Implement a small CLI / worker loop that:
  - polls for unprocessed evidence (DB or JSONL)
  - processes one item, updates status, logs results
  - exposes a dry-run mode for demo-runner
- [ ] Add unit / integration tests for idempotency and basic parsing
- [ ] Document worker env vars and how to run locally (in infra/TODO.md)
- [ ] Wire worker to infra/demo-runner smoke flow (upload -> worker -> API summary)

Notes
- Keep processing logic simple for MVP: rule-based suggestions (keyword matching) rather than heavy ML.
- Make sure worker updates metadata fields used by API summarization: status, checksum, extracted_text, indexed_at.
- See `packages/api/TODO.md` and `AGENT/TODO.md` for mapping and summarization expectations.
