import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

const createTables = async () => {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      tokens JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, provider)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      company VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(20),
      notes TEXT,
      integrations JSONB DEFAULT '{}',
      health_score INTEGER DEFAULT 100,
      health_reasons JSONB DEFAULT '[]',
      health_alerts JSONB DEFAULT '[]',
      last_sentiment VARCHAR(20) DEFAULT 'neutral',
      last_synced_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      transcript TEXT,
      summary TEXT,
      action_items JSONB DEFAULT '[]',
      mom_detailed TEXT,
      discussion_points JSONB DEFAULT '[]',
      duration INTEGER DEFAULT 0,
      audio_path TEXT,
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scheduled_meetings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      scheduled_at TIMESTAMP NOT NULL,
      meeting_title VARCHAR(255),
      notes TEXT,
      reminder_sent BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id VARCHAR(255) PRIMARY KEY,
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      from_number VARCHAR(30),
      message TEXT,
      timestamp TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS client_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      file_name VARCHAR(255),
      file_path TEXT,
      summary TEXT,
      key_facts JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      task TEXT NOT NULL,
      priority VARCHAR(10) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      source VARCHAR(50) DEFAULT 'manual',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS client_memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      source VARCHAR(50),
      content TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS memory_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      source VARCHAR(50),
      source_id TEXT,
      vector_id TEXT,
      cognee_dataset_id TEXT,
      content_hash TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE meetings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0;
    ALTER TABLE meetings ADD COLUMN IF NOT EXISTS audio_path TEXT;
    ALTER TABLE meetings ADD COLUMN IF NOT EXISTS mom_detailed TEXT;
    ALTER TABLE meetings ADD COLUMN IF NOT EXISTS discussion_points JSONB DEFAULT '[]';
  `);
};

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    client.release();
    await createTables();
    logger.info('PostgreSQL connected & tables ready');
  } catch (err) {
    logger.error('DB connection failed:', err);
    process.exit(1);
  }
};
