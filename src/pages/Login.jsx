import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const ROLES = [
  { key: 'coordinadora', label: 'Coordinadora', icon: '📋' },
  { key: 'jefe',         label: 'Jefe',          icon: '👔' },
  { key: 'supervisor',   label: 'Supervisor',     icon: '👁' },
  { key: 'dx',           label: 'DX / ADR',       icon: '🎙' },
  { key: 'fx',           label: 'FX',             icon: '💥' },
  { key: 'foley',        label: 'Foley',          icon: '👟' },
  { key: 'musica',       label: 'Musicalización', icon: '🎵' },
  { key: 'vfx',          label: 'VFX',            icon: '✨' },
  { key: 'mezcla',       label: 'Mezcla',         icon: '🎚' },
]

export default function Login() {
  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [step, setStep]           = useState('role') // 'role' | 'password'
  const [selectedRole, setSelectedRole] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/series')
    } catch (err) {
      setError('Correo o contraseña incorrectos.')
    }
    setLoading(false)
  }

  const handleReset = async () => {
    if (!email) {
      // Si no hay correo escrito, pedir que lo ingrese
      setError('Escribe tu correo arriba y luego haz clic en "¿Olvidaste tu contraseña?"')
      return
    }
    try {
      await resetPassword(email)
      setResetSent(true)
      setError('')
    } catch(e) {
      setError('No encontramos ese correo. Verifica que esté bien escrito.')
    }
  }

  const selectRole = (role) => {
    setSelectedRole(role)
    setStep('password')
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>🎚</div>
        <h1 style={S.title}>Post Producción de Sonido</h1>

        {step === 'role' && (
          <>
            <p style={S.sub}>Selecciona tu rol para continuar</p>
            <div style={S.roleGrid}>
              {ROLES.map(r => (
                <div key={r.key} style={S.roleBtn} onClick={() => selectRole(r)}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{r.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 500 }}>{r.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 'password' && (
          <>
            <div style={S.roleSelected}>
              <span style={{ fontSize: 18 }}>{selectedRole?.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedRole?.label}</span>
              <span style={{ fontSize: 12, color: '#888', cursor: 'pointer', marginLeft: 'auto' }} onClick={() => setStep('role')}>← cambiar</span>
            </div>
            <p style={S.sub}>Ingresa con tu correo</p>
            <form onSubmit={handleLogin} style={S.form}>
              <div style={S.field}>
                <label style={S.label}>Correo electrónico</label>
                <input style={S.input} type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="tu@gmail.com" required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Contraseña</label>
                <input style={S.input} type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              {error && <p style={S.error}>{error}</p>}
              {resetSent && <p style={S.success}>Te enviamos un correo para restablecer tu contraseña.</p>}
              <button style={S.btn} type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <p style={S.forgot} onClick={handleReset}>¿Olvidaste tu contraseña?</p>
            <p style={S.hint}>Si es tu primera vez, revisa tu correo — el jefe te envió una invitación.</p>
          </>
        )}
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', fontFamily: "'DM Sans', sans-serif" },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: '2rem 1.75rem', width: 400, maxWidth: '95vw', textAlign: 'center' },
  logo: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 6px' },
  sub: { fontSize: 12, color: '#888', margin: '0 0 1.25rem' },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: '0.5rem' },
  roleBtn: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 8px', cursor: 'pointer', transition: '.15s', color: '#fff' },
  roleSelected: { display: 'flex', alignItems: 'center', gap: 8, background: '#111', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid #333', color: '#fff' },
  form: { textAlign: 'left' },
  field: { marginBottom: 14 },
  label: { fontSize: 12, color: '#aaa', display: 'block', marginBottom: 5 },
  input: { width: '100%', padding: '10px 12px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '11px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 6 },
  error: { color: '#F09595', fontSize: 12, margin: '8px 0' },
  success: { color: '#9FE1CB', fontSize: 12, margin: '8px 0' },
  forgot: { fontSize: 12, color: '#1D9E75', cursor: 'pointer', margin: '14px 0 8px', textDecoration: 'underline' },
  hint: { fontSize: 11, color: '#555', lineHeight: 1.5, marginTop: 6 },
}
