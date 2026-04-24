import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenSeries } from '../lib/db'
import { ROLES } from '../lib/constants'

export default function Series() {
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [series, setSeries] = useState([])

  useEffect(() => {
    return listenSeries(setSeries)
  }, [])

  const role = ROLES.find(r => r.key === userData?.role)
  const allowed = userData?.series || []

  const enter = (sid) => navigate(`/app/${sid}`)

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.appName}>Post Producción de Sonido</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            {role && <span style={{ ...styles.pill, background: role.bg, color: role.color }}>{role.icon} {role.label}</span>}
            <span style={styles.userName}>· {userData?.name}</span>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={logout}>Salir</button>
      </div>

      <div style={styles.content}>
        <h2 style={styles.greeting}>Hola, {userData?.name?.split(' ')[0]} 👋</h2>
        <p style={styles.sub}>Selecciona el proyecto en el que vas a trabajar</p>
        <div style={styles.grid}>
          {series.map(s => {
            const ok = allowed.includes(s.id)
            return (
              <div key={s.id}
                style={{ ...styles.card, ...(ok ? { borderColor: s.color, cursor: 'pointer' } : styles.locked) }}
                onClick={() => ok && enter(s.id)}>
                <div style={styles.cardIcon}>{ok ? '🎬' : '🔒'}</div>
                <div style={{ ...styles.cardTitle, color: ok ? s.color : '#666' }}>{s.name}</div>
                <div style={styles.cardMeta}>{s.caps} capítulos</div>
                {ok && role && (
                  <span style={{ ...styles.pill, background: s.bg || role.bg, color: s.color || role.color, marginTop: 8, display: 'inline-flex' }}>
                    {role.icon} {role.label}
                  </span>
                )}
                {!ok && <div style={styles.noAccess}>Sin acceso</div>}
              </div>
            )
          })}
          {series.length === 0 && (
            <p style={{ color: '#888', fontSize: 13 }}>No hay series disponibles aún.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', fontFamily: "'DM Sans', sans-serif", color: '#fff' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #222' },
  appName: { fontSize: 16, fontWeight: 600, color: '#fff' },
  pill: { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  userName: { fontSize: 11, color: '#888' },
  logoutBtn: { background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  content: { padding: '2rem 1.5rem' },
  greeting: { fontSize: 22, fontWeight: 600, margin: '0 0 4px' },
  sub: { fontSize: 13, color: '#888', margin: '0 0 1.5rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1rem', transition: '.15s' },
  locked: { opacity: .35, cursor: 'not-allowed' },
  cardIcon: { fontSize: 24, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 4 },
  cardMeta: { fontSize: 11, color: '#888' },
  noAccess: { fontSize: 11, color: '#666', marginTop: 8 },
}
