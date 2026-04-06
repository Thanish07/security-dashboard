const express = require('express');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All log routes require authentication
router.use(verifyToken);

/**
 * GET /api/logs
 * Returns paginated activity logs.
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
      params.push(req.query.user_id);
      conditions.push(`l.user_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      conditions.push(`l.status = $${params.length}`);
    }
    if (req.query.action) {
      params.push(req.query.action);
      conditions.push(`l.action = $${params.length}`);
    }
    if (req.query.from) {
      params.push(new Date(req.query.from));
      conditions.push(`l.timestamp >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(new Date(req.query.to));
      conditions.push(`l.timestamp <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT l.id, l.user_id, u.name AS user_name, u.role, l.timestamp,
             l.ip_address, l.user_agent, l.status, l.action
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${where}
      ORDER BY l.timestamp DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const result = await pool.query(query, [...params, limit, offset]);

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM logs l ${where}`,
      params
    );

    const total = parseInt(countRes.rows[0].total);

    res.json({
      logs:  result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
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
    const dailyRes = await pool.query(`
      SELECT
        timestamp::date AS date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'success') AS success,
        COUNT(*) FILTER (WHERE status = 'failure') AS failure
      FROM logs
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY timestamp::date
      ORDER BY date ASC
    `);

    const summaryRes = await pool.query(`
      SELECT
        COUNT(*) AS total_logins,
        COUNT(*) FILTER (WHERE status = 'success') AS successful,
        COUNT(*) FILTER (WHERE status = 'failure') AS failed,
        COUNT(DISTINCT user_id) AS active_users
      FROM logs
      WHERE timestamp::date = CURRENT_DATE
    `);

    const weeklyRes = await pool.query(`
      SELECT COUNT(*) AS total FROM logs
      WHERE timestamp >= NOW() - INTERVAL '7 days'
    `);

    res.json({ 
      daily: dailyRes.rows, 
      summary: summaryRes.rows[0], 
      weekly: parseInt(weeklyRes.rows[0].total) 
    });
  } catch (err) {
    console.error('[Stats Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
