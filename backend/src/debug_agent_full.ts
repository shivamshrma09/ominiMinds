import 'dotenv/config';
import { pool } from './config/db';
import * as cognee from './services/cognee';
import { geminiFlash } from './services/gemini';

async function main() {
  const userId = '5cb479cd-9e51-4ab4-b3b6-82d7f8f9c671';
  const message = 'What are my pending tasks?';

  console.log('=== Testing Agent Chat Flow ===\n');

  // Step 1: Clients
  console.log('1. Fetching clients...');
  const clientsRes = await pool.query(
    'SELECT id, name, company, email, health_score, last_sentiment FROM clients WHERE user_id=$1 ORDER BY name',
    [userId]
  );
  console.log(`   ✅ ${clientsRes.rows.length} clients found`);

  // Step 2: Cognee recall
  console.log('\n2. Cognee recall...');
  try {
    const r = await cognee.recall(message, undefined, 5);
    console.log('   ✅ Cognee recall OK:', JSON.stringify(r)?.slice(0, 100));
  } catch (e: any) {
    console.log('   ⚠️  Cognee recall error (non-fatal):', e.message);
  }

  // Step 3: Meetings
  console.log('\n3. Fetching recent meetings...');
  const meetingsRes = await pool.query(
    'SELECT title, summary, action_items, created_at FROM meetings WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5',
    [userId]
  );
  console.log(`   ✅ ${meetingsRes.rows.length} meetings found`);

  // Step 4: Tasks
  console.log('\n4. Fetching pending tasks...');
  const tasksRes = await pool.query(
    `SELECT t.task, t.priority, c.name as client_name 
     FROM tasks t JOIN clients c ON t.client_id=c.id 
     WHERE t.user_id=$1 AND t.status='pending' LIMIT 10`,
    [userId]
  );
  console.log(`   ✅ ${tasksRes.rows.length} tasks found`);

  // Step 5: Gemini
  console.log('\n5. Calling Gemini...');
  if (!geminiFlash) {
    console.log('   ❌ geminiFlash is NULL — GEMINI_API_KEY missing!');
  } else {
    try {
      const result = await geminiFlash.generateContent(`Answer briefly: ${message}`);
      console.log('   ✅ Gemini reply:', result.response.text().slice(0, 100));
    } catch (e: any) {
      console.log('   ❌ Gemini error:', e.message);
    }
  }

  await pool.end();
  console.log('\n=== Done ===');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
