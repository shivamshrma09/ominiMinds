import { logger } from '../../utils/logger';
import { Router, Response } from 'express';
import { pool } from '../../config/db';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { processClientSources } from '../../services/memoryProcessor';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

const router = Router();
router.use(authMiddleware);

const clientSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Client name is required'),
    company: z.string().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    notes: z.string().optional(),
    integrations: z.any().optional(),
  }),
});

// GET /api/clients
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients WHERE user_id=$1 ORDER BY created_at DESC',
      [req.userId]
    );
    return res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching clients:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/clients
router.post('/', validate(clientSchema), async (req: AuthRequest, res: Response) => {
  const { name, company, email, phone, notes, integrations } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO clients (user_id, name, company, email, phone, notes, integrations) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.userId, name, company, email, phone, notes, JSON.stringify(integrations || {})]
    );
    const client = result.rows[0];

    // Trigger background AI sync (non-blocking)
    processClientSources(String(client.id), req.userId as string).catch(logger.error);

    return res.status(201).json(client);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients WHERE id=$1 AND user_id=$2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Client not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error fetching client:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/clients/:id
router.put('/:id', validate(clientSchema), async (req: AuthRequest, res: Response) => {
  const { name, company, email, phone, notes, integrations } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clients SET name=$1, company=$2, email=$3, phone=$4, notes=$5, integrations=$6, updated_at=NOW() WHERE id=$7 AND user_id=$8 RETURNING *',
      [name, company, email, phone, notes, JSON.stringify(integrations || {}), req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Client not found' });
    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM clients WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    return res.json({ message: 'Client deleted' });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/clients/:id/sync  — manual re-sync
router.post('/:id/sync', async (req: AuthRequest, res: Response) => {
  try {
    processClientSources(String(req.params.id), req.userId as string).catch(logger.error);
    return res.json({ message: 'Sync started' });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/clients/:id/tasks
router.get('/:id/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tasks WHERE client_id=$1 AND user_id=$2 ORDER BY
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at DESC`,
      [req.params.id, req.userId]
    );
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/clients/:id/tasks/:taskId
router.patch('/:id/tasks/:taskId', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *`,
      [status, req.params.taskId, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Task not found' });
    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/clients/:id/pre-meeting-brief
router.get('/:id/pre-meeting-brief', async (req: AuthRequest, res: Response) => {
  try {
    const { generateMeetingSummary } = await import('../../services/gemini');

    const [clientRes, lastMeetingRes, tasksRes, scheduledRes] = await Promise.all([
      pool.query('SELECT * FROM clients WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]),
      pool.query('SELECT title, summary, action_items, created_at FROM meetings WHERE client_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1', [req.params.id, req.userId]),
      pool.query("SELECT task, priority FROM tasks WHERE client_id=$1 AND user_id=$2 AND status='pending' ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END LIMIT 5", [req.params.id, req.userId]),
      pool.query('SELECT scheduled_at, meeting_title FROM scheduled_meetings WHERE client_id=$1 AND user_id=$2 AND scheduled_at >= NOW() ORDER BY scheduled_at ASC LIMIT 1', [req.params.id, req.userId]),
    ]);

    const client = clientRes.rows[0];
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const lastMeeting = lastMeetingRes.rows[0];
    const pendingTasks = tasksRes.rows;
    const nextMeeting = scheduledRes.rows[0];

    let actionItems: any[] = [];
    if (lastMeeting?.action_items) {
      try { actionItems = JSON.parse(lastMeeting.action_items) || []; } catch { actionItems = []; }
    }

    const prompt = `You are OmniMind AI. Generate a concise pre-meeting brief for an account manager about to meet client "${client.name}".

Client: ${client.name}${client.company ? ` (${client.company})` : ''}
Health Score: ${client.health_score}%
Sentiment: ${client.last_sentiment || 'neutral'}
${lastMeeting ? `Last Meeting: "${lastMeeting.title}" on ${new Date(lastMeeting.created_at).toLocaleDateString('en-IN')}
Last Summary: ${lastMeeting.summary || 'N/A'}` : 'No previous meetings.'}
${pendingTasks.length ? `Open Action Items: ${pendingTasks.map((t: any) => `${t.task} (${t.priority})`).join(', ')}` : 'No pending tasks.'}
${nextMeeting ? `Next Scheduled: ${new Date(nextMeeting.scheduled_at).toLocaleDateString('en-IN')} — ${nextMeeting.meeting_title}` : ''}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence context summary",
  "suggestions": ["3 specific talking points or suggestions for this meeting"],
  "risks": ["1-2 risks or things to be careful about"],
  "openItems": ["pending action items to follow up on"]
}`;

    const briefText = await generateMeetingSummary(prompt);
    let brief: any;
    try {
      brief = JSON.parse(briefText.replace(/```json|```/g, '').trim());
    } catch {
      brief = { summary: briefText, suggestions: [], risks: [], openItems: [] };
    }

    return res.json({
      ...brief,
      clientName: client.name,
      healthScore: client.health_score,
      sentiment: client.last_sentiment,
      lastMeeting: lastMeeting ? { title: lastMeeting.title, date: lastMeeting.created_at } : null,
      nextMeeting: nextMeeting || null,
      pendingTasksCount: pendingTasks.length,
    });
  } catch (err) {
    logger.error('pre-meeting-brief error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/clients/:id/timeline
router.get('/:id/timeline', async (req: AuthRequest, res: Response) => {
  try {
    const [meetingsRes, tasksRes, docsRes, memoryRes] = await Promise.all([
      pool.query('SELECT id, title, summary, status, created_at FROM meetings WHERE client_id=$1 AND user_id=$2 ORDER BY created_at DESC', [req.params.id, req.userId]),
      pool.query('SELECT id, task, priority, status, source, created_at FROM tasks WHERE client_id=$1 AND user_id=$2 ORDER BY created_at DESC', [req.params.id, req.userId]),
      pool.query('SELECT id, file_name, summary, created_at FROM client_documents WHERE client_id=$1 AND user_id=$2 ORDER BY created_at DESC', [req.params.id, req.userId]),
      pool.query("SELECT id, source, created_at FROM memory_audit WHERE client_id=$1 AND user_id=$2 AND source NOT IN ('ai_extracted') ORDER BY created_at DESC LIMIT 20", [req.params.id, req.userId]),
    ]);

    const events: any[] = [
      ...meetingsRes.rows.map(m => ({ type: 'meeting', id: m.id, title: m.title, subtitle: m.summary?.slice(0, 80) || '', status: m.status, date: m.created_at })),
      ...tasksRes.rows.map(t => ({ type: 'task', id: t.id, title: t.task, subtitle: `${t.priority} priority · ${t.source}`, status: t.status, date: t.created_at })),
      ...docsRes.rows.map(d => ({ type: 'document', id: d.id, title: d.file_name, subtitle: d.summary?.slice(0, 80) || '', date: d.created_at })),
      ...memoryRes.rows.map(r => ({ type: 'memory', id: r.id, title: `${r.source} sync`, subtitle: `Data synced from ${r.source}`, date: r.created_at })),
    ];

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json(events);
  } catch (err) {
    logger.error('timeline error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
