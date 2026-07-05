import { logger } from '../utils/logger';
import { google } from 'googleapis';
import { pool } from '../config/db';

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:5000/api/gmail/callback'
  );
}

export function getGmailAuthUrl(userId: string) {
  const oauth2 = getOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state: userId,
  });
}

export async function saveGmailTokens(userId: string, code: string) {
  const oauth2 = getOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  await pool.query(
    `INSERT INTO user_integrations (user_id, provider, tokens)
     VALUES ($1, 'gmail', $2)
     ON CONFLICT (user_id, provider) DO UPDATE SET tokens=$2, updated_at=NOW()`,
    [userId, JSON.stringify(tokens)]
  );
  return tokens;
}

export async function fetchGmailEmails(userId: string, clientEmail: string, limit = 30): Promise<string> {
  try {
    const res = await pool.query(
      `SELECT tokens FROM user_integrations WHERE user_id=$1 AND provider='gmail'`,
      [userId]
    );
    if (!res.rows[0]) return '';

    const oauth2 = getOAuthClient();
    oauth2.setCredentials(JSON.parse(res.rows[0].tokens));

    // Auto-refresh token
    oauth2.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        await pool.query(
          `UPDATE user_integrations SET tokens=$1 WHERE user_id=$2 AND provider='gmail'`,
          [JSON.stringify(tokens), userId]
        );
      }
    });

    // Get user's email address
    const userRes = await pool.query('SELECT email FROM users WHERE id=$1', [userId]);
    const userEmail = userRes.rows[0]?.email;

    if (!userEmail) {
      logger.warn(`No user email found for user ID: ${userId}`);
      return '';
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2 });

    // Search query strictly matching emails between user and client
    const query = `(from:${userEmail} to:${clientEmail}) OR (from:${clientEmail} to:${userEmail})`;
    const listRes = await gmail.users.messages.list({
      userId: 'me', q: query, maxResults: limit,
    });

    const messages = listRes.data.messages || [];
    const texts: string[] = [];

    for (const msg of messages.slice(0, 15)) {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      const payload = detail.data.payload;
      const headers = payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from    = headers.find(h => h.name === 'From')?.value || '';
      const date    = headers.find(h => h.name === 'Date')?.value || '';

      let body = '';
      const parts = payload?.parts || [payload];
      for (const part of parts) {
        if (part?.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8').slice(0, 500);
          break;
        }
      }

      texts.push(`[Email] Date: ${date} | From: ${from} | Subject: ${subject}\n${body}`);
    }

    return texts.join('\n\n---\n\n');
  } catch (err) {
    logger.error('Gmail fetch error:', err);
    return '';
  }
}
