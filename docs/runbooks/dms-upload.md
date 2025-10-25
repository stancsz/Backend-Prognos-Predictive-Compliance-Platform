# DMS Upload Runbook

Purpose
- Describe the presigned upload workflow, testing steps, and acceptance criteria.

Endpoints
- POST /uploads
  Request body: { "filename": "evidence.pdf", "projectId": "proj_123", "contentType": "application/pdf" }
  Response: { "uploadId", "url", "objectKey" }

Developer steps (local)
1. Set environment variables:
   - AWS_ENDPOINT (optional for MinIO)
   - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (for real S3 or MinIO dev)
   - S3_BUCKET (bucket name or MinIO bucket)
2. Start API:
   - cd packages/api && npm install && npm run start
3. Create an upload:
   - curl -X POST http://localhost:4000/uploads -H "Content-Type: application/json" -d '{"filename":"test.pdf","projectId":"demo","contentType":"application/pdf"}'
4. Use the returned 'url' to PUT the actual file:
   - curl -X PUT "<url>" -T test.pdf -H "Content-Type: application/pdf"
5. Verify metadata was appended to packages/api/data/evidence.jsonl

Acceptance Criteria
- POST /uploads returns a presigned URL and uploadId (200).
- Metadata entry is appended to evidence.jsonl with status "uploaded_pending".
- Worker (separate feature) will later process uploaded object and update status/checksum.

Notes
- This initial implementation persists metadata in a local append-only file. Replace with Postgres for production (schema provided in docs/ERD.md).
- Ensure no raw PII is sent to external ML providers without opt-in consent.
