import 'dotenv/config';
import { pool } from './config/db';

async function main() {
  // Check clients table columns
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name='clients' ORDER BY ordinal_position`
  );
  console.log('Clients columns:', cols.rows.map((c: any) => c.column_name).join(', '));

  // Simulate the exact agent query
  try {
    const r = await pool.query(
      'SELECT id, name, company, email, health_score, last_sentiment FROM clients WHERE user_id=$1 ORDER BY name',
      ['5cb479cd-9e51-4ab4-b3b6-82d7f8f9c671']
    );
    console.log('\n✅ Agent clients query OK — rows:', r.rows.length);
    console.log(r.rows[0]);
  } catch (err: any) {
    console.error('\n❌ Agent clients query FAILED:', err.message);
  }

  // Check tasks table
  try {
    const t = await pool.query(
      `SELECT t.task, t.priority, c.name as client_name 
       FROM tasks t JOIN clients c ON t.client_id=c.id 
       WHERE t.user_id=$1 AND t.status='pending' LIMIT 3`,
      ['5cb479cd-9e51-4ab4-b3b6-82d7f8f9c671']
    );
    console.log('\n✅ Tasks query OK — rows:', t.rows.length);
  } catch (err: any) {
    console.error('\n❌ Tasks query FAILED:', err.message);
  }

  await pool.end();
}

main().catch(console.error);
