/**
 * Supabase (PostgreSQL) Seed Script
 * Run with: node scripts/seed-supabase.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    console.log('🚀 Starting Supabase Seed...');

    // 1. Skip cleaning (User confirmed DB is empty)
    console.log('🧹 Skipping cleaning as confirmed by user...');

    // 2. Seed Users
    console.log('👥 Seeding users...');
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

    const userIds = {};
    for (const u of users) {
      const hashed = await bcrypt.hash(u.password, 10);
      const res = await pool.query(
        'INSERT INTO users (name, email, password, role, risk_score) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [u.name, u.email, hashed, u.role, u.risk_score]
      );
      userIds[u.email] = res.rows[0].id;
      console.log(`   ✅ Created ${u.email}`);
    }

    // 3. Seed Logs
    console.log('📝 Seeding logs...');
    const IPs = ['192.168.1.10', '192.168.1.22', '10.0.0.5', '172.16.0.3', '192.168.0.100'];
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14) Safari/17',
      'Mozilla/5.0 (X11; Linux x86_64) Firefox/123'
    ];

    const now = new Date();
    const userEmails = Object.keys(userIds);
    
    for (let day = 6; day >= 0; day--) {
      const dayCount = Math.floor(Math.random() * 10) + 5;
      for (let i = 0; i < dayCount; i++) {
        const email = userEmails[Math.floor(Math.random() * userEmails.length)];
        const ts = new Date(now);
        ts.setDate(ts.getDate() - day);
        ts.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        
        await pool.query(
          'INSERT INTO logs (user_id, timestamp, ip_address, user_agent, status, action) VALUES ($1, $2, $3, $4, $5, $6)',
          [userIds[email], ts, IPs[Math.floor(Math.random() * IPs.length)], agents[Math.floor(Math.random() * agents.length)], Math.random() > 0.2 ? 'success' : 'failure', 'login']
        );
      }
    }

    // Seed specific failures for Alice
    const aliceId = userIds['alice@college.edu'];
    for (let i = 0; i < 6; i++) {
      const ts = new Date(now);
      ts.setMinutes(ts.getMinutes() - i * 5);
      await pool.query(
        'INSERT INTO logs (user_id, timestamp, ip_address, user_agent, status, action) VALUES ($1, $2, $3, $4, $5, $6)',
        [aliceId, ts, '10.99.99.1', agents[0], 'failure', 'login']
      );
    }

    // 4. Seed Alerts
    console.log('🚨 Seeding alerts...');
    const alerts = [
      {
        user_id:  userIds['alice@college.edu'],
        type:     'failed_logins',
        message:  '6 failed login attempts detected in the last 30 minutes.',
        severity: 'high',
        resolved: false
      },
      {
        user_id:  userIds['bob@college.edu'],
        type:     'ip_anomaly',
        message:  'Login from 3 different IP addresses within the last hour.',
        severity: 'medium',
        resolved: false
      }
    ];

    for (const a of alerts) {
      await pool.query(
        'INSERT INTO alerts (user_id, type, message, severity, resolved) VALUES ($1, $2, $3, $4, $5)',
        [a.user_id, a.type, a.message, a.severity, a.resolved]
      );
    }

    console.log('\n🎉 Supabase seeded successfully!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Seed failed:', err.stack);
    process.exit(1);
  }
}

seed();
