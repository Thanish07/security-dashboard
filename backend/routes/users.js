const express = require('express');
const bcrypt  = require('bcryptjs');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

/**
 * GET /api/users
 * Returns all users with risk scores (Admin only).
 */
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, role, risk_score, created_at FROM users ORDER BY risk_score DESC`
    );

    // Add risk level label
    const users = rows.map(u => ({
      ...u,
      risk_level: u.risk_score >= 60 ? 'high' : u.risk_score >= 30 ? 'medium' : 'low'
    }));

    res.json({ users });
  } catch (err) {
    console.error('[Users Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/users
 * Creates a new user (Admin only).
 */
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['admin', 'faculty', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check duplicate email
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, role]
    );

    res.status(201).json({ message: 'User created', id: result.insertId });
  } catch (err) {
    console.error('[Create User Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/users/:id
 * Updates a user's name, role, or password (Admin only).
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    const updates = [];
    const params  = [];

    if (name)  { updates.push('name = ?');  params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (role)  { updates.push('role = ?');  params.push(role); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    params.push(id);
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('[Update User Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Deletes a user (Admin only, cannot delete self).
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('[Delete User Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
