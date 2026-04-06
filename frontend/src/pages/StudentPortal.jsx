import { useAuth } from '../context/AuthContext'

export default function StudentPortal() {
  const { user } = useAuth()

  return (
    <div className="page-body">
      <div className="page-header">
        <h1 className="page-title">Student Portal</h1>
        <p className="page-desc">Your account information</p>
      </div>

      <div className="table-card" style={{ maxWidth: 520, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800,
            boxShadow: '0 0 20px rgba(59,130,246,0.3)'
          }}>
            {user?.name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
            <span className="badge student" style={{ marginTop: 6 }}>Student</span>
          </div>
        </div>

        <div style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: 'var(--radius-md)',
          padding: 20
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 12 }}>
            ℹ️ Access Notice
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            As a student, you have limited access to this system. Your login activity is 
            being monitored for security purposes by system administrators. If you believe
            your account has been compromised, please contact the IT helpdesk.
          </p>
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: 'Account Status', value: '🟢 Active' },
            { label: 'Access Level',   value: 'Standard' },
            { label: 'Department',     value: 'Academic' },
            { label: 'Last Login',     value: 'Today' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
