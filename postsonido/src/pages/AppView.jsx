import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenCaps, listenSeries, updateCap, addObservation, getTeamBySerie } from '../lib/db'
import { ROLES, DEPT_LABELS, TASK_STATUSES, PHASE_STYLE, STATUS_STYLE } from '../lib/constants'
import { notifyBloqueo, notifyCompleto } from '../lib/email'

export default function AppView() {
  const { serieId } = useParams()
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [caps, setCaps] = useState([])
  const [serieName, setSerieName] = useState('')
  const [editCap, setEditCap] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPhase, setFilterPhase] = useState('')
  const [ready, setReady] = useState(false)

  const role = ROLES.find(r => r.key === userData?.role)
  const isDX = userData?.role === 'dx'
  const myKeys = isDX ? ['dx', 'adr'] : [userData?.role]

  useEffect(() => {
    if (!userData) return
    if (userData.series && !userData.series.includes(serieId)) {
      navigate('/series')
      return
    }
    const unsubSeries = listenSeries((list) => {
      const s = list.find(x => x.id === serieId)
      if (s) setSerieName(s.name)
    })
    const unsubCaps = listenCaps(serieId, (data) => {
      setCaps(data)
      setReady(true)
    })
    return () => { unsubSeries(); unsubCaps() }
  }, [serieId, userData])

  const openEdit = (cap) => {
    setEditCap(cap)
    const f = {}
    myKeys.forEach(k => { f['s_' + k] = cap.status?.[k] || '' })
    f.obs = cap.obs?.[isDX ? 'dx' : userData?.role] || ''
    setForm(f)
  }

  const save = async () => {
    if (!editCap) return
    setSaving(true)
    const status = { ...editCap.status }
    myKeys.forEach(k => { status[k] = form['s_' + k] || '' })
    const obs = { ...editCap.obs }
    const myKey = isDX ? 'dx' : userData?.role
    const prevStatus = editCap.status?.[myKey] || ''
    const newStatus = form['s_' + myKey] || ''
    obs[myKey] = form.obs || ''
    await updateCap(editCap.id, { status, obs })
    if (form.obs && form.obs !== editCap.obs?.[myKey]) {
      await addObservation({ capId: editCap.id, serieId, dept: myKey, text: form.obs, by: userData?.name, byEmail: userData?.email })
    }
    try {
      if (newStatus !== prevStatus) {
        const team = await getTeamBySerie(serieId)
        const jefe = team.find(u => u.role === 'jefe')
        const deptLabel = DEPT_LABELS[myKey] || myKey
        if (jefe?.email) {
          if (newStatus === 'Bloqueado') await notifyBloqueo(userData?.name, deptLabel, editCap.num, serieName || serieId, form.obs, jefe.email)
          else if (newStatus === 'Completo') await notifyCompleto(userData?.name, deptLabel, editCap.num, serieName || serieId, form.obs, jefe.email)
        }
      }
    } catch(e) { console.log('email error:', e) }
    setSaving(false)
    setEditCap(null)
  }

  const filtered = caps.filter(c => {
    if (search && !String(c.num).includes(search)) return false
    if (filterPhase && c.phase !== filterPhase) return false
    return true
  })

  const phBadge = (p) => {
    const st = PHASE_STYLE[p] || PHASE_STYLE['Pendiente']
    return <span style={{ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color }}>{p||'Pendiente'}</span>
  }
  const stBadge = (s) => {
    if (!s) return <span style={{ fontSize:10, color:'#888' }}>—</span>
    const st = STATUS_STYLE[s] || STATUS_STYLE['Pendiente']
    return <span style={{ fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:st.bg, color:st.color }}>{s}</span>
  }
  const dateFmt = (d) => {
    if (!d) return <span style={{ fontSize:11, color:'#888' }}>—</span>
    try {
      const dt = new Date(d + 'T00:00:00')
      const diff = Math.round((dt - new Date()) / 86400000)
      const fmt = dt.toLocaleDateString('es-CO', { day:'numeric', month:'short' })
      const hot = diff < 0 || diff <= 2
      return <span style={{ fontSize:11, color: hot ? '#F09595' : '#aaa', fontWeight: hot ? 600 : 400 }}>{fmt}{diff < 0 ? ' (vencido)' : diff <= 2 ? ` (${diff}d)` : ''}</span>
    } catch(e) { return <span style={{ fontSize:11, color:'#aaa' }}>{d}</span> }
  }

  if (!userData || !ready) return (
    <div style={{ minHeight:'100vh', background:'#0f0f0f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:32, height:32, border:'3px solid #333', borderTop:'3px solid #1D9E75', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <div style={{ fontSize:13, color:'#888' }}>Cargando...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0f0f0f', color:'#fff', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.5rem', borderBottom:'1px solid #222' }}>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:'#1D9E75', cursor:'pointer' }} onClick={() => navigate('/series')}>← Series</div>
          <div style={{ fontSize:17, fontWeight:600, marginTop:2 }}>{serieName || '...'}</div>
          <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center' }}>
            {role && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500, background:role.bg, color:role.color }}>{role.icon} {role.label}</span>}
            <span style={{ fontSize:11, color:'#888' }}>· {userData?.name}</span>
          </div>
        </div>
        <button style={{ background:'transparent', border:'1px solid #333', borderRadius:8, color:'#888', padding:'5px 12px', fontSize:12, cursor:'pointer' }} onClick={logout}>Salir</button>
      </div>

      <div style={{ padding:'1.5rem' }}>
        <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cap..."
            style={{ padding:'7px 12px', background:'#1a1a1a', border:'1px solid #333', borderRadius:8, color:'#fff', fontSize:13, width:130 }} />
          <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)}
            style={{ padding:'7px 12px', background:'#1a1a1a', border:'1px solid #333', borderRadius:8, color:'#fff', fontSize:13 }}>
            <option value="">Todas las fases</option>
            {['Pendiente','En proceso','En revision','Pendiente ajustes','Aprobado'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div style={{ overflowX:'auto', border:'1px solid #222', borderRadius:12 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#1a1a1a' }}>
                <th style={TH}>Cap.</th>
                <th style={TH}>Fase gral.</th>
                {isDX ? <><th style={TH}>DX</th><th style={TH}>ADR</th></> : <th style={TH}>{DEPT_LABELS[userData?.role] || userData?.role}</th>}
                <th style={TH}>Fecha entrega</th>
                <th style={TH}>Observación</th>
                <th style={{ ...TH, width:40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'2rem', color:'#888', fontSize:13 }}>
                  {caps.length === 0 ? 'Esperando que la coordinadora notifique el primer capítulo.' : 'Sin resultados.'}
                </td></tr>
              )}
              {filtered.map(c => {
                const myKey = isDX ? 'dx' : userData?.role
                const myFecha = c.fechas?.[myKey] || ''
                const myObs = c.obs?.[myKey] || ''
                return (
                  <tr key={c.id} style={{ borderBottom:'1px solid #1a1a1a' }}>
                    <td style={TD}><strong>{c.num}</strong></td>
                    <td style={TD}>{phBadge(c.phase)}</td>
                    {isDX ? <><td style={TD}>{stBadge(c.status?.dx)}</td><td style={TD}>{stBadge(c.status?.adr)}</td></> : <td style={TD}>{stBadge(c.status?.[userData?.role])}</td>}
                    <td style={TD}>{dateFmt(myFecha)}</td>
                    <td style={{ ...TD, fontSize:11, color:'#aaa', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{myObs || '—'}</td>
                    <td style={TD}>
                      <button style={{ background:'transparent', border:'1px solid #333', borderRadius:6, color:'#aaa', cursor:'pointer', padding:'2px 7px', fontSize:12 }} onClick={() => openEdit(c)}>✏</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editCap && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#1a1a1a', border:'1px solid #333', borderRadius:16, padding:'1.5rem', width:420, maxWidth:'95vw', maxHeight:'85vh', overflowY:'auto' }}>
            <h3 style={{ fontSize:16, fontWeight:600, margin:'0 0 1rem' }}>Cap. {editCap.num} — {serieName}</h3>
            {myKeys.map(k => (
              <div key={k} style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, color:'#aaa', display:'block', marginBottom:4 }}>{DEPT_LABELS[k] || k} — estatus</label>
                <select value={form['s_' + k] || ''} onChange={e => setForm(f => ({ ...f, ['s_' + k]: e.target.value }))}
                  style={{ width:'100%', padding:'8px 10px', background:'#111', border:'1px solid #333', borderRadius:8, color:'#fff', fontSize:13, boxSizing:'border-box' }}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{s || '— sin estatus —'}</option>)}
                </select>
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#aaa', display:'block', marginBottom:4 }}>Observación <span style={{ fontStyle:'italic' }}>(opcional)</span></label>
              <textarea value={form.obs || ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
                style={{ width:'100%', padding:'8px 10px', background:'#111', border:'1px solid #333', borderRadius:8, color:'#fff', fontSize:13, minHeight:70, resize:'vertical', boxSizing:'border-box' }}
                placeholder="Bloqueos, notas..." />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#aaa', display:'block', marginBottom:4 }}>Fase general</label>
              <div style={{ padding:'8px 10px', background:'#111', border:'1px solid #2a2a2a', borderRadius:8, color:'#888', fontSize:13 }}>{editCap.phase || 'Pendiente'}</div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#aaa', display:'block', marginBottom:4 }}>Tu fecha de entrega</label>
              <div style={{ padding:'8px 10px', background:'#111', border:'1px solid #2a2a2a', borderRadius:8, color: (isDX ? editCap.fechas?.dx : editCap.fechas?.[userData?.role]) ? '#9FE1CB' : '#888', fontSize:13 }}>
                {(isDX ? editCap.fechas?.dx : editCap.fechas?.[userData?.role]) || 'Aún no asignada'}
              </div>
            </div>
            {editCap.obs?.jefe && (
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, color:'#aaa', display:'block', marginBottom:4 }}>Nota del jefe</label>
                <div style={{ padding:'8px 10px', background:'#1a1500', border:'1px solid #333', borderRadius:8, color:'#FAC775', fontSize:12 }}>{editCap.obs.jefe}</div>
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
              <button style={{ background:'transparent', border:'1px solid #333', borderRadius:8, color:'#aaa', padding:'7px 16px', fontSize:13, cursor:'pointer' }} onClick={() => setEditCap(null)}>Cancelar</button>
              <button style={{ background:'#1D9E75', border:'none', borderRadius:8, color:'#fff', padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer', opacity: saving ? .6 : 1 }} onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TH = { padding:'8px 10px', textAlign:'left', fontWeight:500, fontSize:11, color:'#888', borderBottom:'1px solid #222', whiteSpace:'nowrap' }
const TD = { padding:'8px 10px', verticalAlign:'middle' }
