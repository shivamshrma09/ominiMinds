import 'dotenv/config';
import { pool } from './config/db';
import * as cognee from './services/cognee';

async function main() {
  console.log('=== Pushing existing meeting to Cognee ===\n');

  // Get latest processed meeting
  const res = await pool.query(
    `SELECT id, client_id, title, transcript, summary, mom_detailed
     FROM meetings
     WHERE status = 'processed' AND transcript != ''
     ORDER BY created_at DESC
     LIMIT 1`
  );

  const meeting = res.rows[0];
  if (!meeting) {
    console.log('❌ No processed meetings found');
    await pool.end();
    return;
  }

  console.log(`📋 Meeting: ${meeting.title} (${meeting.id})`);
  console.log(`📁 Client dataset: ${meeting.client_id}`);
  console.log(`📝 Transcript preview: ${meeting.transcript?.slice(0, 100)}...`);

  const content = [
    `Meeting Title: ${meeting.title}`,
    `Transcript: ${meeting.transcript}`,
    `Summary: ${meeting.summary || 'N/A'}`,
  ].join('\n');

  console.log('\n⏳ Sending to Cognee...');
  const result = await cognee.remember(content, { meetingId: meeting.id }, meeting.client_id);
  console.log('✅ Cognee response:', JSON.stringify(result, null, 2));

  // Now try to recall
  console.log('\n🔍 Recalling from Cognee...');
  await new Promise(r => setTimeout(r, 3000)); // wait 3s for indexing
  const recall = await cognee.recall('Shivam meeting hello', meeting.client_id, 3);
  console.log('Recall result:', JSON.stringify(recall, null, 2));

  await pool.end();
}

main().catch(console.error);
