const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

// PostgreSQL connection pool (Supabase)
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/Render
  }
});

/**
 * Test the connection at startup
 * Note: pg.Pool doesn't connect until the first query is made,
 * but pool.query('SELECT NOW()') verifies the credentials.
 */
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Supabase PostgreSQL connected successfully at:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    console.error('   → Check your connection string in backend/.env');
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
