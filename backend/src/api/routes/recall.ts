import { logger } from '../../utils/logger';
import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import * as cognee from '../../services/cognee';

const router = Router();
router.use(authMiddleware);

// POST /api/recall
// body: { query: string, clientId?: string }
router.post('/', async (req: AuthRequest, res: Response) => {
  const { query, clientId } = req.body;
  if (!query) return res.status(400).json({ message: 'Query required' });

  try {
    const result = await cognee.recall(query, clientId || req.userId);
    return res.json(result);
  } catch (err) {
    logger.error('recall route error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
