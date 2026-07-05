-- Migration: add cognee related env placeholders and client fields

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS project_rating INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_sentiment VARCHAR(20),
  ADD COLUMN IF NOT EXISTS health_reasons JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS health_alerts JSONB DEFAULT '[]';

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
