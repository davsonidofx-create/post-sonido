import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [resetSent, setResetSent] = useState(false)

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
    if (!email) { setError('Ingresa tu correo primero.'); return }
    await resetPassword(email)
    setResetSent(true)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🎚</div>
        <h1 style={styles.title}>Post Producción de Sonido</h1>
        <p style={styles.sub}>Accede con tu cuenta</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Correo electrónico</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          {resetSent && <p style={styles.success}>Te enviamos un correo para restablecer tu contraseña.</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={styles.forgot} onClick={handleReset}>¿Olvidaste tu contraseña?</p>
        <p style={styles.hint}>
          Si es tu primera vez, revisa tu correo —<br />
          el jefe te envió una invitación para crear tu cuenta.
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f', fontFamily: "'DM Sans', sans-serif" },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: '2.5rem 2rem', width: 380, maxWidth: '95vw', textAlign: 'center' },
  logo: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 600, color: '#fff', margin: '0 0 6px' },
  sub: { fontSize: 13, color: '#888', margin: '0 0 1.5rem' },
  form: { textAlign: 'left' },
  field: { marginBottom: 14 },
  label: { fontSize: 12, color: '#aaa', display: 'block', marginBottom: 5 },
  input: { width: '100%', padding: '10px 12px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '11px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 6 },
  error: { color: '#F09595', fontSize: 12, margin: '8px 0' },
  success: { color: '#9FE1CB', fontSize: 12, margin: '8px 0' },
  forgot: { fontSize: 12, color: '#1D9E75', cursor: 'pointer', margin: '16px 0 10px' },
  hint: { fontSize: 11, color: '#555', lineHeight: 1.5, marginTop: 8 },
}
