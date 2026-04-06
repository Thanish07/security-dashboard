import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate   = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter email and password'); return }
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'admin')   navigate('/dashboard')
      else if (user.role === 'faculty') navigate('/logs')
      else navigate('/student')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function fillCreds(e, f, p) {
    e.preventDefault()
    setEmail(f)
    setPass(p)
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-bg-glow blue" />
      <div className="login-bg-glow purple" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🛡️</div>
          <div className="login-logo-text">
            Student <span>Academic</span><br />
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
              Security Analysis Platform
            </span>
          </div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to access the security dashboard</p>

        {/* Error */}
        {error && (
          <div className="login-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-group">
              <span className="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                className="form-input with-icon"
                placeholder="you@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type="password"
                className="form-input with-icon"
                placeholder="••••••••"
                value={password}
                onChange={e => setPass(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
            id="login-submit"
          >
            {loading ? '⏳ Signing in…' : '🔐 Sign In'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="demo-creds">
          <div className="demo-creds-title">🧪 Demo Credentials (click to fill)</div>
          {[
            { role: 'Admin',   email: 'admin@college.edu',  pass: 'admin123' },
            { role: 'Faculty', email: 'schen@college.edu',  pass: 'faculty123' },
            { role: 'Student', email: 'alice@college.edu',  pass: 'student123' },
          ].map(({ role, email: e, pass: p }) => (
            <div key={role} className="demo-cred-row">
              <span className="demo-cred-label">{role}</span>
              <span
                className="demo-cred-value"
                onClick={(ev) => fillCreds(ev, e, p)}
                title="Click to fill"
              >
                {e} / {p}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
