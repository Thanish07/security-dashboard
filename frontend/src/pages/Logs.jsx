import { useEffect, useState, useCallback } from 'react'
import client from '../api/client'

const STATUS_OPTIONS = ['', 'success', 'failure']
const ACTION_OPTIONS = ['', 'login', 'logout']

export default function Logs() {
  const [logs,    setLogs]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [pages,   setPages]   = useState(1)
  const [loading, setLoad]    = useState(true)

  // Filters
  const [status,  setStatus]  = useState('')
  const [action,  setAction]  = useState('')
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')

  const LIMIT = 15

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoad(true)
    try {
      const params = { page: pg, limit: LIMIT }
      if (status) params.status = status
      if (action) params.action = action
      if (from)   params.from   = from
      if (to)     params.to     = to

      const res = await client.get('/logs', { params })
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
      setPage(pg)
    } catch (err) {
      console.error('Logs fetch error:', err)
    } finally {
      setLoad(false)
    }
  }, [status, action, from, to])

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  function formatDate(ts) {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <h1 className="page-title">Activity Logs</h1>
        <p className="page-desc">Full audit trail of all login and logout events</p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select
          className="filter-select"
          value={status}
          onChange={e => setStatus(e.target.value)}
          id="filter-status"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o} value={o}>{o ? o.charAt(0).toUpperCase() + o.slice(1) : 'All Statuses'}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={action}
          onChange={e => setAction(e.target.value)}
          id="filter-action"
        >
          {ACTION_OPTIONS.map(o => (
            <option key={o} value={o}>{o ? o.charAt(0).toUpperCase() + o.slice(1) : 'All Actions'}</option>
          ))}
        </select>

        <input
          type="date"
          className="filter-input"
          value={from}
          onChange={e => setFrom(e.target.value)}
          id="filter-from"
          title="From date"
        />

        <input
          type="date"
          className="filter-input"
          value={to}
          onChange={e => setTo(e.target.value)}
          id="filter-to"
          title="To date"
        />

        <button
          className="btn btn-outline"
          onClick={() => { setStatus(''); setAction(''); setFrom(''); setTo('') }}
          id="clear-filters"
        >
          ✕ Clear
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
          {total.toLocaleString()} records
        </span>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            Loading logs…
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Timestamp</th>
                  <th>IP Address</th>
                  <th>Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <div className="empty-text">No logs found</div>
                      </div>
                    </td>
                  </tr>
                ) : logs.map((log, i) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {(page - 1) * LIMIT + i + 1}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                        {log.user_name || 'Unknown'}
                      </div>
                    </td>
                    <td>
                      {log.role && <span className={`badge ${log.role}`}>{log.role}</span>}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{log.ip_address}</td>
                    <td style={{ textTransform: 'capitalize' }}>{log.action}</td>
                    <td><span className={`badge ${log.status}`}>{log.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => fetchLogs(page - 1)}
                  disabled={page === 1}
                >‹</button>

                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  const p = i + 1
                  return (
                    <button
                      key={p}
                      className={`page-btn${page === p ? ' active' : ''}`}
                      onClick={() => fetchLogs(p)}
                    >{p}</button>
                  )
                })}

                <button
                  className="page-btn"
                  onClick={() => fetchLogs(page + 1)}
                  disabled={page === pages}
                >›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
