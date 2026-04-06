import { useEffect, useState } from 'react'
import StatCard   from '../components/StatCard'
import LoginChart from '../components/LoginChart'
import RiskChart  from '../components/RiskChart'
import RiskBadge  from '../components/RiskBadge'
import client     from '../api/client'

export default function Dashboard() {
  const [stats,  setStats]  = useState(null)
  const [users,  setUsers]  = useState([])
  const [alerts, setAlerts] = useState({ high: 0, medium: 0, low: 0, total: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoad]  = useState(true)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [statsRes, usersRes, alertsRes, logsRes] = await Promise.all([
          client.get('/logs/stats'),
          client.get('/users'),
          client.get('/alerts/summary'),
          client.get('/logs?limit=6'),
        ])
        setStats(statsRes.data)
        setUsers(usersRes.data.users || [])
        setAlerts(alertsRes.data)
        setRecent(logsRes.data.logs || [])
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoad(false)
      }
    }
    fetchAll()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="loading-wrap" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        Loading dashboard…
      </div>
    )
  }

  const summary = stats?.summary || {}
  const daily   = stats?.daily   || []

  return (
    <div className="page-body">
      <div className="page-header">
        <h1 className="page-title">Security Overview</h1>
        <p className="page-desc">Real-time monitoring of academic user activity</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        <StatCard
          label="Today's Logins"
          value={summary.total_logins || 0}
          icon="🔐"
          color="blue"
          sub="Total login attempts today"
        />
        <StatCard
          label="Successful"
          value={summary.successful || 0}
          icon="✅"
          color="green"
          sub="Authenticated sessions"
        />
        <StatCard
          label="Failed"
          value={summary.failed || 0}
          icon="❌"
          color="red"
          sub="Blocked login attempts"
        />
        <StatCard
          label="Active Users"
          value={summary.active_users || 0}
          icon="👥"
          color="purple"
          sub="Unique logins today"
        />
        <StatCard
          label="Open Alerts"
          value={alerts.total || 0}
          icon="🚨"
          color="amber"
          sub={`${alerts.high || 0} high severity`}
        />
      </div>

      {/* ── Charts ── */}
      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Login Activity — Last 7 Days</div>
              <div className="chart-subtitle">Successful vs failed login attempts</div>
            </div>
          </div>
          <LoginChart daily={daily} />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">User Risk Distribution</div>
              <div className="chart-subtitle">Based on behaviour scores</div>
            </div>
          </div>
          <RiskChart users={users} />
        </div>
      </div>

      {/* ── Two-column bottom section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Recent Activity */}
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">🕐 Recent Activity</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>IP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">No recent activity</div>
                  </td>
                </tr>
              ) : recent.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                      {log.user_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{log.action}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{log.ip_address}</td>
                  <td><span className={`badge ${log.status}`}>{log.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* High-Risk Users */}
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">⚠️ High-Risk Users</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.risk_score > 0).slice(0, 6).map((u) => {
                const level = u.risk_score >= 60 ? 'high' : u.risk_score >= 30 ? 'medium' : 'low'
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td><span className={`badge ${u.role}`}>{u.role}</span></td>
                    <td>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar-track">
                          <div
                            className={`risk-bar-fill ${level}`}
                            style={{ width: `${u.risk_score}%` }}
                          />
                        </div>
                        <span className={`risk-score-num ${level}`}>{u.risk_score}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.filter(u => u.risk_score > 0).length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">✅ No at-risk users</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
