import { useEffect, useState } from 'react'
import client from '../api/client'

export default function Reports() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoad]    = useState(true)

  // CSV filter state
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')
  const [status,  setStatus]  = useState('')

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await client.get('/reports/summary')
        setSummary(res.data)
      } catch (err) {
        console.error('Reports fetch error:', err)
      } finally {
        setLoad(false)
      }
    }
    fetchSummary()
  }, [])

  async function downloadCSV() {
    const params = new URLSearchParams()
    if (from)   params.append('from',   from)
    if (to)     params.append('to',     to)
    if (status) params.append('status', status)
    const token = localStorage.getItem('token')
    const qs    = params.toString()
    const url   = `/api/reports/logs.csv${qs ? '?' + qs : ''}`

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        console.error('CSV export failed:', res.status, res.statusText)
        return
      }

      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = 'activity-logs.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch (err) {
      console.error('CSV download error:', err)
    }
  }

  if (loading) {
    return (
      <div className="loading-wrap" style={{ minHeight: '60vh' }}>
        <div className="spinner" /> Loading reports…
      </div>
    )
  }

  const logs   = summary?.logs   || {}
  const alerts = summary?.alerts || {}
  const top    = summary?.top_risk_users || []

  return (
    <div className="page-body">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-desc">30-day summary and CSV export</p>
      </div>

      {/* 30-day Log Summary */}
      <div className="report-section">
        <div className="report-section-title">📋 Login Statistics (Last 30 Days)</div>
        <div className="stat-grid">
          {[
            { label: 'Total Events',    value: logs.total_logs   || 0, color: 'blue',   icon: '📊' },
            { label: 'Successful',      value: logs.successful   || 0, color: 'green',  icon: '✅' },
            { label: 'Failed',          value: logs.failed       || 0, color: 'red',    icon: '❌' },
            { label: 'Unique Users',    value: logs.unique_users || 0, color: 'purple', icon: '👥' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`stat-card ${color}`}>
              <div className="stat-top">
                <div className="stat-label">{label}</div>
                <div className={`stat-icon ${color}`}>{icon}</div>
              </div>
              <div className="stat-value">{Number(value).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Summary */}
      <div className="report-section">
        <div className="report-section-title">🚨 Alert Summary (Last 30 Days)</div>
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Total Alerts', value: alerts.total_alerts || 0, color: 'amber', icon: '🚨' },
            { label: 'High',         value: alerts.high         || 0, color: 'red',   icon: '🔴' },
            { label: 'Medium',       value: alerts.medium       || 0, color: 'amber', icon: '🟡' },
            { label: 'Low',          value: alerts.low          || 0, color: 'green', icon: '🟢' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`stat-card ${color}`}>
              <div className="stat-top">
                <div className="stat-label">{label}</div>
                <div className={`stat-icon ${color}`}>{icon}</div>
              </div>
              <div className="stat-value">{Number(value).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Risk Users */}
      <div className="report-section">
        <div className="report-section-title">⚠️ Top High-Risk Users</div>
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Risk Score</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">✅ No high-risk users</div>
                  </td>
                </tr>
              ) : top.map((u, i) => {
                const level = u.risk_level || (u.risk_score >= 60 ? 'high' : u.risk_score >= 30 ? 'medium' : 'low')
                return (
                  <tr key={u.email}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>#{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                    <td style={{ fontSize: 12 }}>{u.email}</td>
                    <td><span className={`badge ${u.role}`}>{u.role}</span></td>
                    <td>
                      <div className="risk-bar-wrap">
                        <div className="risk-bar-track">
                          <div className={`risk-bar-fill ${level}`} style={{ width: `${u.risk_score}%` }} />
                        </div>
                        <span className={`risk-score-num ${level}`}>{u.risk_score}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${level}`}>{level}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Export */}
      <div className="report-section">
        <div className="report-section-title">📥 Export Activity Logs</div>
        <div className="table-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 13 }}>
            Download activity logs as a CSV file. Optionally filter by date range and status.
          </div>
          <div className="filters-bar" style={{ marginBottom: 18 }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>From</label>
              <input type="date" className="filter-input" value={from} onChange={e => setFrom(e.target.value)} id="csv-from" />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>To</label>
              <input type="date" className="filter-input" value={to}   onChange={e => setTo(e.target.value)}   id="csv-to" />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 4 }}>Status</label>
              <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)} id="csv-status">
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={downloadCSV}
            id="download-csv-btn"
          >
            ⬇️ Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
