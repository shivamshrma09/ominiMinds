import { logger } from '../../utils/logger';
import { Router, Response } from 'express';
import { pool } from '../../config/db';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { generateInsights } from '../../services/gemini';

const router = Router();
router.use(authMiddleware);

// GET /api/analytics/overview
router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const clientsRes = await pool.query(
      'SELECT * FROM clients WHERE user_id=$1 ORDER BY health_score ASC',
      [req.userId]
    );
    const clients = clientsRes.rows;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [meetingsRes, tasksRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM meetings WHERE user_id=$1 AND created_at >= $2', [req.userId, monthStart]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE user_id=$1 AND status='pending'", [req.userId]),
    ]);

    const avgScore = clients.length
      ? Math.round(clients.reduce((s, c) => s + (c.health_score || 100), 0) / clients.length)
      : 0;

    const atRisk   = clients.filter(c => c.health_score < 75 && c.health_score >= 50);
    const critical = clients.filter(c => c.health_score < 50);
    const allAlerts = clients.flatMap(c =>
      (c.health_alerts || []).map((a: string) => ({ client: c.name, alert: a }))
    );

    return res.json({
      avgHealthScore:  avgScore,
      totalClients:    clients.length,
      activeThisMonth: parseInt(meetingsRes.rows[0].count),
      pendingTasks:    parseInt(tasksRes.rows[0].count),
      atRiskCount:     atRisk.length,
      criticalCount:   critical.length,
      riskAlerts:      allAlerts.slice(0, 5),
      clientScores:    clients.map(c => ({
        id: c.id, name: c.name, score: c.health_score,
        sentiment: c.last_sentiment, reasons: c.health_reasons || [],
      })),
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/insights — AI generated
router.get('/insights', async (req: AuthRequest, res: Response) => {
  try {
    const clientsRes = await pool.query('SELECT * FROM clients WHERE user_id=$1', [req.userId]);
    const insights = await generateInsights(clientsRes.rows);
    return res.json(insights);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/sentiment — client sentiment breakdown
router.get('/sentiment', async (req: AuthRequest, res: Response) => {
  try {
    const res_ = await pool.query(
      `SELECT last_sentiment, COUNT(*) as count
       FROM clients WHERE user_id=$1
       GROUP BY last_sentiment`,
      [req.userId]
    );
    const map: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    res_.rows.forEach(r => { map[r.last_sentiment] = parseInt(r.count); });
    return res.json(map);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/tasks — task completion stats
router.get('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const res_ = await pool.query(
      `SELECT status, COUNT(*) as count FROM tasks WHERE user_id=$1 GROUP BY status`,
      [req.userId]
    );
    const map: Record<string, number> = { pending: 0, completed: 0 };
    res_.rows.forEach(r => { map[r.status] = parseInt(r.count); });

    const total = map.pending + map.completed;
    return res.json({
      pending: map.pending,
      completed: map.completed,
      total,
      completionRate: total > 0 ? Math.round((map.completed / total) * 100) : 0,
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/memory-sources — memory audit source breakdown
router.get('/memory-sources', async (req: AuthRequest, res: Response) => {
  try {
    const res_ = await pool.query(
      `SELECT source, COUNT(*) as count
       FROM memory_audit WHERE user_id=$1
       GROUP BY source ORDER BY count DESC`,
      [req.userId]
    );
    return res.json(res_.rows.map(r => ({ source: r.source, count: parseInt(r.count) })));
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/meeting-activity — meetings per month (last 6 months)
router.get('/meeting-activity', async (req: AuthRequest, res: Response) => {
  try {
    const res_ = await pool.query(
      `SELECT TO_CHAR(created_at, 'Mon YY') as month,
              DATE_TRUNC('month', created_at) as month_start,
              COUNT(*) as count
       FROM meetings
       WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY month, month_start
       ORDER BY month_start ASC`,
      [req.userId]
    );
    return res.json(res_.rows.map(r => ({ month: r.month, count: parseInt(r.count) })));
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/top-clients — top 5 clients by meeting count
router.get('/top-clients', async (req: AuthRequest, res: Response) => {
  try {
    const res_ = await pool.query(
      `SELECT c.id, c.name, c.company, c.health_score, c.last_sentiment,
              COUNT(m.id) as meeting_count
       FROM clients c
       LEFT JOIN meetings m ON m.client_id = c.id
       WHERE c.user_id=$1
       GROUP BY c.id
       ORDER BY meeting_count DESC
       LIMIT 5`,
      [req.userId]
    );
    return res.json(res_.rows.map(r => ({ ...r, meeting_count: parseInt(r.meeting_count) })));
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/upcoming-meetings — next 7 days scheduled meetings
router.get('/upcoming-meetings', async (req: AuthRequest, res: Response) => {
  try {
    const res_ = await pool.query(
      `SELECT sm.*, c.name as client_name
       FROM scheduled_meetings sm
       JOIN clients c ON sm.client_id = c.id
       WHERE sm.user_id=$1
         AND sm.scheduled_at >= NOW()
         AND sm.scheduled_at <= NOW() + INTERVAL '7 days'
       ORDER BY sm.scheduled_at ASC`,
      [req.userId]
    );
    return res.json(res_.rows);
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
