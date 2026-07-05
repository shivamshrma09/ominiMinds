import { logger } from '../utils/logger';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Zod schema to validate environment variables
 */
const envSchema = z.object({
  PORT: z.string().optional().default('5000'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  COGNEE_API_KEY: z.string().min(1, 'COGNEE_API_KEY is required'),
  COGNEE_TENANT_ID: z.string().optional(),
  COGNEE_USER_ID: z.string().optional(),
  COGNEE_API_BASE: z.string().url().optional(),
  CORS_ORIGIN: z.string().url().optional().default('http://localhost:5173'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  logger.error('❌ Invalid environment variables:\n', _env.error.format());
  process.exit(1);
}

/**
 * Validated environment variables
 */
export const env = _env.data;
