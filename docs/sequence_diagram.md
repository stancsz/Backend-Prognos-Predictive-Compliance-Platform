# Sequence Diagram: Evidence ingestion → AI suggestion → Human confirm

Actors:
- Client (uploads evidence via Client Portal)
- Frontend
- Backend API (Upload controller)
- Object Store (S3)
- Message Queue (RabbitMQ)
- Worker (Text extraction & embedding)
- Search Index (OpenSearch)
- Vector DB (Pinecone/Milvus)
- Controls Service (Framework/Control DB)
- Consultant (reviews suggestions)

Flow (step-by-step):

1. Client uploads file via frontend -> POST /uploads -> Backend
2. Backend:
   - Creates Upload/Evidence record in Postgres with status "uploaded_pending"
   - Generates presigned S3 URL (or accepts direct upload) and returns to frontend
3. Frontend uploads file to S3 using presigned URL
4. Backend receives upload-complete callback or polls S3: marks Evidence as "uploaded"
5. Backend publishes "evidence_uploaded" event to Message Queue with evidenceId and metadata
6. Worker consumes event -> downloads object from S3
   - Runs OCR/text extraction
   - Produces extracted_text and metadata (dates, authorship hints)
   - Stores extracted_text in Search Index
   - Generates embeddings and stores vector in Vector DB
   - Updates Evidence record: extracted_text, indexed_at
   - Publishes "evidence_indexed" event
7. Recommendation Service:
   - Queries Vector DB using evidence vector against pre-vectorized controls
   - Returns top-N candidate controls with similarity scores
   - Persists Mapping suggestions (status = suggested) with suggested_by = ai
8. Consultant UI receives suggestions (WS or polling)
   - UI shows suggestion snippets, confidence, provenance (model id/version)
9. Consultant accepts/rejects suggestions:
   - Accept -> Mapping.status = accepted, confirmed_by set, AuditTrail entry created
   - Reject -> Mapping.status = rejected, AuditTrail entry created
10. Accepted mappings trigger downstream updates:
   - Update project posture/metrics
   - Optionally create Finding/RemediationTask if non-compliant

Security & audit notes:
- Correlation IDs propagated through all services.
- Log model_id/version and confidence for every AI suggestion.
- No raw PII sent to third-party models unless org has explicit opt-in and DPA.
- All mapping decisions are auditable and immutable in AuditTrail.

Notes on scalability:
- Workers scale horizontally; use queue depth to autoscale.
- Store only metadata and vectors for fast lookup; keep heavy extracted_text in search index.
