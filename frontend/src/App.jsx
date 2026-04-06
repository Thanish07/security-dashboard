import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute   from './components/ProtectedRoute'
import Sidebar          from './components/Sidebar'
import TopBar           from './components/TopBar'
import Login            from './pages/Login'
import Dashboard        from './pages/Dashboard'
import Logs             from './pages/Logs'
import Alerts           from './pages/Alerts'
import Users            from './pages/Users'
import Reports          from './pages/Reports'
import StudentPortal    from './pages/StudentPortal'
import client           from './api/client'

function AppShell() {
  const { user } = useAuth()
  const [isDark,     setDark]     = useState(true)
  const [alertCount, setAlertCount] = useState(0)

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Restore theme
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setDark(saved === 'dark')
  }, [])

  // Fetch open alert count for sidebar badge
  useEffect(() => {
    if (!user || user.role !== 'admin') return
    async function fetchCount() {
      try {
        const res = await client.get('/alerts/summary')
        setAlertCount(res.data.total || 0)
      } catch (_) {}
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  if (!user) {
    // Unauthenticated: only show login
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div className="app-layout">
      <Sidebar alertCount={alertCount} />
      <div className="main-content">
        <TopBar
          onThemeToggle={() => setDark(d => !d)}
          isDark={isDark}
        />
        <Routes>
          {/* Admin */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute roles={['admin']}>
                <Alerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* Admin + Faculty */}
          <Route
            path="/logs"
            element={
              <ProtectedRoute roles={['admin', 'faculty']}>
                <Logs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['admin', 'faculty']}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Student */}
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={['student', 'admin', 'faculty']}>
                <StudentPortal />
              </ProtectedRoute>
            }
          />

          {/* Default redirects */}
          <Route path="/login" element={<Navigate to={
            user.role === 'admin' ? '/dashboard' :
            user.role === 'faculty' ? '/logs' : '/student'
          } replace />} />
          <Route path="/" element={<Navigate to={
            user.role === 'admin' ? '/dashboard' :
            user.role === 'faculty' ? '/logs' : '/student'
          } replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
