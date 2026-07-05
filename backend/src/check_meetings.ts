import 'dotenv/config';
import { pool } from './config/db';

async function main() {
  console.log('=== Checking meetings in DB ===\n');

  // All meetings
  const meetings = await pool.query(
    `SELECT id, user_id, client_id, title, status, duration,
            LEFT(transcript, 100) as transcript_preview,
            LEFT(summary, 100) as summary_preview,
            created_at
     FROM meetings
     ORDER BY created_at DESC
     LIMIT 10`
  );

  if (meetings.rows.length === 0) {
    console.log('❌ No meetings found in DB');
  } else {
    console.log(`✅ Found ${meetings.rows.length} meeting(s):\n`);
    meetings.rows.forEach((m, i) => {
      console.log(`--- Meeting ${i + 1} ---`);
      console.log(`ID:        ${m.id}`);
      console.log(`Title:     ${m.title}`);
      console.log(`Client ID: ${m.client_id}`);
      console.log(`Status:    ${m.status}`);
      console.log(`Duration:  ${m.duration}s`);
      console.log(`Transcript: ${m.transcript_preview || '(empty)'}...`);
      console.log(`Summary:   ${m.summary_preview || '(not yet generated)'}...`);
      console.log(`Created:   ${m.created_at}`);
      console.log('');
    });
  }

  // Tasks generated from meetings
  const tasks = await pool.query(
    `SELECT id, task, priority, status, source, created_at
     FROM tasks
     WHERE source = 'meeting'
     ORDER BY created_at DESC
     LIMIT 10`
  );

  console.log(`\n=== Tasks generated from meetings ===`);
  if (tasks.rows.length === 0) {
    console.log('❌ No meeting-sourced tasks found');
  } else {
    console.log(`✅ Found ${tasks.rows.length} task(s):`);
    tasks.rows.forEach(t => {
      console.log(`  [${t.priority}] ${t.task} — ${t.status}`);
    });
  }

  await pool.end();
}

main().catch(console.error);
