import { logger } from '../../utils/logger';
import { Router, Request, Response } from 'express';
import { getGmailAuthUrl, saveGmailTokens } from '../../services/gmail';
import { authMiddleware, AuthRequest } from '../../middleware/auth';

const router = Router();

// GET /api/gmail/connect  — redirect user to Google OAuth
router.get('/connect', authMiddleware, (req: AuthRequest, res: Response) => {
  const url = getGmailAuthUrl(req.userId as string);
  return res.json({ url });
});

// GET /api/gmail/callback  — Google redirects here
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state: userId } = req.query;
  if (!code || !userId) return res.status(400).send('Missing code or state');
  try {
    await saveGmailTokens(userId as string, code as string);
    // Redirect to frontend
    return res.redirect('http://localhost:5173/settings?gmail=connected');
  } catch (err) {
    logger.error(err);
    return res.redirect('http://localhost:5173/settings?gmail=error');
  }
});

// GET /api/gmail/status
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { pool } = await import('../../config/db');
  const result = await pool.query(
    `SELECT id FROM user_integrations WHERE user_id=$1 AND provider='gmail'`,
    [req.userId]
  );
  return res.json({ connected: result.rows.length > 0 });
});

export default router;
