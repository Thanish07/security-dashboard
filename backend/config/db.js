const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'academic_security_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

// Test the connection at startup
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   → Check your DB credentials in backend/.env');
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
