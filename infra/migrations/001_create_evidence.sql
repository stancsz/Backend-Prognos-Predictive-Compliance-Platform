-- Migration: 001_create_evidence.sql
-- Purpose: Create evidence table for ingestion metadata (Postgres)
BEGIN;

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  filename TEXT,
  object_key TEXT NOT NULL,
  bucket TEXT,
  content_type TEXT,
  uploader TEXT,
  status TEXT,
  checksum TEXT,
  extracted_text TEXT,
  indexed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes to support common queries (by project, status, and recent indexing)
CREATE INDEX IF NOT EXISTS idx_evidence_project_id ON evidence (project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence (status);
CREATE INDEX IF NOT EXISTS idx_evidence_indexed_at ON evidence (indexed_at);

COMMIT;
