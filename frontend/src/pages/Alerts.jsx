import { useEffect, useState, useCallback } from 'react'
import client from '../api/client'

const SEVERITY_OPTIONS = ['', 'high', 'medium', 'low']
const TYPE_OPTIONS = ['', 'failed_logins', 'ip_anomaly']

const TYPE_LABELS = {
  failed_logins: 'Failed Logins',
  ip_anomaly:    'IP Anomaly',
}

const TYPE_ICONS = {
  failed_logins: '🔐',
  ip_anomaly:    '🌐',
}

export default function Alerts() {
  const [alerts,   setAlerts]   = useState([])
  const [summary,  setSummary]  = useState({ high: 0, medium: 0, low: 0, total: 0 })
  const [severity, setSeverity] = useState('')
  const [type,     setType]     = useState('')
  const [resolved, setResolved] = useState('false')
  const [loading,  setLoad]     = useState(true)

  const fetchAlerts = useCallback(async () => {
    setLoad(true)
    try {
      const params = {}
      if (severity) params.severity = severity
      if (type)     params.type     = type
      if (resolved !== '') params.resolved = resolved

      const [alertsRes, summRes] = await Promise.all([
        client.get('/alerts', { params }),
        client.get('/alerts/summary'),
      ])
      setAlerts(alertsRes.data.alerts || [])
      setSummary(summRes.data)
    } catch (err) {
      console.error('Alerts fetch error:', err)
    } finally {
      setLoad(false)
    }
  }, [severity, type, resolved])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  async function handleResolve(id) {
    try {
      await client.patch(`/alerts/${id}/resolve`)
      fetchAlerts()
    } catch (err) {
      console.error('Resolve error:', err)
    }
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <h1 className="page-title">Security Alerts</h1>
        <p className="page-desc">Rule-based suspicious activity detections</p>
      </div>

      {/* Summary cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Open',  value: summary.total,  color: 'blue',  icon: '🚨' },
          { label: 'High',        value: summary.high,   color: 'red',   icon: '🔴' },
          { label: 'Medium',      value: summary.medium, color: 'amber', icon: '🟡' },
          { label: 'Low',         value: summary.low,    color: 'green', icon: '🟢' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`stat-card ${color}`}>
            <div className="stat-top">
              <div className="stat-label">{label}</div>
              <div className={`stat-icon ${color}`}>{icon}</div>
            </div>
            <div className="stat-value">{value ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select
          className="filter-select"
          value={severity}
          onChange={e => setSeverity(e.target.value)}
          id="filter-severity"
        >
          {SEVERITY_OPTIONS.map(o => (
            <option key={o} value={o}>
              {o ? o.charAt(0).toUpperCase() + o.slice(1) : 'All Severities'}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={type}
          onChange={e => setType(e.target.value)}
          id="filter-type"
        >
          {TYPE_OPTIONS.map(o => (
            <option key={o} value={o}>
              {o ? TYPE_LABELS[o] : 'All Types'}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={resolved}
          onChange={e => setResolved(e.target.value)}
          id="filter-resolved"
        >
          <option value="">All</option>
          <option value="false">Open</option>
          <option value="true">Resolved</option>
        </select>

        <button
          className="btn btn-outline"
          onClick={() => { setSeverity(''); setType(''); setResolved('false') }}
        >
          ✕ Clear
        </button>
      </div>

      {/* Alert List */}
      <div className="table-card">
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /> Loading alerts…</div>
        ) : alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-icon">✅</div>
            <div className="empty-text">No alerts found</div>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="alert-item">
              <div className={`alert-dot ${alert.severity} pulse`} />
              <div className="alert-body">
                <div className="alert-user">
                  {TYPE_ICONS[alert.type]} {alert.user_name}
                  <span
                    style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}
                  >
                    ({alert.email})
                  </span>
                  <span className={`badge ${alert.severity}`} style={{ marginLeft: 8 }}>
                    {alert.severity}
                  </span>
                  <span className="badge" style={{ marginLeft: 6, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {TYPE_LABELS[alert.type]}
                  </span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-time">🕐 {formatDate(alert.timestamp)}</div>
              </div>
              {!alert.resolved && (
                <button
                  className="resolve-btn"
                  onClick={() => handleResolve(alert.id)}
                  id={`resolve-${alert.id}`}
                >
                  ✓ Resolve
                </button>
              )}
              {alert.resolved && (
                <span style={{ fontSize: 11, color: 'var(--accent-emerald)', fontWeight: 600, alignSelf: 'center' }}>
                  ✅ Resolved
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
