import { logger } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../config/db';
import { extractKnowledge } from './gemini';
import * as cognee from './cognee';
import { v4 as uuidv4 } from 'uuid';

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    const allowed = ['.pdf', '.txt', '.doc', '.docx', '.md', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

export async function processUploadedDoc(
  filePath: string,
  originalName: string,
  clientId: string,
  userId: string
) {
  try {
    // Read file content (text files only for now)
    const ext = path.extname(originalName).toLowerCase();
    let content = '';

    if (['.txt', '.md', '.csv'].includes(ext)) {
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      // For PDF/DOC — store filename as context, full parsing needs python service
      content = `Document uploaded: ${originalName}. File type: ${ext}. Manual review required.`;
    }

    // Get client name
    const clientRes = await pool.query('SELECT name FROM clients WHERE id=$1', [clientId]);
    const clientName = clientRes.rows[0]?.name || 'Unknown';

    // Extract knowledge with Gemini
    const knowledge = await extractKnowledge(content, clientName);

    // Store in Cognee
    await cognee.remember(
      knowledge.summary || content.slice(0, 1000),
      { source: 'document', fileName: originalName, entities: knowledge.entities, keyFacts: knowledge.keyFacts },
      clientId
    ).catch(err => logger.error('Cognee store document error:', err));

    // Save to DB
    const docRes = await pool.query(
      `INSERT INTO client_documents (id, client_id, user_id, file_name, file_path, summary, key_facts)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uuidv4(), clientId, userId, originalName, filePath, knowledge.summary, JSON.stringify(knowledge.keyFacts)]
    );

    // Save extracted action items
    for (const item of knowledge.actionItems) {
      await pool.query(
        `INSERT INTO tasks (id, client_id, user_id, task, priority, source) VALUES ($1,$2,$3,$4,$5,'document')`,
        [uuidv4(), clientId, userId, item.task, item.priority]
      );
    }

    return docRes.rows[0];
  } catch (err) {
    logger.error('processUploadedDoc error:', err);
    throw err;
  }
}
