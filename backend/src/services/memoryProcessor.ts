import { logger } from '../utils/logger';
import { pool } from '../config/db';
import { extractKnowledge, calculateHealthScore } from './gemini';
import { fetchSlackMessages, fetchNotionPage } from './integrations';
import { fetchGmailEmails } from './gmail';
import { fetchWhatsAppMessages } from './whatsapp';
import * as cognee from './cognee';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

function hashContent(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function processClientSources(clientId: string, userId: string) {
  try {
    const clientRes = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    const client = clientRes.rows[0];
    if (!client) return;

    const integrations = client.integrations || {};
    const allText: string[] = [];

    // Fetch Gmail emails
    if (client.email) {
      const gmailText = await fetchGmailEmails(userId, client.email);
      if (gmailText) {
        allText.push(`[Gmail] ${gmailText}`);
        const contentHash = hashContent(gmailText);
        const existing = await pool.query('SELECT * FROM memory_audit WHERE client_id=$1 AND content_hash=$2 LIMIT 1', [clientId, contentHash]);
        const vectorId = existing.rows[0]?.vector_id || uuidv4();
        
        const ds = await cognee.remember(gmailText, { source: 'gmail', clientEmail: client.email }, clientId).catch(() => null);

        if (existing.rows[0]) {
          await pool.query('UPDATE memory_audit SET updated_at=NOW(), metadata=$1, source_id=$2, cognee_dataset_id=$3 WHERE id=$4', [JSON.stringify({ clientEmail: client.email }), null, ds, existing.rows[0].id]);
        } else {
          await pool.query('INSERT INTO memory_audit (client_id,user_id,source,source_id,vector_id,cognee_dataset_id,content_hash,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [clientId, userId, 'gmail', null, vectorId, ds, contentHash, JSON.stringify({ clientEmail: client.email })]);
        }
      }
    }

    // Fetch WhatsApp messages
    const waText = await fetchWhatsAppMessages(clientId);
    if (waText) {
      allText.push(`[WhatsApp] ${waText}`);
      const contentHash = hashContent(waText);
      const existing = await pool.query('SELECT * FROM memory_audit WHERE client_id=$1 AND content_hash=$2 LIMIT 1', [clientId, contentHash]);
      const vectorId = existing.rows[0]?.vector_id || uuidv4();
      
      const ds = await cognee.remember(waText, { source: 'whatsapp' }, clientId).catch(() => null);

      if (existing.rows[0]) {
        await pool.query('UPDATE memory_audit SET updated_at=NOW(), metadata=$1, source_id=$2, cognee_dataset_id=$3 WHERE id=$4', [JSON.stringify({}), null, ds, existing.rows[0].id]);
      } else {
        await pool.query('INSERT INTO memory_audit (client_id,user_id,source,source_id,vector_id,cognee_dataset_id,content_hash,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [clientId, userId, 'whatsapp', null, vectorId, ds, contentHash, JSON.stringify({})]);
      }
    }

    // Fetch Slack
    if (integrations.slack) {
      const slackText = await fetchSlackMessages(integrations.slack);
      if (slackText) {
        allText.push(`[Slack] ${slackText}`);
        const contentHash = hashContent(slackText);
        const existing = await pool.query('SELECT * FROM memory_audit WHERE client_id=$1 AND content_hash=$2 LIMIT 1', [clientId, contentHash]);
        const vectorId = existing.rows[0]?.vector_id || uuidv4();
        
        const ds = await cognee.remember(slackText, { source: 'slack', channel: integrations.slack }, clientId).catch(() => null);

        if (existing.rows[0]) {
          await pool.query('UPDATE memory_audit SET updated_at=NOW(), metadata=$1, source_id=$2, cognee_dataset_id=$3 WHERE id=$4', [JSON.stringify({ channel: integrations.slack }), null, ds, existing.rows[0].id]);
        } else {
          await pool.query('INSERT INTO memory_audit (client_id,user_id,source,source_id,vector_id,cognee_dataset_id,content_hash,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [clientId, userId, 'slack', null, vectorId, ds, contentHash, JSON.stringify({ channel: integrations.slack })]);
        }
      }
    }

    // Fetch Notion
    if (integrations.notion) {
      const notionText = await fetchNotionPage(integrations.notion);
      if (notionText) {
        allText.push(`[Notion] ${notionText}`);
        const contentHash = hashContent(notionText);
        const existing = await pool.query('SELECT * FROM memory_audit WHERE client_id=$1 AND content_hash=$2 LIMIT 1', [clientId, contentHash]);
        const vectorId = existing.rows[0]?.vector_id || uuidv4();
        
        const ds = await cognee.remember(notionText, { source: 'notion', url: integrations.notion }, clientId).catch(() => null);

        if (existing.rows[0]) {
          await pool.query('UPDATE memory_audit SET updated_at=NOW(), metadata=$1, source_id=$2, cognee_dataset_id=$3 WHERE id=$4', [JSON.stringify({ url: integrations.notion }), null, ds, existing.rows[0].id]);
        } else {
          await pool.query('INSERT INTO memory_audit (client_id,user_id,source,source_id,vector_id,cognee_dataset_id,content_hash,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [clientId, userId, 'notion', null, vectorId, ds, contentHash, JSON.stringify({ url: integrations.notion })]);
        }
      }
    }

    // Extract knowledge with Gemini
    if (allText.length > 0) {
      const combined = allText.join('\n\n');
      const knowledge = await extractKnowledge(combined, client.name);

      // Store extracted knowledge (dedupe by hash)
      const extractedHash = hashContent(knowledge.summary);
      const existingExtracted = await pool.query('SELECT * FROM memory_audit WHERE client_id=$1 AND content_hash=$2 LIMIT 1', [clientId, extractedHash]);
      const vectorId = existingExtracted.rows[0]?.vector_id || uuidv4();
      
      const ds = await cognee.remember(knowledge.summary, { entities: knowledge.entities, keyFacts: knowledge.keyFacts, sentiment: knowledge.sentiment }, clientId).catch(() => null);

      if (existingExtracted.rows[0]) {
        await pool.query('UPDATE memory_audit SET updated_at=NOW(), metadata=$1, cognee_dataset_id=$2 WHERE id=$3', [JSON.stringify({ entities: knowledge.entities, keyFacts: knowledge.keyFacts, sentiment: knowledge.sentiment }), ds, existingExtracted.rows[0].id]);
      } else {
        await pool.query('INSERT INTO memory_audit (client_id,user_id,source,vector_id,cognee_dataset_id,content_hash,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7)', [clientId, userId, 'ai_extracted', vectorId, ds, extractedHash, JSON.stringify({ entities: knowledge.entities, keyFacts: knowledge.keyFacts, sentiment: knowledge.sentiment })]);
      }

      // Save action items
      for (const item of knowledge.actionItems) {
        await pool.query(
          'INSERT INTO tasks (id, client_id, user_id, task, priority, source) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
          [uuidv4(), clientId, userId, item.task, item.priority, 'ai_extracted']
        );
      }

      // Update client sentiment
      await pool.query(
        'UPDATE clients SET last_sentiment=$1, updated_at=NOW() WHERE id=$2',
        [knowledge.sentiment, clientId]
      );
    }

    // Recalculate health score
    await recalculateHealthScore(clientId, userId);

  } catch (err) {
    logger.error('processClientSources error:', err);
  }
}

export async function recalculateHealthScore(clientId: string, userId: string) {
  try {
    const clientRes = await pool.query('SELECT * FROM clients WHERE id=$1', [clientId]);
    const client = clientRes.rows[0];
    if (!client) return;

    const meetingsRes = await pool.query('SELECT COUNT(*) FROM meetings WHERE client_id=$1', [clientId]);
    const tasksRes = await pool.query("SELECT COUNT(*) FROM tasks WHERE client_id=$1 AND status='pending'", [clientId]);
    const lastMeetingRes = await pool.query(
      'SELECT created_at FROM meetings WHERE client_id=$1 ORDER BY created_at DESC LIMIT 1', [clientId]
    );

    const meetingCount = parseInt(meetingsRes.rows[0].count);
    const pendingTasks = parseInt(tasksRes.rows[0].count);
    const lastDate = lastMeetingRes.rows[0]?.created_at || client.created_at;
    const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);

    const { score, reasons, alerts } = await calculateHealthScore({
      name: client.name,
      lastContactDays: daysSince,
      meetingCount,
      pendingTasks,
      sentiment: client.last_sentiment || 'neutral',
      budgetTrend: 'stable',
    });

    await pool.query(
      'UPDATE clients SET health_score=$1, health_reasons=$2, health_alerts=$3, updated_at=NOW() WHERE id=$4',
      [score, JSON.stringify(reasons), JSON.stringify(alerts), clientId]
    );

    return score;
  } catch (err) {
    logger.error('recalculateHealthScore error:', err);
  }
}
