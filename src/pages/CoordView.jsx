import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenCaps, createCap, getTeamBySerie } from '../lib/db'
import { notifyCapituloSubido } from '../lib/email'
import { PHASE_STYLE } from '../lib/constants'

export default function CoordView() {
  const { serieId } = useParams()
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [caps, setCaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [num, setNum] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [notif, setNotif] = useState('')

  const [serieName, setSerieName] = useState('')

  useEffect(() => {
    if (!userData) {
      setLoading(true)
      return
    }
    setLoading(false)
    if (userData.series && !userData.series.includes(serieId)) { navigate('/series'); return }

    return listenCaps(serieId, setCaps)
  }, [serieId, userData])

  const notificar = async () => {
    const n = parseInt(num)
    if (!n || n < 1) { alert('Ingresa el número de capítulo.'); return }
    if (caps.find(c => c.num === n)) { alert('Este capítulo ya fue notificado.'); return }
    setSaving(true)
    await createCap({ serieId, num: n, notasCoord: notes, subidoBy: userData?.name, subidoAt: new Date().toISOString().split('T')[0] })
    setNum(''); setNotes('')
    // Enviar correos automáticos a todo el equipo
    try {
      const team = await getTeamBySerie(serieId)
      const teamEmails = team.filter(u => u.role !== 'coordinadora').map(u => u.email).filter(Boolean)
      const s = team[0]
      if (teamEmails.length > 0) {
        await notifyCapituloSubido(n, serieName || serieId, teamEmails, userData?.name, notes)
      }
    } catch (e) { console.log('Email skipped:', e) }
    setNotif(`Cap. ${n} notificado. Correos enviados al equipo.`)
    setTimeout(() => setNotif(''), 4000)
    setSaving(false)
  }

  const phBadge = (p) => {
    const st = PHASE_STYLE[p] || PHASE_STYLE['Pendiente']
    return <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{p || 'Pendiente'}</span>
  }

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.back} onClick={() => navigate('/series')}>← Series</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
            <span style={styles.pill}>📋 Coordinadora</span>
            <span style={{ fontSize: 11, color: '#888' }}>· {userData?.name}</span>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={logout}>Salir</button>
      </div>

      <div style={styles.content}>
        {notif && <div style={styles.notif}>{notif}</div>}

        <div style={styles.card}>
          <div style={styles.cardTitle}>Notificar nuevo capítulo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
            <div>
              <label style={styles.label}>Número de capítulo</label>
              <input style={styles.input} type="number" min="1" value={num} onChange={e => setNum(e.target.value)} placeholder="Ej: 5" />
            </div>
            <div>
              <label style={styles.label}>Notas para el equipo <span style={{ fontStyle: 'italic', color: '#888' }}>(opcional)</span></label>
              <textarea style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Indicaciones especiales..." />
            </div>
          </div>
          <button style={{ ...styles.btn, marginTop: 12, opacity: saving ? .6 : 1 }} onClick={notificar} disabled={saving}>
            {saving ? 'Notificando...' : 'Notificar a todos'}
          </button>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <div style={styles.sectionLabel}>Capítulos notificados</div>
          {caps.length === 0 && <p style={{ fontSize: 12, color: '#888' }}>Aún no has notificado capítulos.</p>}
          {caps.sort((a, b) => a.num - b.num).map(c => (
            <div key={c.id} style={styles.capRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600 }}>Cap. {c.num}</span>
                {phBadge(c.phase)}
                {c.notasCoord && <span style={{ fontSize: 11, color: '#888' }}>Nota: {c.notasCoord}</span>}
              </div>
              <span style={{ fontSize: 11, color: '#888' }}>Notificado {c.subidoAt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: "'DM Sans', sans-serif" },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #222' },
  back: { fontSize: 15, fontWeight: 600, color: '#1D9E75', cursor: 'pointer' },
  pill: { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: '#FAEEDA', color: '#854F0B' },
  logoutBtn: { background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  content: { padding: '1.5rem' },
  notif: { background: '#1a2e1a', border: '1px solid #3B6D11', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#9FE1CB', marginBottom: '1rem' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.25rem' },
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 12 },
  label: { fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' },
  btn: { padding: '9px 18px', background: '#1D9E75', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  sectionLabel: { fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 10 },
  capRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' },
}
