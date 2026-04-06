const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool } = require('../config/db');
const { runDetection } = require('../services/detection');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates a user, logs the attempt, runs detection.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Capture request metadata
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const now = Date.now();

  try {
    // Find user
    const [rows] = await pool.execute(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      // Log failed attempt (unknown user)
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    const status = passwordMatch ? 'success' : 'failure';

    // Log the attempt
    await pool.execute(
      `INSERT INTO logs (user_id, timestamp, ip_address, user_agent, status, action)
       VALUES (?, ?, ?, ?, ?, 'login')`,
      [user.id, new Date(now), ip, userAgent, status]
    );

    // Run suspicious activity detection (async, don't block response)
    runDetection(user.id, ip, status, now).catch(console.error);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logs the logout action (JWT is stateless; client discards token).
 */
router.post('/logout', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    await pool.execute(
      `INSERT INTO logs (user_id, timestamp, ip_address, user_agent, status, action)
       VALUES (?, NOW(), ?, ?, 'success', 'logout')`,
      [req.user.id, ip, userAgent]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[Logout Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 * Returns current user info from token.
 */
router.get('/me', require('../middleware/auth').verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
