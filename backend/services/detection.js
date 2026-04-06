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
  const conn = await pool.getConnection();
  try {
    const alerts = [];

    // ── Rule 1: Failed Logins ──────────────────────────────────────────────
    const windowStart1 = new Date(timestamp - RULES.FAILED_LOGINS.window * 60 * 1000);
    const [failedRows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM logs
       WHERE user_id = ? AND status = 'failure'
       AND timestamp >= ?`,
      [userId, windowStart1]
    );
    const failedCount = failedRows[0].cnt;

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
    const [ipRows] = await conn.execute(
      `SELECT COUNT(DISTINCT ip_address) AS cnt FROM logs
       WHERE user_id = ? AND status = 'success'
       AND timestamp >= ?`,
      [userId, windowStart2]
    );
    const distinctIPs = ipRows[0].cnt;

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
      const [existing] = await conn.execute(
        `SELECT id FROM alerts
         WHERE user_id = ? AND type = ?
         AND timestamp >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
        [alert.user_id, alert.type]
      );
      if (existing.length === 0) {
        await conn.execute(
          `INSERT INTO alerts (user_id, type, message, severity, timestamp, resolved)
           VALUES (?, ?, ?, ?, ?, FALSE)`,
          [alert.user_id, alert.type, alert.message, alert.severity, alert.timestamp]
        );
      }
    }

    // ── Update Risk Score ──────────────────────────────────────────────────
    await updateRiskScore(userId, conn);

  } finally {
    conn.release();
  }
}

/**
 * Recalculate and persist a user's risk score based on recent alert history.
 */
async function updateRiskScore(userId, conn) {
  const [alertRows] = await conn.execute(
    `SELECT type, COUNT(*) AS cnt FROM alerts
     WHERE user_id = ? AND resolved = FALSE
     AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
     GROUP BY type`,
    [userId]
  );

  let score = 0;
  for (const row of alertRows) {
    if (row.type === 'failed_logins') score += row.cnt * RULES.FAILED_LOGINS.score;
    if (row.type === 'ip_anomaly')    score += row.cnt * RULES.IP_ANOMALY.score;
  }

  score = Math.min(score, 100);
  await conn.execute(
    `UPDATE users SET risk_score = ? WHERE id = ?`,
    [score, userId]
  );
}

module.exports = { runDetection };
