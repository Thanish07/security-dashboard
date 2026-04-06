import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = {
  admin: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/logs',      icon: '📋', label: 'Activity Logs' },
    { to: '/alerts',    icon: '🚨', label: 'Alerts', badge: true },
    { to: '/users',     icon: '👥', label: 'Users' },
    { to: '/reports',   icon: '📄', label: 'Reports' },
  ],
  faculty: [
    { to: '/logs',    icon: '📋', label: 'Activity Logs' },
    { to: '/reports', icon: '📄', label: 'Reports' },
  ],
  student: [
    { to: '/student', icon: '🎓', label: 'My Account' },
  ],
}

export default function Sidebar({ alertCount = 0 }) {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()

  const items = NAV_ITEMS[user?.role] || []
  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">🛡️</div>
        <div>
          <div className="logo-text">Student <span>Academic</span></div>
          <div className="logo-sub">Security Analysis Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && alertCount > 0 && (
              <span className="nav-badge">{alertCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button
          className="btn btn-danger"
          style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
          onClick={handleLogout}
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  )
}
