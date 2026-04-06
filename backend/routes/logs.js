const express = require('express');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All log routes require authentication
router.use(verifyToken);

/**
 * GET /api/logs
 * Returns paginated activity logs.
 * Query params: page, limit, user_id, status, from, to, action
 */
router.get('/', requireRole('admin', 'faculty'), async (req, res) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 20;
    const offset  = (page - 1) * limit;

    // Build dynamic WHERE clause
    const conditions = [];
    const params     = [];

    if (req.query.user_id) {
      conditions.push('l.user_id = ?');
      params.push(req.query.user_id);
    }
    if (req.query.status) {
      conditions.push('l.status = ?');
      params.push(req.query.status);
    }
    if (req.query.action) {
      conditions.push('l.action = ?');
      params.push(req.query.action);
    }
    if (req.query.from) {
      conditions.push('l.timestamp >= ?');
      params.push(new Date(req.query.from));
    }
    if (req.query.to) {
      conditions.push('l.timestamp <= ?');
      params.push(new Date(req.query.to));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT l.id, l.user_id, u.name AS user_name, u.role, l.timestamp,
              l.ip_address, l.user_agent, l.status, l.action
       FROM logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${where}
       ORDER BY l.timestamp DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM logs l ${where}`,
      params
    );

    res.json({
      logs:  rows,
      total: countRows[0].total,
      page,
      limit,
      pages: Math.ceil(countRows[0].total / limit)
    });
  } catch (err) {
    console.error('[Logs Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/logs/stats
 * Returns dashboard statistics: total, success, failure counts.
 */
router.get('/stats', requireRole('admin'), async (req, res) => {
  try {
    const [daily] = await pool.execute(`
      SELECT
        DATE(timestamp) AS date,
        COUNT(*) AS total,
        SUM(status = 'success') AS success,
        SUM(status = 'failure') AS failure
      FROM logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

    const [summary] = await pool.execute(`
      SELECT
        COUNT(*) AS total_logins,
        SUM(status = 'success') AS successful,
        SUM(status = 'failure') AS failed,
        COUNT(DISTINCT user_id) AS active_users
      FROM logs
      WHERE DATE(timestamp) = CURDATE()
    `);

    const [weekly] = await pool.execute(`
      SELECT COUNT(*) AS total FROM logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({ daily, summary: summary[0], weekly: weekly[0].total });
  } catch (err) {
    console.error('[Stats Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
