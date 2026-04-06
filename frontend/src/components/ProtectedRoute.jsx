import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps a route and redirects unauthorized users.
 * @param {string[]} roles - Allowed roles (empty = any authenticated user)
 */
export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-wrap" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles.length > 0 && !roles.includes(user.role)) {
    // Redirect to appropriate default page based on role
    if (user.role === 'faculty') return <Navigate to="/logs" replace />
    if (user.role === 'student') return <Navigate to="/student" replace />
    return <Navigate to="/login" replace />
  }

  return children
}
