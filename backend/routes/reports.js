const express = require('express');
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

/**
 * GET /api/reports/logs.csv
 * Exports activity logs as CSV. Admin and Faculty only.
 */
router.get('/logs.csv', requireRole('admin', 'faculty'), async (req, res) => {
  try {
    const conditions = [];
    const params     = [];

    if (req.query.from) {
      conditions.push('l.timestamp >= ?');
      params.push(new Date(req.query.from));
    }
    if (req.query.to) {
      conditions.push('l.timestamp <= ?');
      params.push(new Date(req.query.to));
    }
    if (req.query.status) {
      conditions.push('l.status = ?');
      params.push(req.query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT l.id, u.name AS user_name, u.email, u.role,
              l.timestamp, l.ip_address, l.user_agent, l.status, l.action
       FROM logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${where}
       ORDER BY l.timestamp DESC
       LIMIT 10000`,
      params
    );

    // Build CSV manually (no library dependency issues)
    const headers = ['ID','User Name','Email','Role','Timestamp','IP Address','User Agent','Status','Action'];
    const csvRows = [
      headers.join(','),
      ...rows.map(r =>
        [
          r.id,
          `"${(r.user_name || '').replace(/"/g, '""')}"`,
          `"${(r.email || '').replace(/"/g, '""')}"`,
          r.role,
          new Date(r.timestamp).toISOString(),
          r.ip_address,
          `"${(r.user_agent || '').replace(/"/g, '""')}"`,
          r.status,
          r.action
        ].join(',')
      )
    ];

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.csv"');
    res.send(csv);

  } catch (err) {
    console.error('[CSV Export Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/reports/summary
 * Returns a high-level summary for the reports page.
 */
router.get('/summary', requireRole('admin', 'faculty'), async (req, res) => {
  try {
    const [logStats] = await pool.execute(`
      SELECT
        COUNT(*) AS total_logs,
        SUM(status = 'success') AS successful,
        SUM(status = 'failure') AS failed,
        COUNT(DISTINCT user_id) AS unique_users
      FROM logs
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    const [alertStats] = await pool.execute(`
      SELECT
        COUNT(*) AS total_alerts,
        SUM(severity = 'high') AS high,
        SUM(severity = 'medium') AS medium,
        SUM(severity = 'low') AS low
      FROM alerts
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    const [topRisk] = await pool.execute(`
      SELECT name, email, role, risk_score,
        CASE
          WHEN risk_score >= 60 THEN 'high'
          WHEN risk_score >= 30 THEN 'medium'
          ELSE 'low'
        END AS risk_level
      FROM users
      ORDER BY risk_score DESC
      LIMIT 5
    `);

    res.json({
      period: '30 days',
      logs:   logStats[0],
      alerts: alertStats[0],
      top_risk_users: topRisk
    });
  } catch (err) {
    console.error('[Summary Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
