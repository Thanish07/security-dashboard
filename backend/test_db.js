const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function test() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    console.log('✅ Connection successful');
    await conn.end();
  } catch (err) {
    console.error('❌ Connection failed');
    console.error(err);
  }
}
test();
