import { logger } from '../utils/logger';
import axios from 'axios';
import { pool } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

// Store incoming WhatsApp webhook message
export async function storeWhatsAppMessage(payload: any) {
  try {
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    if (!message) return;

    const from    = message.from;   // phone number
    const text    = message.text?.body || '';
    const msgId   = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    // Find client by phone number
    const clientRes = await pool.query(
      `SELECT c.id, c.user_id FROM clients c WHERE c.phone=$1 OR c.integrations->>'whatsapp'=$1 LIMIT 1`,
      [from]
    );
    if (!clientRes.rows[0]) return;

    const { id: clientId, user_id: userId } = clientRes.rows[0];

    // Store in whatsapp_messages table
    await pool.query(
      `INSERT INTO whatsapp_messages (id, client_id, user_id, from_number, message, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [msgId, clientId, userId, from, text, timestamp]
    );

    return { clientId, userId, text };
  } catch (err) {
    logger.error('WhatsApp store error:', err);
  }
}

export async function fetchWhatsAppMessages(clientId: string, limit = 30): Promise<string> {
  try {
    const res = await pool.query(
      `SELECT message, from_number, timestamp FROM whatsapp_messages
       WHERE client_id=$1 ORDER BY timestamp DESC LIMIT $2`,
      [clientId, limit]
    );
    return res.rows
      .map(r => `[WhatsApp ${r.timestamp.toISOString().slice(0, 10)}] ${r.from_number}: ${r.message}`)
      .join('\n');
  } catch {
    return '';
  }
}

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('WhatsApp send error:', err);
  }
}
