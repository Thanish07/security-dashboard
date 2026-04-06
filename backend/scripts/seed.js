/**
 * Database Seed Script
 * Run with: node scripts/seed.js
 *
 * Creates the schema and inserts sample data for development/demo.
 */

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'academic_security_db';

async function seed() {
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL');

    // ── Create Database ────────────────────────────────────────────────────
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await conn.query(`USE \`${DB_NAME}\``);
    console.log(`✅ Using database: ${DB_NAME}`);

    // ── Create Tables ──────────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100)  NOT NULL,
        email      VARCHAR(100)  NOT NULL UNIQUE,
        password   VARCHAR(255)  NOT NULL,
        role       ENUM('admin','faculty','student') NOT NULL DEFAULT 'student',
        risk_score INT           NOT NULL DEFAULT 0,
        created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT           NOT NULL,
        timestamp  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status     ENUM('success','failure') NOT NULL,
        action     VARCHAR(100)  NOT NULL DEFAULT 'login',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT           NOT NULL,
        type       ENUM('failed_logins','ip_anomaly') NOT NULL,
        message    TEXT          NOT NULL,
        severity   ENUM('low','medium','high') NOT NULL,
        timestamp  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved   BOOLEAN       NOT NULL DEFAULT FALSE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tables created');

    // ── Seed Users ─────────────────────────────────────────────────────────
    const users = [
      { name: 'Admin User',      email: 'admin@college.edu',   password: 'admin123',   role: 'admin',   risk_score: 0  },
      { name: 'Dr. Sarah Chen',  email: 'schen@college.edu',   password: 'faculty123', role: 'faculty', risk_score: 0  },
      { name: 'Prof. James Roy', email: 'jroy@college.edu',    password: 'faculty123', role: 'faculty', risk_score: 15 },
      { name: 'Alice Johnson',   email: 'alice@college.edu',   password: 'student123', role: 'student', risk_score: 72 },
      { name: 'Bob Martinez',    email: 'bob@college.edu',     password: 'student123', role: 'student', risk_score: 45 },
      { name: 'Carol Williams',  email: 'carol@college.edu',   password: 'student123', role: 'student', risk_score: 20 },
      { name: 'David Kumar',     email: 'david@college.edu',   password: 'student123', role: 'student', risk_score: 90 },
      { name: 'Emma Thompson',   email: 'emma@college.edu',    password: 'student123', role: 'student', risk_score: 5  },
    ];

    const insertedIds = {};
    for (const u of users) {
      // Skip if email already exists
      const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [u.email]);
      if (existing.length > 0) {
        insertedIds[u.email] = existing[0].id;
        console.log(`   ⏭  Skipped existing user: ${u.email}`);
        continue;
      }
      const hashed = await bcrypt.hash(u.password, 10);
      const [result] = await conn.execute(
        'INSERT INTO users (name, email, password, role, risk_score) VALUES (?, ?, ?, ?, ?)',
        [u.name, u.email, hashed, u.role, u.risk_score]
      );
      insertedIds[u.email] = result.insertId;
      console.log(`   ✅ Created user: ${u.email} (${u.role})`);
    }

    // ── Seed Logs ──────────────────────────────────────────────────────────
    const [logCount] = await conn.execute('SELECT COUNT(*) AS cnt FROM logs');
    if (logCount[0].cnt === 0) {
      const IPs = ['192.168.1.10', '192.168.1.22', '10.0.0.5', '172.16.0.3', '192.168.0.100'];
      const agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14) Safari/17',
        'Mozilla/5.0 (X11; Linux x86_64) Firefox/123'
      ];

      const now = new Date();
      const logEntries = [];

      // Generate varied logs over the last 7 days
      const userEmails = Object.keys(insertedIds);
      for (let day = 6; day >= 0; day--) {
        const dayCount = Math.floor(Math.random() * 15) + 8;
        for (let i = 0; i < dayCount; i++) {
          const email  = userEmails[Math.floor(Math.random() * userEmails.length)];
          const uid    = insertedIds[email];
          const hour   = Math.floor(Math.random() * 24);
          const ts     = new Date(now);
          ts.setDate(ts.getDate() - day);
          ts.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
          const status = Math.random() > 0.25 ? 'success' : 'failure';
          const ip     = IPs[Math.floor(Math.random() * IPs.length)];
          const ua     = agents[Math.floor(Math.random() * agents.length)];
          logEntries.push([uid, ts, ip, ua, status, 'login']);
        }
      }

      // Seed Alice (high risk) with 6 consecutive failures
      const aliceId = insertedIds['alice@college.edu'];
      for (let i = 0; i < 6; i++) {
        const ts = new Date(now);
        ts.setMinutes(ts.getMinutes() - i * 3);
        logEntries.push([aliceId, ts, '10.99.99.1', agents[0], 'failure', 'login']);
      }


      for (const entry of logEntries) {
        await conn.execute(
          'INSERT INTO logs (user_id, timestamp, ip_address, user_agent, status, action) VALUES (?, ?, ?, ?, ?, ?)',
          entry
        );
      }
      console.log(`✅ Seeded ${logEntries.length} log entries`);
    } else {
      console.log('   ⏭  Logs already seeded, skipping');
    }

    // ── Seed Alerts ────────────────────────────────────────────────────────
    const [alertCount] = await conn.execute('SELECT COUNT(*) AS cnt FROM alerts');
    if (alertCount[0].cnt === 0) {
      const alerts = [
        {
          user_id:  insertedIds['alice@college.edu'],
          type:     'failed_logins',
          message:  '6 failed login attempts detected in the last 30 minutes.',
          severity: 'high',
          resolved: false
        },
        {
          user_id:  insertedIds['bob@college.edu'],
          type:     'ip_anomaly',
          message:  'Login from 3 different IP addresses within the last hour.',
          severity: 'medium',
          resolved: false
        },
        {
          user_id:  insertedIds['david@college.edu'],
          type:     'failed_logins',
          message:  '4 failed login attempts detected.',
          severity: 'high',
          resolved: true
        }
      ];

      for (const a of alerts) {
        await conn.execute(
          'INSERT INTO alerts (user_id, type, message, severity, resolved) VALUES (?, ?, ?, ?, ?)',
          [a.user_id, a.type, a.message, a.severity, a.resolved]
        );
      }
      console.log(`✅ Seeded ${alerts.length} alerts`);
    } else {
      console.log('   ⏭  Alerts already seeded, skipping');
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('   Admin:   admin@college.edu    / admin123');
    console.log('   Faculty: schen@college.edu    / faculty123');
    console.log('   Student: alice@college.edu    / student123');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.end();
  }
}

seed();
