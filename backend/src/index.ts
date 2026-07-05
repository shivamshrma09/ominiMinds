import dotenv from 'dotenv';
dotenv.config();

import './config/env'; // Validate env vars on startup
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';
import { globalLimiter } from './middleware/rateLimiter';
import { connectDB } from './config/db';
import { initScheduler } from './services/scheduler';
import authRoutes      from './api/routes/auth';
import clientRoutes    from './api/routes/clients';
import meetingRoutes   from './api/routes/meetings';
import analyticsRoutes from './api/routes/analytics';
import gmailRoutes     from './api/routes/gmail';
import whatsappRoutes  from './api/routes/whatsapp';
import documentRoutes  from './api/routes/documents';
import recallRoutes    from './api/routes/recall';
import agentRoutes     from './api/routes/agent';

const app = express();

app.use(pinoHttp({ logger }));
app.use(globalLimiter);
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
    if (!origin || allowed.includes(origin) || allowed.includes('*')) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('/{*path}', cors());
app.use(express.json());
app.use(fileUpload());

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'OmniMind API' }));

app.use('/api/auth',      authRoutes);
app.use('/api/clients',   clientRoutes);
app.use('/api/meetings',  meetingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gmail',     gmailRoutes);
app.use('/api/whatsapp',  whatsappRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/recall',    recallRoutes);
app.use('/api/agent',     agentRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  initScheduler();
  app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
});

