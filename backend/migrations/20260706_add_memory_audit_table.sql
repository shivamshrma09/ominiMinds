-- Migration: add memory_audit table to track ingested items and Cognee dataset IDs

CREATE TABLE IF NOT EXISTS memory_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,
  source_id TEXT,
  vector_id TEXT NOT NULL,
  cognee_dataset_id TEXT,
  content_hash VARCHAR(128) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_audit_client_hash ON memory_audit(client_id, content_hash);
