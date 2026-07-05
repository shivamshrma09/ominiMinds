-- Add scheduled_meetings table for tracking next meetings
CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  meeting_title VARCHAR(255),
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add MoM and discussion points to meetings
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS mom_detailed TEXT,
ADD COLUMN IF NOT EXISTS discussion_points JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS next_steps JSONB DEFAULT '[]';

-- User engagement tracking table
CREATE TABLE IF NOT EXISTS user_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  total_meetings INTEGER DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  last_active_at TIMESTAMP DEFAULT NOW(),
  meetings_this_month INTEGER DEFAULT 0,
  clients_healthy INTEGER DEFAULT 0,
  clients_at_risk INTEGER DEFAULT 0,
  clients_critical INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_user_id ON scheduled_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_client_id ON scheduled_meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_scheduled_at ON scheduled_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement(user_id);
