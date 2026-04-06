import { useEffect, useState } from 'react'
import client   from '../api/client'
import RiskBadge from '../components/RiskBadge'

export default function Users() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoad]    = useState(true)
  const [modal,   setModal]   = useState(null)  // null | 'create' | 'edit'
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({ name: '', email: '', password: '', role: 'student' })
  const [err,     setErr]     = useState('')
  const [saving,  setSaving]  = useState(false)

  async function fetchUsers() {
    setLoad(true)
    try {
      const res = await client.get('/users')
      setUsers(res.data.users || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoad(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  function openCreate() {
    setForm({ name: '', email: '', password: '', role: 'student' })
    setEditing(null)
    setErr('')
    setModal('create')
  }

  function openEdit(user) {
    setForm({ name: user.name, email: user.email, password: '', role: user.role })
    setEditing(user)
    setErr('')
    setModal('edit')
  }

  async function handleSave() {
    setSaving(true)
    setErr('')
    try {
      if (modal === 'create') {
        await client.post('/users', form)
      } else {
        const payload = { name: form.name, email: form.email, role: form.role }
        if (form.password) payload.password = form.password
        await client.put(`/users/${editing.id}`, payload)
      }
      setModal(null)
      fetchUsers()
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    try {
      await client.delete(`/users/${id}`)
      fetchUsers()
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-desc">Manage accounts and monitor risk scores</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={openCreate} id="add-user-btn">
          ＋ Add User
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /> Loading users…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon">👤</div>
                      <div className="empty-text">No users found</div>
                    </div>
                  </td>
                </tr>
              ) : users.map((u, i) => {
                const level = u.risk_score >= 60 ? 'high' : u.risk_score >= 30 ? 'medium' : 'low'
                return (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                        {u.name}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{u.email}</td>
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
                    <td><RiskBadge level={level} /></td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => openEdit(u)}
                          id={`edit-user-${u.id}`}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => handleDelete(u.id)}
                          id={`delete-user-${u.id}`}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-title">
              {modal === 'create' ? '➕ Add New User' : `✏️ Edit User — ${editing?.name}`}
            </div>

            {err && (
              <div className="login-error" style={{ marginBottom: 14 }}>
                <span>⚠️</span> {err}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                placeholder="e.g. John Smith"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                id="form-name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="user@college.edu"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                id="form-email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Password {modal === 'edit' && <span style={{ color: 'var(--text-muted)', textTransform: 'none' }}>(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                id="form-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                id="form-role"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                id="save-user-btn"
              >
                {saving ? '⏳ Saving…' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
