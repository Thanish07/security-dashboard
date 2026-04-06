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
      params.push(req.query.resolved === 'true');
      conditions.push(`a.resolved = $${params.length}`);
    }
    if (req.query.severity) {
      params.push(req.query.severity);
      conditions.push(`a.severity = $${params.length}`);
    }
    if (req.query.type) {
      params.push(req.query.type);
      conditions.push(`a.type = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT a.id, a.user_id, u.name AS user_name, u.email,
              a.type, a.message, a.severity, a.timestamp, a.resolved
       FROM alerts a
       LEFT JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY a.timestamp DESC
       LIMIT 100`,
      params
    );

    res.json({ alerts: result.rows });
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
    const result = await pool.query(`
      SELECT
        severity,
        COUNT(*) AS count
      FROM alerts
      WHERE resolved = FALSE
      GROUP BY severity
    `);

    const summary = { high: 0, medium: 0, low: 0, total: 0 };
    for (const row of result.rows) {
      const count = parseInt(row.count);
      summary[row.severity] = count;
      summary.total += count;
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
    await pool.query(
      'UPDATE alerts SET resolved = TRUE WHERE id = $1',
      [id]
    );
    res.json({ message: 'Alert resolved' });
  } catch (err) {
    console.error('[Resolve Alert Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
