import { logger } from '../../utils/logger';
import { Router, Response } from 'express';
import { pool } from '../../config/db';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { generateMeetingSummary, generateActionItems, generateDetailedMoM, generateDiscussionPoints } from '../../services/gemini';
import { sendMeetingSummaryEmail } from '../../services/email';
import * as cognee from '../../services/cognee';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

const router = Router();
router.use(authMiddleware);

const querySchema = z.object({
  body: z.object({
    clientId: z.string().optional(),
    client_id: z.string().optional(),
    query: z.string().min(1, 'Query is required'),
  }).refine((data: any) => data.clientId || data.client_id, {
    message: 'Client ID is required',
    path: ['clientId'],
  }),
});

const meetingCreateSchema = z.object({
  body: z.object({
    client_id: z.string().optional(),
    clientId: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    transcript: z.string().optional(),
    // duration is intentionally excluded — FormData sends strings, parsed manually in handler
  }).refine((data: any) => data.clientId || data.client_id, {
    message: 'Client ID is required',
    path: ['clientId'],
  }),
});

// ── Static routes MUST come before /:id ──────────────────────────────────────

// POST /api/meetings/query
router.post('/query', validate(querySchema), async (req: AuthRequest, res: Response) => {
  const { clientId, client_id, query } = req.body;
  const cId = clientId || client_id;

  try {
    const cogneeResult = await cognee.recall(query, cId, 5);
    const cogneeContext = Array.isArray(cogneeResult?.results)
      ? cogneeResult.results.map((r: any) => r.content || r.text || '').filter(Boolean).join('\n')
      : '';

    const pgRes = await pool.query(
      'SELECT transcript, summary FROM meetings WHERE user_id=$1 AND client_id=$2 ORDER BY created_at DESC LIMIT 5',
      [req.userId, cId]
    );
    const pgContext = pgRes.rows.map(m => m.summary || m.transcript).filter(Boolean).join('\n');

    const context = cogneeContext || pgContext;
    if (!context)
      return res.json({ answer: 'No previous meeting records found for this client.' });

    const answer = await generateMeetingSummary(
      `Based on this context, answer the question concisely:\n\nQuestion: ${query}\n\nContext: ${context}`
    );
    return res.json({ answer });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/meetings/scheduled/list
router.get('/scheduled/list', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT sm.*, c.name as client_name
       FROM scheduled_meetings sm
       JOIN clients c ON sm.client_id = c.id
       WHERE sm.user_id = $1
       ORDER BY sm.scheduled_at DESC`,
      [req.userId]
    );
    return res.json(result.rows);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── Collection routes ─────────────────────────────────────────────────────────

// GET /api/meetings
router.get('/', async (req: AuthRequest, res: Response) => {
  const { clientId, client_id } = req.query;
  const cId = clientId || client_id;
  try {
    const result = await pool.query(
      'SELECT * FROM meetings WHERE user_id = $1 AND ($2::uuid IS NULL OR client_id = $2) ORDER BY created_at DESC',
      [req.userId, cId || null]
    );
    return res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching meetings:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/meetings
router.post('/', validate(meetingCreateSchema), async (req: AuthRequest, res: Response) => {
  const { client_id, clientId, title, transcript } = req.body;
  // FormData sends everything as strings — parse duration manually
  const duration = req.body.duration !== undefined ? parseInt(req.body.duration, 10) || 0 : 0;
  const cId = clientId || client_id;
  const audioFile = (req as any).files?.audio;

  try {
    const result = await pool.query(
      'INSERT INTO meetings (user_id, client_id, title, transcript, duration, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, cId, title, transcript || '', duration || 0, 'processing']
    );
    const meeting = result.rows[0];

    if (audioFile) {
      const uploadsDir = path.join(process.cwd(), 'services/uploads/meetings');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const audioPath = path.join(uploadsDir, `${meeting.id}.wav`);
      audioFile.mv(audioPath);
      await pool.query('UPDATE meetings SET audio_path=$1 WHERE id=$2', [audioPath, meeting.id]);
    }

    processMeetingAsync(meeting.id, cId, String(req.userId), transcript || '').catch(logger.error);

    return res.status(201).json(meeting);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── Param routes ──────────────────────────────────────────────────────────────

// GET /api/meetings/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Meeting not found' });
    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/meetings/:id/end
router.patch('/:id/end', async (req: AuthRequest, res: Response) => {
  const { transcript, summary, action_items } = req.body;
  try {
    const result = await pool.query(
      'UPDATE meetings SET status=$1, transcript=$2, summary=$3, action_items=$4, ended_at=NOW(), updated_at=NOW() WHERE id=$5 AND user_id=$6 RETURNING *',
      ['completed', transcript, summary, JSON.stringify(action_items || []), req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Meeting not found' });
    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/meetings/:id/schedule-next
router.post('/:id/schedule-next', async (req: AuthRequest, res: Response) => {
  const { clientId, scheduledAt, title, notes } = req.body;

  if (!clientId || !scheduledAt)
    return res.status(400).json({ message: 'clientId and scheduledAt required' });

  try {
    const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];

    const clientResult = await pool.query('SELECT name FROM clients WHERE id = $1', [clientId]);
    const client = clientResult.rows[0];

    if (!user || !client)
      return res.status(404).json({ message: 'User or client not found' });

    const result = await pool.query(
      'INSERT INTO scheduled_meetings (user_id, client_id, scheduled_at, meeting_title, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, clientId, new Date(scheduledAt), title || `Meeting with ${client.name}`, notes || '']
    );

    return res.status(201).json({
      ...result.rows[0],
      user_email: user.email,
      user_name: user.name,
      client_name: client.name,
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/meetings/:id/send-summary
router.post('/:id/send-summary', async (req: AuthRequest, res: Response) => {
  try {
    const meetingResult = await pool.query(
      `SELECT m.*, u.email, u.name, c.name as client_name
       FROM meetings m
       JOIN users u ON m.user_id = u.id
       JOIN clients c ON m.client_id = c.id
       WHERE m.id = $1 AND m.user_id = $2`,
      [req.params.id, req.userId]
    );

    const meeting = meetingResult.rows[0];
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    let actionItems: any[] = [];
    try { actionItems = JSON.parse(meeting.action_items) || []; } catch { actionItems = []; }

    const nextSteps = actionItems.map((item: any) => `${item.task} (${item.priority} priority)`);

    await sendMeetingSummaryEmail({
      userEmail: meeting.email,
      userName: meeting.name,
      clientName: meeting.client_name,
      momSummary: meeting.mom_detailed || meeting.summary || 'No summary available',
      actionItems,
      nextSteps: nextSteps.length > 0 ? nextSteps : ['Review meeting notes', 'Follow up with client'],
    });

    return res.json({ message: 'Summary email sent successfully' });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── Background processing ─────────────────────────────────────────────────────

async function processMeetingAsync(meetingId: string, clientId: string, userId: string, transcript: string) {
  try {
    if (!transcript) return;

    const [momDetailed, summary, actionItems] = await Promise.all([
      generateDetailedMoM(transcript, 'Client'),
      generateMeetingSummary(transcript),
      generateActionItems(transcript),
    ]);

    const previousMeetings = await pool.query(
      'SELECT transcript FROM meetings WHERE client_id = $1 AND id != $2 ORDER BY created_at DESC LIMIT 3',
      [clientId, meetingId]
    );
    const prevTranscripts = previousMeetings.rows.map(m => m.transcript).filter(Boolean);
    const discussionPoints = await generateDiscussionPoints(prevTranscripts);

    await pool.query(
      'UPDATE meetings SET summary=$1, action_items=$2, mom_detailed=$3, discussion_points=$4, status=$5, updated_at=NOW() WHERE id=$6',
      [summary, JSON.stringify(actionItems), momDetailed, JSON.stringify(discussionPoints), 'processed', meetingId]
    );

    // Save action items to tasks table
    for (const item of actionItems) {
      await pool.query(
        `INSERT INTO tasks (id, client_id, user_id, task, priority, source, status)
         VALUES ($1, $2, $3, $4, $5, 'meeting', 'pending')
         ON CONFLICT DO NOTHING`,
        [uuidv4(), clientId, userId, item.task, item.priority || 'medium']
      );
    }

    // Store in Cognee - namespace scoped to clientId
    const memoryContent = [
      `Meeting ID: ${meetingId}`,
      `Summary: ${summary}`,
      `Minutes of Meeting: ${momDetailed}`,
      `Transcript: ${transcript}`,
      `Action Items: ${actionItems.map((a: any) => `${a.task} (${a.priority})`).join(', ')}`,
      `Discussion Points: ${discussionPoints.join(', ')}`,
    ].join('\n');

    await cognee.remember(
      memoryContent,
      { meetingId, clientId, userId, source: 'meeting' },
      clientId
    ).catch(err => logger.error('Cognee remember error:', err));

    logger.info(`Meeting ${meetingId} processed and stored in Cognee`);
  } catch (err) {
    logger.error(`Error processing meeting ${meetingId}:`, err);
    await pool.query('UPDATE meetings SET status=$1 WHERE id=$2', ['failed', meetingId]);
  }
}

export default router;
