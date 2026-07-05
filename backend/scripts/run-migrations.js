const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'migrations', '20260705_add_cognee_and_client_fields.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('Migration file not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new Pool({ connectionString: DATABASE_URL });

(async () => {
  try {
    console.log('Applying migrations from', sqlPath);
    await pool.query(sql);
    console.log('Migrations applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  } finally {
    await pool.end();
  }
})();
