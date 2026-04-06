const { pool } = require('../config/db');

/**
 * Rule-Based Suspicious Activity Detection Engine
 *
 * Rules:
 *  1. FAILED_LOGINS  — More than 3 failed logins in the last 30 minutes
 *  2. IP_ANOMALY     — Login from 2+ different IPs within the last 1 hour
 *
 * Risk Score = failed_logins * 20 + ip_anomaly * 15 (capped at 100)
 */

const RULES = {
  FAILED_LOGINS: { window: 30, threshold: 3, score: 20, severity: 'high' },
  IP_ANOMALY:    { window: 60, threshold: 2, score: 15, severity: 'medium' }
};

/**
 * Run all detection rules for a specific login event.
 * Called immediately after every login attempt.
 */
async function runDetection(userId, ip, status, timestamp) {
  const client = await pool.connect();
  try {
    const alerts = [];

    // ── Rule 1: Failed Logins ──────────────────────────────────────────────
    const windowStart1 = new Date(timestamp - RULES.FAILED_LOGINS.window * 60 * 1000);
    const failedRes = await client.query(
      `SELECT COUNT(*) AS cnt FROM logs
       WHERE user_id = $1 AND status = 'failure'
       AND timestamp >= $2`,
      [userId, windowStart1]
    );
    const failedCount = parseInt(failedRes.rows[0].cnt);

    if (failedCount > RULES.FAILED_LOGINS.threshold) {
      alerts.push({
        user_id:   userId,
        type:      'failed_logins',
        message:   `${failedCount} failed login attempts detected in the last 30 minutes.`,
        severity:  RULES.FAILED_LOGINS.severity,
        timestamp: new Date(timestamp)
      });
    }

    // ── Rule 2: IP Anomaly ─────────────────────────────────────────────────
    const windowStart2 = new Date(timestamp - RULES.IP_ANOMALY.window * 60 * 1000);
    const ipRes = await client.query(
      `SELECT COUNT(DISTINCT ip_address) AS cnt FROM logs
       WHERE user_id = $1 AND status = 'success'
       AND timestamp >= $2`,
      [userId, windowStart2]
    );
    const distinctIPs = parseInt(ipRes.rows[0].cnt);

    if (distinctIPs >= RULES.IP_ANOMALY.threshold) {
      alerts.push({
        user_id:   userId,
        type:      'ip_anomaly',
        message:   `Login from ${distinctIPs} different IP addresses within the last hour.`,
        severity:  RULES.IP_ANOMALY.severity,
        timestamp: new Date(timestamp)
      });
    }



    // ── Insert Alerts ──────────────────────────────────────────────────────
    for (const alert of alerts) {
      // Avoid duplicate alerts (same user + same type in last 10 min)
      const existing = await client.query(
        `SELECT id FROM alerts
         WHERE user_id = $1 AND type = $2
         AND timestamp >= NOW() - INTERVAL '10 minutes'`,
        [alert.user_id, alert.type]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO alerts (user_id, type, message, severity, timestamp, resolved)
           VALUES ($1, $2, $3, $4, $5, FALSE)`,
          [alert.user_id, alert.type, alert.message, alert.severity, alert.timestamp]
        );
      }
    }

    // ── Update Risk Score ──────────────────────────────────────────────────
    await updateRiskScore(userId, client);

  } finally {
    client.release();
  }
}

/**
 * Recalculate and persist a user's risk score based on recent alert history.
 */
async function updateRiskScore(userId, client) {
  const res = await client.query(
    `SELECT type, COUNT(*) AS cnt FROM alerts
     WHERE user_id = $1 AND resolved = FALSE
     AND timestamp >= NOW() - INTERVAL '24 hours'
     GROUP BY type`,
    [userId]
  );

  let score = 0;
  for (const row of res.rows) {
    const count = parseInt(row.cnt);
    if (row.type === 'failed_logins') score += count * RULES.FAILED_LOGINS.score;
    if (row.type === 'ip_anomaly')    score += count * RULES.IP_ANOMALY.score;
  }

  score = Math.min(score, 100);
  await client.query(
    `UPDATE users SET risk_score = $1 WHERE id = $2`,
    [score, userId]
  );
}

module.exports = { runDetection };
