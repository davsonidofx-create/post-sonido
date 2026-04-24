import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenCaps, updateCap, getTeamBySerie, listenObsBySerie } from '../lib/db'
import { doc, setDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { DEPT_KEYS, DEPT_LABELS, CAP_PHASES, PHASE_STYLE, STATUS_STYLE } from '../lib/constants'
import { notifyFechaAsignada, notifyInvitacion } from '../lib/email'


function FechasTab({ caps, updateCap, setNotif, team, userData, serieId, serieName }) {
  const [localFechas, setLocalFechas] = React.useState({})

  React.useEffect(() => {
    const init = {}
    caps.forEach(c => {
      init[c.id] = { ...c.fechas }
    })
    setLocalFechas(init)
  }, [caps])

  const handleChange = (capId, k, val) => {
    setLocalFechas(prev => ({
      ...prev,
      [capId]: { ...prev[capId], [k]: val }
    }))
  }

  const handleSave = async (c) => {
    const fechas = localFechas[c.id] || {}
    await updateCap(c.id, { fechas })
    // Send email notifications
    try {
      const { notifyFechaAsignada } = await import('../lib/email')
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      const { db } = await import('../lib/firebase')
      const DEPT_LABELS_LOCAL = { dx:'DX', adr:'ADR', fx:'FX', foley:'Foley', musica:'Musicalización', vfx:'VFX', mezcla:'Mezcla' }
      const DEPT_ROLE_MAP = { dx:'dx', adr:'dx', fx:'fx', foley:'foley', musica:'musica', vfx:'vfx', mezcla:'mezcla' }

      // Get all users in this serie
      const q = query(collection(db, 'users'), where('series', 'array-contains', serieId))
      const snap = await getDocs(q)
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      for (const k of Object.keys(fechas)) {
        if (!fechas[k]) continue
        const roleToFind = DEPT_ROLE_MAP[k] || k
        const member = allUsers.find(u => u.role === roleToFind)
        if (member?.email) {
          const deptLabel = DEPT_LABELS_LOCAL[k] || k
          await notifyFechaAsignada(deptLabel, c.num, serieName || serieId, fechas[k], member.email, userData?.name)
        }
      }
    } catch(e) { console.log('Email error:', e) }
    setNotif(`Fechas Cap. ${c.num} guardadas y notificadas.`)
    setTimeout(() => setNotif(''), 3000)
  }

  const phBadge = (p) => {
    const PHASE_STYLE = {
      'Pendiente':{bg:'#F1EFE8',color:'#444441'},
      'En proceso':{bg:'#FAEEDA',color:'#633806'},
      'Completo':{bg:'#EAF3DE',color:'#27500A'},
      'En revision':{bg:'#E6F1FB',color:'#0C447C'},
      'Pendiente ajustes':{bg:'#FAEEDA',color:'#854F0B'},
      'Aprobado':{bg:'#EAF3DE',color:'#3B6D11'},
    }
    const st = PHASE_STYLE[p] || PHASE_STYLE['Pendiente']
    return <span style={{ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color }}>{p||'Pendiente'}</span>
  }

  const DEPT_KEYS = ['dx','adr','fx','foley','musica','vfx','mezcla']
  const DEPT_LABELS = {dx:'DX',adr:'ADR',fx:'FX',foley:'Foley',musica:'Musicalización',vfx:'VFX',mezcla:'Mezcla'}

  if (caps.length === 0) return <p style={{ color:'#888',fontSize:13 }}>No hay capítulos disponibles.</p>

  return (
    <div>
      {caps.map(c => (
        <div key={c.id} style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:12, padding:'1.25rem', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <span style={{ fontWeight:600 }}>Cap. {c.num}</span>{phBadge(c.phase)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:12 }}>
            {DEPT_KEYS.map(k => (
              <div key={k}>
                <div style={{ fontSize:11, color:'#aaa', marginBottom:3 }}>{DEPT_LABELS[k]}</div>
                <input type="date"
                  style={{ width:'100%', padding:'5px 8px', background:'#111', border:'1px solid #333', borderRadius:8, color:'#fff', fontSize:11, boxSizing:'border-box' }}
                  value={(localFechas[c.id]?.[k]) || ''}
                  onChange={e => handleChange(c.id, k, e.target.value)}
                />
              </div>
            ))}
          </div>
          <button
            style={{ padding:'6px 14px', background:'#1D9E75', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}
            onClick={() => handleSave(c)}>
            Guardar y notificar fechas
          </button>
        </div>
      ))}
    </div>
  )
}

export default function JefeView() {
  const { serieId } = useParams()
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [caps, setCaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState([])
  const [obs, setObs] = useState([])
  const [ST_series, setST_series] = useState([])
  const [serieName, setSerieName] = useState('')
  const [tab, setTab] = useState('cronograma')
  const [editCap, setEditCap] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [notif, setNotif] = useState('')
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'dx' })

  useEffect(() => {
    if (!userData) {
      setLoading(true)
      return
    }
    setLoading(false)
    if (userData.series && !userData.series.includes(serieId)) { navigate('/series'); return }
    const unsub1 = listenCaps(serieId, setCaps)
    const unsub2 = listenObsBySerie(serieId, setObs)
    getTeamBySerie(serieId).then(setTeam)
    getSeries().then(series => {
      const s = series.find(x => x.id === serieId)
      if (s) { setSerieName(s.name); setST_series(series) }
      else setST_series(series)
    })
    return () => { unsub1(); unsub2() }
  }, [serieId, userData])

  const phBadge = (p) => {
    const st = PHASE_STYLE[p] || PHASE_STYLE['Pendiente']
    return <span style={{ ...badge, background: st.bg, color: st.color }}>{p || 'Pendiente'}</span>
  }
  const stBadge = (s) => {
    if (!s) return <span style={{ fontSize: 10, color: '#888' }}>—</span>
    const st = STATUS_STYLE[s] || STATUS_STYLE['Pendiente']
    return <span style={{ ...badge, background: st.bg, color: st.color }}>{s}</span>
  }

  const openEdit = (cap) => {
    setEditCap(cap)
    setForm({
      phase: cap.phase || 'Pendiente',
      obs_jefe: cap.obs?.jefe || '',
      task_dept: '',
      ...DEPT_KEYS.reduce((a, k) => ({ ...a, [`fecha_${k}`]: cap.fechas?.[k] || '' }), {}),
      qc_dept: cap.qc?.dept || '', qc_fecha: cap.qc?.fecha || '',
      ent_dept: cap.entregables?.dept || '', ent_fecha: cap.entregables?.fecha || '',
      ses_dept: cap.sesiones?.dept || '', ses_fecha: cap.sesiones?.fecha || '',
    })
  }

  const saveCap = async () => {
    if (!editCap) return
    setSaving(true)
    const obs = { ...editCap.obs, jefe: form.obs_jefe || '' }
    const fechas = { ...editCap.fechas }
    DEPT_KEYS.forEach(k => { fechas[k] = form[`fecha_${k}`] || '' })
    const status = { ...editCap.status }
    if (form.task_dept) status[form.task_dept] = 'Pendiente'
    const qc = { dept: form.qc_dept || '', fecha: form.qc_fecha || '' }
    const entregables = { dept: form.ent_dept || '', fecha: form.ent_fecha || '' }
    const sesiones = { dept: form.ses_dept || '', fecha: form.ses_fecha || '' }
    await updateCap(editCap.id, { phase: form.phase, obs, fechas, status, qc, entregables, sesiones })
    setNotif('Capítulo actualizado.')
    setTimeout(() => setNotif(''), 3000)
    setSaving(false)
    setEditCap(null)
  }

  const addTeamMember = async () => {
    if (!newUser.name || !newUser.email) return
    setSaving(true)
    try {
      // 1. Buscar si ya existe el usuario en Firestore por email
      const { collection: col, query, where, getDocs, setDoc, doc: firestoreDoc, arrayUnion, updateDoc } = await import('firebase/firestore')
      const { db: firestoreDb } = await import('../lib/firebase')

      const q = query(col(firestoreDb, 'users'), where('email', '==', newUser.email.toLowerCase().trim()))
      const snap = await getDocs(q)

      if (!snap.empty) {
        // Usuario ya existe — solo agregar la serie si no la tiene
        const existingDoc = snap.docs[0]
        const existingData = existingDoc.data()
        if (!existingData.series?.includes(serieId)) {
          await updateDoc(firestoreDoc(firestoreDb, 'users', existingDoc.id), {
            series: arrayUnion(serieId)
          })
        }
      } else {
        // Usuario nuevo — crear documento en users con un ID temporal basado en email
        const tempId = 'pending_' + newUser.email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now()
        await setDoc(firestoreDoc(firestoreDb, 'users', tempId), {
          name: newUser.name.trim(),
          email: newUser.email.toLowerCase().trim(),
          role: newUser.role,
          series: [serieId],
          invitedBy: userData?.name,
          invitedAt: new Date().toISOString(),
          status: 'pending', // Se actualiza a 'active' cuando el usuario crea su cuenta
          uid: null,
        })
      }

      // 2. Enviar correo de invitacion automaticamente
      const serie = ST_series.find(s => s.id === serieId)
      const serieName = serie?.name || serieId
      const appUrl = window.location.origin
      const rolLabel = {
        coordinadora:'Coordinadora', dx:'DX/ADR', fx:'FX',
        foley:'Foley', musica:'Musicalización', vfx:'VFX',
        mezcla:'Mezcla', supervisor:'Supervisor'
      }[newUser.role] || newUser.role

      await notifyInvitacion(newUser.name.trim(), newUser.email.trim(), rolLabel, serieName, appUrl, userData?.name)
      setNotif(`✓ ${newUser.name} agregado y notificado por correo.`)

    } catch(e) {
      console.error('Error adding team member:', e)
      setNotif(`Error al agregar usuario: ${e.message}`)
    }
    setTimeout(() => setNotif(''), 5000)
    setNewUser({ name: '', email: '', role: 'dx' })
    setSaving(false)
    getTeamBySerie(serieId).then(setTeam)
  }

  const stats = { total: caps.length, ap: caps.filter(c => c.phase === 'Aprobado').length, er: caps.filter(c => c.phase === 'En revision').length, pa: caps.filter(c => c.phase === 'Pendiente ajustes').length }

  const ROLES_OPTS = ['dx','fx','foley','musica','vfx','mezcla','coordinadora']

  if (loading || !userData) return (
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
          <div style={S.back} onClick={() => navigate('/series')}>← Series</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ ...S.pill, background: '#EEEDFE', color: '#533AB7' }}>👔 Jefe</span>
            <span style={{ fontSize: 11, color: '#888' }}>· {userData?.name}</span>
          </div>
        </div>
        <button style={S.logoutBtn} onClick={logout}>Salir</button>
      </div>

      <div style={S.content}>
        {notif && <div style={S.notif}>{notif}</div>}

        <div style={S.statsRow}>
          {[['Total',stats.total,'#fff'],['Aprobados',stats.ap,'#9FE1CB'],['En revisión',stats.er,'#B5D4F4'],['Pend. ajustes',stats.pa,'#FAC775']].map(([l,v,c]) => (
            <div key={l} style={S.stat}><div style={S.statLabel}>{l}</div><div style={{ ...S.statVal, color: c }}>{v}</div></div>
          ))}
        </div>

        <div style={S.tabs}>
          {['cronograma','fechas','ajustes','equipo','observaciones'].map(t => (
            <div key={t} style={{ ...S.tab, ...(tab===t?S.tabActive:{}) }} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </div>
          ))}
        </div>

        {tab === 'cronograma' && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr style={S.thead}>
                <th style={S.th}>Cap.</th>
                {DEPT_KEYS.map(k => <th key={k} style={S.th}>{DEPT_LABELS[k]}</th>)}
                <th style={S.th}>Fase</th>
                <th style={S.th}></th>
              </tr></thead>
              <tbody>
                {caps.length === 0 && <tr><td colSpan={10} style={{ textAlign:'center',padding:'2rem',color:'#888',fontSize:13 }}>No hay capítulos notificados aún.</td></tr>}
                {caps.map(c => (
                  <tr key={c.id} style={S.tr}>
                    <td style={{ ...S.td, fontWeight:600 }}>{c.num}</td>
                    {DEPT_KEYS.map(k => <td key={k} style={S.td}>{stBadge(c.status?.[k])}</td>)}
                    <td style={S.td}>{phBadge(c.phase)}</td>
                    <td style={S.td}><button style={S.editBtn} onClick={() => openEdit(c)}>✏</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'fechas' && (
          <div>
            {caps.length === 0 && <p style={{ color:'#888',fontSize:13 }}>No hay capítulos disponibles.</p>}
            {caps.map(c => (
              <div key={c.id} style={S.card}>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                  <span style={{ fontWeight:600 }}>Cap. {c.num}</span>{phBadge(c.phase)}
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8 }}>
                  {DEPT_KEYS.map(k => (
                    <div key={k}>
                      <div style={S.label}>{DEPT_LABELS[k]}</div>
                      <input type="date" style={{ ...S.input, fontSize:11,padding:'5px 8px' }}
                        defaultValue={c.fechas?.[k]||''}
                        onChange={async e => {
                          const fechas = { ...c.fechas, [k]: e.target.value }
                          await updateCap(c.id, { fechas })
                        }} />
                    </div>
                  ))}
                </div>
                <button style={{ ...S.btn, marginTop:12, fontSize:12, padding:'6px 14px' }}
                  onClick={() => { setNotif(`Fechas Cap. ${c.num} guardadas.`); setTimeout(()=>setNotif(''),3000) }}>
                  Guardar y notificar
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'ajustes' && (
          <div>
            {caps.filter(c=>['Aprobado','Pendiente ajustes'].includes(c.phase)).length === 0 &&
              <p style={{ color:'#888',fontSize:13 }}>No hay capítulos en esta fase aún.</p>}
            {caps.filter(c=>['Aprobado','Pendiente ajustes'].includes(c.phase)).map(c => (
              <div key={c.id} style={S.card}>
                <div style={{ display:'flex',gap:10,alignItems:'center',marginBottom:14 }}>
                  <span style={{ fontWeight:600 }}>Cap. {c.num}</span>{phBadge(c.phase)}
                </div>
                {[
                  ['QC','Control de calidad','qc'],
                  ['Entregables','Archivos finales','entregables'],
                  ['Entrega de sesiones','Archivos de sesión','sesiones']
                ].map(([label,sub,key],i) => (
                  <div key={key}>
                    {i > 0 && <hr style={{ border:'none',borderTop:'1px solid #222',margin:'12px 0' }}/>}
                    <div style={{ display:'grid',gridTemplateColumns:'140px 1fr 1fr',gap:10,alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:13,fontWeight:600 }}>{label}</div>
                        <div style={{ fontSize:11,color:'#888',marginTop:2 }}>{sub}</div>
                      </div>
                      <div>
                        <div style={S.label}>Asignar a</div>
                        <select style={S.input} defaultValue={c[key]?.dept||''} onChange={async e => {
                          await updateCap(c.id,{[key]:{...c[key],dept:e.target.value}})
                        }}>
                          <option value="">— depto —</option>
                          {DEPT_KEYS.map(k=><option key={k} value={k}>{DEPT_LABELS[k]}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={S.label}>Fecha de entrega</div>
                        <input type="date" style={S.input} defaultValue={c[key]?.fecha||''} onChange={async e => {
                          await updateCap(c.id,{[key]:{...c[key],fecha:e.target.value}})
                        }}/>
                      </div>
                    </div>
                  </div>
                ))}
                <button style={{ ...S.btn, marginTop:14, fontSize:12, padding:'6px 14px' }}
                  onClick={() => { setNotif(`QC Cap. ${c.num} guardado. Notificando...`); setTimeout(()=>setNotif(''),3000) }}>
                  Guardar y notificar
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'equipo' && (
          <div>
            <div style={S.card}>
              <div style={{ fontSize:14,fontWeight:600,marginBottom:12 }}>Invitar miembro del equipo</div>
              <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                <input style={{ ...S.input, flex:1, minWidth:120 }} placeholder="Nombre..." value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))}/>
                <input style={{ ...S.input, flex:1, minWidth:140 }} type="email" placeholder="correo@..." value={newUser.email} onChange={e=>setNewUser(u=>({...u,email:e.target.value}))}/>
                <select style={{ ...S.input, flex:1, minWidth:120 }} value={newUser.role} onChange={e=>setNewUser(u=>({...u,role:e.target.value}))}>
                  {ROLES_OPTS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                <button style={S.btn} onClick={addTeamMember}>Invitar</button>
              </div>
            </div>
            <div style={{ marginTop:'1rem' }}>
              {team.map(u=>(
                <div key={u.id} style={S.teamRow}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600 }}>{u.name}</div>
                    <div style={{ fontSize:11,color:'#888' }}>{u.email} · {u.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'observaciones' && (
          <div>
            {obs.length === 0 && <p style={{ color:'#888',fontSize:13 }}>Sin observaciones aún.</p>}
            {obs.map(o=>(
              <div key={o.id} style={S.obsRow}>
                <div style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4,flexWrap:'wrap' }}>
                  <span style={{ fontSize:13,fontWeight:600 }}>{o.by}</span>
                  <span style={{ ...badge, background:'#1a2035',color:'#85B7EB' }}>{DEPT_LABELS[o.dept]||o.dept}</span>
                  <span style={{ fontSize:11,color:'#888' }}>Cap. {o.capNum || o.capId}</span>
                </div>
                <div style={{ fontSize:12,color:'#aaa',lineHeight:1.5 }}>{o.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editCap && (
        <div style={S.modalBg}>
          <div style={S.modal}>
            <h3 style={{ fontSize:16,fontWeight:600,margin:'0 0 1rem' }}>Cap. {editCap.num} — Editar</h3>
            <div style={S.field}>
              <label style={S.label}>Fase actual</label>
              <div style={{ ...S.input, background:'#111', color:'#888', cursor:'not-allowed' }}>{editCap.phase||'Pendiente'}</div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Cambiar a fase</label>
              <select style={S.input} value={form.phase||'Pendiente'} onChange={e=>setForm(f=>({...f,phase:e.target.value}))}>
                {CAP_PHASES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Observación del jefe <span style={{ fontStyle:'italic',color:'#888',fontWeight:400 }}>(opcional)</span></label>
              <textarea style={{ ...S.input, minHeight:70, resize:'vertical' }} value={form.obs_jefe||''} onChange={e=>setForm(f=>({...f,obs_jefe:e.target.value}))} placeholder="Notas para el equipo..." />
            </div>
            <div style={S.field}>
              <label style={S.label}>Asignar tarea a departamento <span style={{ fontStyle:'italic',color:'#888',fontWeight:400 }}>(opcional)</span></label>
              <select style={S.input} value={form.task_dept||''} onChange={e=>setForm(f=>({...f,task_dept:e.target.value}))}>
                <option value="">— ninguno —</option>
                {DEPT_KEYS.map(k=><option key={k} value={k}>{DEPT_LABELS[k]}</option>)}
              </select>
            </div>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:16 }}>
              <button style={S.cancelBtn} onClick={()=>setEditCap(null)}>Cancelar</button>
              <button style={S.saveBtn} onClick={saveCap} disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const badge = { display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:500 }

const S = {
  page: { minHeight:'100vh', background:'#0f0f0f', color:'#fff', fontFamily:"'DM Sans', sans-serif" },
  topbar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.5rem', borderBottom:'1px solid #222' },
  back: { fontSize:15, fontWeight:600, color:'#1D9E75', cursor:'pointer' },
  pill: { fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500 },
  logoutBtn: { background:'transparent', border:'1px solid #333', borderRadius:8, color:'#888', padding:'5px 12px', fontSize:12, cursor:'pointer' },
  content: { padding:'1.5rem' },
  notif: { background:'#1a2e1a', border:'1px solid #3B6D11', borderRadius:8, padding:'8px 14px', fontSize:12, color:'#9FE1CB', marginBottom:'1rem' },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))', gap:8, marginBottom:'1rem' },
  stat: { background:'#1a1a1a', borderRadius:8, padding:'10px 12px' },
  statLabel: { fontSize:11, color:'#888', marginBottom:3 },
  statVal: { fontSize:20, fontWeight:600 },
  tabs: { display:'flex', borderBottom:'1px solid #222', marginBottom:'1rem' },
  tab: { padding:'8px 14px', fontSize:13, cursor:'pointer', color:'#888', borderBottom:'2px solid transparent', marginBottom:-1 },
  tabActive: { color:'#1D9E75', borderBottomColor:'#1D9E75', fontWeight:500 },
  tableWrap: { overflowX:'auto', border:'1px solid #222', borderRadius:12 },
  table: { width:'100%', borderCollapse:'collapse', fontSize:12 },
  thead: { background:'#1a1a1a' },
  th: { padding:'8px 10px', textAlign:'left', fontWeight:500, fontSize:11, color:'#888', borderBottom:'1px solid #222', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #1a1a1a' },
  td: { padding:'8px 10px', verticalAlign:'middle' },
  editBtn: { background:'transparent', border:'1px solid #333', borderRadius:6, color:'#aaa', cursor:'pointer', padding:'2px 7px', fontSize:12 },
  card: { background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:12, padding:'1.25rem', marginBottom:10 },
  label: { fontSize:12, color:'#aaa', display:'block', marginBottom:4 },
  input: { width:'100%', padding:'8px 10px', background:'#111', border:'1px solid #333', borderRadius:8, color:'#fff', fontSize:13, boxSizing:'border-box' },
  btn: { padding:'8px 16px', background:'#1D9E75', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' },
  teamRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #1a1a1a' },
  obsRow: { padding:'10px 0', borderBottom:'1px solid #1a1a1a' },
  modalBg: { position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modal: { background:'#1a1a1a', border:'1px solid #333', borderRadius:16, padding:'1.5rem', width:440, maxWidth:'95vw', maxHeight:'85vh', overflowY:'auto' },
  field: { marginBottom:12 },
  cancelBtn: { background:'transparent', border:'1px solid #333', borderRadius:8, color:'#aaa', padding:'7px 16px', fontSize:13, cursor:'pointer' },
  saveBtn: { background:'#1D9E75', border:'none', borderRadius:8, color:'#fff', padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer' },
}
