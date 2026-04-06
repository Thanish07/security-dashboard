import { useEffect, useState } from 'react'

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard',      sub: 'Security overview & analytics' },
  '/logs':      { title: 'Activity Logs',  sub: 'Monitor all login events' },
  '/alerts':    { title: 'Alerts',         sub: 'Suspicious activity warnings' },
  '/users':     { title: 'User Management',sub: 'Manage users & risk levels' },
  '/reports':   { title: 'Reports',        sub: 'Export and summarize data' },
  '/student':   { title: 'My Account',     sub: 'Student portal' },
}

export default function TopBar({ onThemeToggle, isDark }) {
  const [path, setPath]   = useState(window.location.pathname)
  const [time, setTime]   = useState(new Date())

  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const current = Object.entries(PAGE_TITLES).find(([k]) => path.startsWith(k))
  const { title = 'Dashboard', sub = '' } = current ? current[1] : {}

  const timeStr = time.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  })
  const dateStr = time.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        <div className="topbar-subtitle">{sub}</div>
      </div>

      <div className="topbar-right">
        <div style={{ textAlign: 'right', marginRight: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{timeStr}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateStr}</div>
        </div>

        <button
          className="icon-btn"
          title="Toggle theme"
          onClick={onThemeToggle}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
