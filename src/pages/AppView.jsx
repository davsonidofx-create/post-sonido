import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenCaps, updateCap } from '../lib/db'
import { ROLES, DEPT_LABELS, TASK_STATUSES, PHASE_STYLE, STATUS_STYLE } from '../lib/constants'

export default function AppView() {
  const { serieId } = useParams()
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [caps, setCaps] = useState([])
  const [ready, setReady] = useState(false)
  const [editCap, setEditCap] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const role = ROLES.find(r => r.key === userData?.role)
  const isDX = userData?.role === 'dx'
  const myKeys = isDX ? ['dx','adr'] : [userData?.role]
  const myKey = isDX ? 'dx' : userData?.role

  useEffect(() => {
    if (!userData) return
    const unsub = listenCaps(serieId, data => { setCaps(data); setReady(true) })
    return unsub
  }, [serieId, userData])

  const openEdit = cap => {
    setEditCap(cap)
    const f = {}
    myKeys.forEach(k => { f['s_'+k] = cap.status?.[k] || '' })
    f.obs = cap.obs?.[myKey] || ''
    setForm(f)
  }

  const save = async () => {
    if (!editCap) return
    setSaving(true)
    const status = { ...editCap.status }
    myKeys.forEach(k => { status[k] = form['s_'+k] || '' })
    const obs = { ...editCap.obs }
    obs[myKey] = form.obs || ''
    await updateCap(editCap.id, { status, obs })
    setSaving(false)
    setEditCap(null)
  }

  const phBadge = p => {
    const st = PHASE_STYLE[p] || PHASE_STYLE['Pendiente']
    return <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:st.bg,color:st.color}}>{p||'Pendiente'}</span>
  }
  const stBadge = s => {
    if (!s) return <span style={{fontSize:10,color:'#888'}}>—</span>
    const st = STATUS_STYLE[s] || STATUS_STYLE['Pendiente']
    return <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:st.bg,color:st.color}}>{s}</span>
  }

  if (!userData || !ready) return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',display:'flex',alignItems:'center',justifyContent:'center',color:'#888',fontFamily:'sans-serif'}}>
      Cargando...
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',color:'#fff',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem 1.5rem',borderBottom:'1px solid #222'}}>
        <div>
          <span style={{color:'#1D9E75',cursor:'pointer'}} onClick={() => navigate('/series')}>← Series</span>
          <div style={{display:'flex',gap:8,marginTop:4}}>
            {role && <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:role.bg,color:role.color}}>{role.icon} {role.label}</span>}
            <span style={{fontSize:11,color:'#888'}}>· {userData?.name}</span>
          </div>
        </div>
        <button onClick={logout} style={{background:'transparent',border:'1px solid #333',borderRadius:8,color:'#888',padding:'5px 12px',fontSize:12,cursor:'pointer'}}>Salir</button>
      </div>
      <div style={{padding:'1.5rem',overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,border:'1px solid #222',borderRadius:12}}>
          <thead>
            <tr style={{background:'#1a1a1a'}}>
              <th style={TH}>Cap.</th>
              <th style={TH}>Fase</th>
              {isDX ? <><th style={TH}>DX</th><th style={TH}>ADR</th></> : <th style={TH}>{DEPT_LABELS[userData?.role]}</th>}
              <th style={TH}>Fecha</th>
              <th style={TH}></th>
            </tr>
          </thead>
          <tbody>
            {caps.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',padding:'2rem',color:'#888'}}>Sin capítulos aún.</td></tr>}
            {caps.map(c => (
              <tr key={c.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                <td style={TD}><strong>{c.num}</strong></td>
                <td style={TD}>{phBadge(c.phase)}</td>
                {isDX ? <><td style={TD}>{stBadge(c.status?.dx)}</td><td style={TD}>{stBadge(c.status?.adr)}</td></> : <td style={TD}>{stBadge(c.status?.[userData?.role])}</td>}
                <td style={{...TD,fontSize:11,color:'#aaa'}}>{c.fechas?.[myKey] || '—'}</td>
                <td style={TD}><button onClick={() => openEdit(c)} style={{background:'transparent',border:'1px solid #333',borderRadius:6,color:'#aaa',cursor:'pointer',padding:'2px 7px',fontSize:12}}>✏</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editCap && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:16,padding:'1.5rem',width:400,maxWidth:'95vw',maxHeight:'85vh',overflowY:'auto'}}>
            <h3 style={{margin:'0 0 1rem',fontSize:16}}>Cap. {editCap.num}</h3>
            {myKeys.map(k => (
              <div key={k} style={{marginBottom:12}}>
                <label style={{fontSize:12,color:'#aaa',display:'block',marginBottom:4}}>{DEPT_LABELS[k]} — estatus</label>
                <select value={form['s_'+k]||''} onChange={e => setForm(f=>({...f,['s_'+k]:e.target.value}))}
                  style={{width:'100%',padding:'8px',background:'#111',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13}}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{s||'— sin estatus —'}</option>)}
                </select>
              </div>
            ))}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:'#aaa',display:'block',marginBottom:4}}>Observación</label>
              <textarea value={form.obs||''} onChange={e=>setForm(f=>({...f,obs:e.target.value}))}
                style={{width:'100%',padding:'8px',background:'#111',border:'1px solid #333',borderRadius:8,color:'#fff',fontSize:13,minHeight:60,resize:'vertical',boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:'#aaa',display:'block',marginBottom:4}}>Fecha asignada</label>
              <div style={{padding:'8px',background:'#111',border:'1px solid #2a2a2a',borderRadius:8,color:'#9FE1CB',fontSize:13}}>
                {editCap.fechas?.[myKey] || 'No asignada aún'}
              </div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setEditCap(null)} style={{background:'transparent',border:'1px solid #333',borderRadius:8,color:'#aaa',padding:'7px 14px',fontSize:13,cursor:'pointer'}}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{background:'#1D9E75',border:'none',borderRadius:8,color:'#fff',padding:'7px 14px',fontSize:13,cursor:'pointer'}}>{saving?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TH = {padding:'8px 10px',textAlign:'left',fontWeight:500,fontSize:11,color:'#888',borderBottom:'1px solid #222'}
const TD = {padding:'8px 10px',verticalAlign:'middle'}
