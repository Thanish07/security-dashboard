const express = require('express');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

/**
 * GET /api/alerts
 * Returns all alerts (Admin only), with optional filters.
 */
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const conditions = [];
    const params     = [];

    if (req.query.resolved !== undefined) {
      conditions.push('a.resolved = ?');
      params.push(req.query.resolved === 'true' ? 1 : 0);
    }
    if (req.query.severity) {
      conditions.push('a.severity = ?');
      params.push(req.query.severity);
    }
    if (req.query.type) {
      conditions.push('a.type = ?');
      params.push(req.query.type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT a.id, a.user_id, u.name AS user_name, u.email,
              a.type, a.message, a.severity, a.timestamp, a.resolved
       FROM alerts a
       LEFT JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY a.timestamp DESC
       LIMIT 100`,
      params
    );

    res.json({ alerts: rows });
  } catch (err) {
    console.error('[Alerts Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/alerts/summary
 * Returns counts by severity for the dashboard cards.
 */
router.get('/summary', requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        severity,
        COUNT(*) AS count
      FROM alerts
      WHERE resolved = FALSE
      GROUP BY severity
    `);

    const summary = { high: 0, medium: 0, low: 0, total: 0 };
    for (const row of rows) {
      summary[row.severity] = row.count;
      summary.total += row.count;
    }

    res.json(summary);
  } catch (err) {
    console.error('[Alerts Summary Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PATCH /api/alerts/:id/resolve
 * Marks an alert as resolved.
 */
router.patch('/:id/resolve', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute(
      'UPDATE alerts SET resolved = TRUE WHERE id = ?',
      [id]
    );
    res.json({ message: 'Alert resolved' });
  } catch (err) {
    console.error('[Resolve Alert Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
