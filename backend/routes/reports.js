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
      params.push(new Date(req.query.from));
      conditions.push(`l.timestamp >= $${params.length}`);
    }
    if (req.query.to) {
      params.push(new Date(req.query.to));
      conditions.push(`l.timestamp <= $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      conditions.push(`l.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT l.id, u.name AS user_name, u.email, u.role,
              l.timestamp, l.ip_address, l.user_agent, l.status, l.action
       FROM logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${where}
       ORDER BY l.timestamp DESC
       LIMIT 10000
    `;

    const result = await pool.query(query, params);

    // Build CSV manually
    const headers = ['ID','User Name','Email','Role','Timestamp','IP Address','User Agent','Status','Action'];
    const csvRows = [
      headers.join(','),
      ...result.rows.map(r =>
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
    const logStatsRes = await pool.query(`
      SELECT
        COUNT(*) AS total_logs,
        COUNT(*) FILTER (WHERE status = 'success') AS successful,
        COUNT(*) FILTER (WHERE status = 'failure') AS failed,
        COUNT(DISTINCT user_id) AS unique_users
      FROM logs
      WHERE timestamp >= NOW() - INTERVAL '30 days'
    `);

    const alertStatsRes = await pool.query(`
      SELECT
        COUNT(*) AS total_alerts,
        COUNT(*) FILTER (WHERE severity = 'high') AS high,
        COUNT(*) FILTER (WHERE severity = 'medium') AS medium,
        COUNT(*) FILTER (WHERE severity = 'low') AS low
      FROM alerts
      WHERE timestamp >= NOW() - INTERVAL '30 days'
    `);

    const topRiskRes = await pool.query(`
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
      logs:   logStatsRes.rows[0],
      alerts: alertStatsRes.rows[0],
      top_risk_users: topRiskRes.rows
    });
  } catch (err) {
    console.error('[Summary Error]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
