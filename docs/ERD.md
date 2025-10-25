# Phase 1 ERD (minimal)

Entities and key fields (Phase 1 MVP)

- Organization
  - id (UUID)
  - name
  - plan_tier
  - created_at
  - anonymization_opt_in (bool)

- User
  - id (UUID)
  - org_id (FK -> Organization)
  - email
  - name
  - role_id (FK -> Role)
  - last_login
  - created_at

- Role
  - id
  - name (e.g., admin, consultant, client)
  - permissions (json / normalized table)

- Project (Engagement)
  - id (UUID)
  - org_id (FK)
  - name
  - framework_id (FK -> Framework)
  - status (enum: draft, active, closed)
  - start_date, end_date
  - created_by
  - created_at

- Framework
  - id
  - name (e.g., SOC 2)
  - version
  - metadata (json)

- Control
  - id
  - framework_id (FK)
  - code (string)
  - title
  - description (text)
  - domain
  - control_version_id (FK)

- ControlVersion
  - id
  - control_id (FK)
  - effective_date
  - content (json/text)

- Evidence (Document)
  - id (UUID)
  - project_id (FK)
  - uploader_id (FK -> User)
  - object_key (S3 path)
  - filename
  - mime_type
  - size_bytes
  - checksum (sha256)
  - extracted_text (nullable)
  - indexed_at
  - uploaded_at

- Mapping (Evidence -> Control)
  - id (UUID)
  - evidence_id (FK)
  - control_id (FK)
  - suggested_by (enum: user, ai)
  - confidence (float)
  - status (enum: suggested, accepted, rejected)
  - confirmed_by (FK -> User nullable)
  - confirmed_at
  - created_at

- Finding / RemediationTask
  - id
  - project_id
  - title
  - description
  - owner_id
  - status (open, in_progress, closed)
  - due_date
  - created_at

- AuditTrail
  - id
  - actor_id (FK -> User)
  - target_type (enum)
  - target_id (UUID)
  - action (string)
  - payload (json)
  - timestamp

Notes:
- Use UUIDs for cross-service safety.
- Keep extracted_text column for quick prototyping; move to search index for production scale.
- Anonymization: add an AnonymizedAggregate table later for benchmarking outputs.
