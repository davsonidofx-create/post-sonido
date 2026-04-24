import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSeries, getCaps } from '../lib/db'
import { DEPT_KEYS, DEPT_LABELS, PHASE_STYLE, STATUS_STYLE } from '../lib/constants'

export default function SupervisorView() {
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [series, setSeries] = useState([])
  const [allCaps, setAllCaps] = useState({})
  const [allObs, setAllObs] = useState({})
  const [tab, setTab] = useState('resumen')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const s = await getSeries()
      const allowed = s.filter(x => userData?.series?.includes(x.id))
      setSeries(allowed)
      const capsMap = {}
      allowed.forEach(s => {
        getCaps(s.id).then(caps => {
          setAllCaps(prev => ({ ...prev, [s.id]: caps }))
        })
      })
      setLoading(false)
    }
    load()
  }, [])

  const phBadge = (p) => {
    const st = PHASE_STYLE[p] || PHASE_STYLE['Pendiente']
    return <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{p || 'Pendiente'}</span>
  }

  const stBadge = (s) => {
    if (!s) return <span style={{ fontSize: 10, color: '#555' }}>—</span>
    const st = STATUS_STYLE[s] || STATUS_STYLE['Pendiente']
    return <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: st.bg, color: st.color }}>{s}</span>
  }

  const totalCaps = Object.values(allCaps).flat().filter(c => c.subidoAt).length
  const aprobados = Object.values(allCaps).flat().filter(c => c.phase === 'Aprobado').length
  const bloqueados = Object.values(allCaps).flat().filter(c =>
    DEPT_KEYS.some(k => c.status?.[k] === 'Bloqueado')
  ).length
  const enRevision = Object.values(allCaps).flat().filter(c => c.phase === 'En revision').length

  if (!userData) return (
    <div style={{ minHeight:'100vh', background:'#0f0f0f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#888', fontFamily:"'DM Sans', sans-serif", gap:12 }}>
      <div style={{ width:32, height:32, border:'3px solid #333', borderTop:'3px solid #1D9E75', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <div style={{ fontSize:13 }}>Cargando...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div>
          <div style={S.appName}>Post Producción de Sonido</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: '#EEEDFE', color: '#26215C' }}>👁 Supervisor</span>
            <span style={{ fontSize: 11, color: '#888' }}>· {userData?.name}</span>
            <span style={{ fontSize: 11, color: '#534AB7', background: '#1a1a2e', padding: '2px 8px', borderRadius: 6 }}>Solo lectura</span>
          </div>
        </div>
        <button style={S.logoutBtn} onClick={logout}>Salir</button>
      </div>

      <div style={S.content}>
        <div style={S.statsRow}>
          {[
            ['Series', series.length, '#fff'],
            ['Caps. subidos', totalCaps, '#fff'],
            ['Aprobados', aprobados, '#9FE1CB'],
            ['En revisión', enRevision, '#B5D4F4'],
            ['Bloqueados', bloqueados, '#F09595'],
          ].map(([l, v, c]) => (
            <div key={l} style={S.stat}>
              <div style={S.statLabel}>{l}</div>
              <div style={{ ...S.statVal, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={S.tabs}>
          {['resumen', 'cronograma', 'bloqueos', 'observaciones'].map(t => (
            <div key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        {tab === 'resumen' && (
          <div>
            {series.map(s => {
              const caps = (allCaps[s.id] || []).filter(c => c.subidoAt)
              const ap = caps.filter(c => c.phase === 'Aprobado').length
              const er = caps.filter(c => c.phase === 'En revision').length
              const pa = caps.filter(c => c.phase === 'Pendiente ajustes').length
              const ep = caps.filter(c => !['Aprobado','En revision','Pendiente ajustes'].includes(c.phase)).length
              const pct = caps.length ? Math.round(ap / caps.length * 100) : 0
              return (
                <div key={s.id} style={S.card}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: s.color || '#1D9E75', marginBottom: 12 }}>{s.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(80px,1fr))', gap: 8, marginBottom: 12 }}>
                    {[['Total',caps.length,'#fff'],['Aprobados',ap,'#9FE1CB'],['En revisión',er,'#B5D4F4'],['Pend. ajustes',pa,'#FAC775'],['En proceso',ep,'#aaa']].map(([l,v,c]) => (
                      <div key={l} style={{ background: '#111', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#1D9E75', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#9FE1CB', fontWeight: 600 }}>{pct}% aprobado</span>
                  </div>
                </div>
              )
            })}
            {series.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>No tienes series asignadas.</p>}
          </div>
        )}

        {tab === 'cronograma' && (
          <div>
            {series.map(s => {
              const caps = (allCaps[s.id] || []).filter(c => c.subidoAt)
              return (
                <div key={s.id} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: s.color || '#1D9E75', marginBottom: 8 }}>{s.name}</div>
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr style={S.thead}>
                          <th style={S.th}>Cap.</th>
                          {DEPT_KEYS.map(k => <th key={k} style={S.th}>{DEPT_LABELS[k]}</th>)}
                          <th style={S.th}>Fase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caps.length === 0 && (
                          <tr><td colSpan={9} style={{ textAlign: 'center', padding: '1rem', color: '#888', fontSize: 12 }}>Sin capítulos subidos.</td></tr>
                        )}
                        {caps.map(c => (
                          <tr key={c.id} style={S.tr}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{c.num}</td>
                            {DEPT_KEYS.map(k => <td key={k} style={S.td}>{stBadge(c.status?.[k])}</td>)}
                            <td style={S.td}>{phBadge(c.phase)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'bloqueos' && (
          <div>
            {series.map(s => {
              const caps = (allCaps[s.id] || []).filter(c => c.subidoAt)
              const bloqs = []
              caps.forEach(c => {
                DEPT_KEYS.forEach(k => {
                  if (c.status?.[k] === 'Bloqueado') {
                    bloqs.push({ cap: c.num, dept: DEPT_LABELS[k], obs: c.obs?.[k] || '' })
                  }
                })
              })
              if (bloqs.length === 0) return null
              return (
                <div key={s.id} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F09595', marginBottom: 8 }}>{s.name} — Bloqueos activos</div>
                  {bloqs.map((b, i) => (
                    <div key={i} style={{ background: '#1a0a0a', border: '1px solid #F09595', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>Cap. {b.cap}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FCEBEB', color: '#A32D2D', fontWeight: 500 }}>{b.dept}</span>
                      </div>
                      {b.obs && <div style={{ fontSize: 12, color: '#aaa' }}>{b.obs}</div>}
                    </div>
                  ))}
                </div>
              )
            })}
            {series.every(s => !(allCaps[s.id] || []).some(c => DEPT_KEYS.some(k => c.status?.[k] === 'Bloqueado'))) && (
              <p style={{ color: '#9FE1CB', fontSize: 13 }}>Sin bloqueos activos. Todo marcha bien.</p>
            )}
          </div>
        )}

        {tab === 'observaciones' && (
          <div>
            {series.map(s => {
              const caps = (allCaps[s.id] || []).filter(c => c.subidoAt)
              const obs = []
              caps.forEach(c => {
                DEPT_KEYS.forEach(k => { if (c.obs?.[k]) obs.push({ cap: c.num, dept: DEPT_LABELS[k], text: c.obs[k] }) })
                if (c.obs?.jefe) obs.push({ cap: c.num, dept: 'Jefe', text: c.obs.jefe })
              })
              if (obs.length === 0) return null
              return (
                <div key={s.id} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: s.color || '#1D9E75', marginBottom: 8 }}>{s.name}</div>
                  {obs.map((o, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Cap. {o.cap}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#1a2035', color: '#85B7EB' }}>{o.dept}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{o.text}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: "'DM Sans', sans-serif" },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #222' },
  appName: { fontSize: 16, fontWeight: 600 },
  logoutBtn: { background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  content: { padding: '1.5rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))', gap: 8, marginBottom: '1rem' },
  stat: { background: '#1a1a1a', borderRadius: 8, padding: '9px 11px' },
  statLabel: { fontSize: 11, color: '#888', marginBottom: 3 },
  statVal: { fontSize: 19, fontWeight: 600 },
  tabs: { display: 'flex', borderBottom: '1px solid #222', marginBottom: '1rem' },
  tab: { padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#888', borderBottom: '2px solid transparent', marginBottom: -1 },
  tabActive: { color: '#1D9E75', borderBottomColor: '#1D9E75', fontWeight: 500 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.25rem', marginBottom: 10 },
  tableWrap: { overflowX: 'auto', border: '1px solid #222', borderRadius: 10 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thead: { background: '#1a1a1a' },
  th: { padding: '7px 8px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: '#888', borderBottom: '1px solid #222', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #111' },
  td: { padding: '7px 8px', verticalAlign: 'middle' },
}
