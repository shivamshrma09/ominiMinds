import { logger } from '../../utils/logger';
import { Router, Request, Response } from 'express';
import { storeWhatsAppMessage } from '../../services/whatsapp';
import { processClientSources } from '../../services/memoryProcessor';

const router = Router();

// GET /api/whatsapp/webhook  — Meta verification
router.get('/webhook', (req: Request, res: Response) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// POST /api/whatsapp/webhook  — Incoming messages
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const result = await storeWhatsAppMessage(req.body);
    if (result?.clientId) {
      // Trigger re-sync in background
      processClientSources(result.clientId, result.userId).catch(logger.error);
    }
    return res.sendStatus(200);
  } catch (err) {
    logger.error('WhatsApp webhook error:', err);
    return res.sendStatus(200); // Always 200 to Meta
  }
});

export default router;
