// v25-fechas-fix
import { useEffect, useState } from 'react'
import { notifyBloqueo, notifyCompleto } from '../lib/email'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenCaps, updateCap, addObservation } from '../lib/db'
import { ROLES, DEPT_KEYS, DEPT_LABELS, TASK_STATUSES, PHASE_STYLE, STATUS_STYLE } from '../lib/constants'

export default function AppView() {
  const { serieId } = useParams()
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [caps, setCaps] = useState([])
  const [editCap, setEditCap] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPhase, setFilterPhase] = useState('')

  const role = ROLES.find(r => r.key === userData?.role)
  const isDX = userData?.role === 'dx'

  useEffect(() => {
    if (!userData?.series?.includes(serieId)) { navigate('/series'); return }
    return listenCaps(serieId, setCaps)
  }, [serieId])

  const myKeys = isDX ? ['dx', 'adr'] : [userData?.role]

  const openEdit = (cap) => {
    setEditCap(cap)
    const f = {}
    myKeys.forEach(k => f[`status_${k}`] = cap.status?.[k] || '')
    f.obs = cap.obs?.[isDX ? 'dx' : userData?.role] || ''
    setForm(f)
  }

  const save = async () => {
    if (!editCap) return
    setSaving(true)
    const status = { ...editCap.status }
    myKeys.forEach(k => { status[k] = form[`status_${k}`] || '' })
    const obs = { ...editCap.obs }
    const myKey = isDX ? 'dx' : userData?.role
    obs[myKey] = form.obs || ''
    await updateCap(editCap.id, { status, obs })
    if (form.obs && form.obs !== editCap.obs?.[myKey]) {
      await addObservation({ capId: editCap.id, serieId, dept: myKey, text: form.obs, by: userData?.name, byEmail: userData?.email })
    }
    try {
      const team = await getTeamBySerie(serieId)
      const jefe = team.find(u => u.role === 'jefe')
      const deptLabel = DEPT_LABELS[myKey] || myKey
      const newStatus = form[`status_${myKey}`] || ''
      const prevStatus = editCap.status?.[myKey] || ''
      const serieName = editCap.serieName || serieId
      if (newStatus !== prevStatus && jefe?.email) {
        if (newStatus === 'Bloqueado') {
          await notifyBloqueo(userData?.name, deptLabel, editCap.num, serieName, form.obs, jefe.email)
        } else if (newStatus === 'Completo') {
          await notifyCompleto(userData?.name, deptLabel, editCap.num, serieName, form.obs, jefe.email)
        }
      }
    } catch (e) { console.log('Email skipped:', e) }
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
    return <span style={{ ...styles.badge, background: st.bg, color: st.color }}>{p || 'Pendiente'}</span>
  }

  const stBadge = (s) => {
    if (!s) return <span style={{ fontSize: 10, color: '#888' }}>—</span>
    const st = STATUS_STYLE[s] || STATUS_STYLE['Pendiente']
    return <span style={{ ...styles.badge, background: st.bg, color: st.color }}>{s}</span>
  }

  const dateFmt = (d) => {
    if (!d) return <span style={{ fontSize: 11, color: '#888' }}>—</span>
    const dt = new Date(d + 'T00:00:00')
    const diff = Math.round((dt - new Date()) / 86400000)
    const fmt = dt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    return <span style={{ fontSize: 11, color: diff < 0 ? '#F09595' : diff <= 2 ? '#FAC775' : '#aaa', fontWeight: diff <= 2 ? 600 : 400 }}>{fmt}{diff < 0 ? ' (vencido)' : diff <= 2 ? ` (${diff}d)` : ''}</span>
  }

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title} onClick={() => navigate('/series')} title="Volver a series">← Series</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {role && <span style={{ ...styles.pill, background: role.bg, color: role.color }}>{role.icon} {role.label}</span>}
            <span style={{ fontSize: 11, color: '#888' }}>· {userData?.name}</span>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={logout}>Salir</button>
      </div>

      <div style={styles.content}>
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input style={styles.search} placeholder="Buscar cap..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={styles.select} value={filterPhase} onChange={e => setFilterPhase(e.target.value)}>
            <option value="">Todas las fases</option>
            {['Pendiente','En proceso','En revision','Pendiente ajustes','Aprobado'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Cap.</th>
                <th style={styles.th}>Fase gral.</th>
                {isDX ? <><th style={styles.th}>DX</th><th style={styles.th}>ADR</th></> : <th style={styles.th}>{DEPT_LABELS[userData?.role]}</th>}
                <th style={styles.th}>Fecha entrega</th>
                <th style={styles.th}>Observación</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888', fontSize: 13 }}>
                  {caps.length === 0 ? 'Esperando que la coordinadora notifique el primer capítulo.' : 'Sin resultados.'}
                </td></tr>
              )}
              {filtered.map(c => {
                const myKey = isDX ? 'dx' : userData?.role
                const myFecha = isDX ? c.fechas?.dx : c.fechas?.[userData?.role]
                const myObs = c.obs?.[myKey] || ''
                return (
                  <tr key={c.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{c.num}</td>
                    <td style={styles.td}>{phBadge(c.phase)}</td>
                    {isDX ? <><td style={styles.td}>{stBadge(c.status?.dx)}</td><td style={styles.td}>{stBadge(c.status?.adr)}</td></> : <td style={styles.td}>{stBadge(c.status?.[userData?.role])}</td>}
                    <td style={styles.td}>{dateFmt(myFecha)}</td>
                    <td style={{ ...styles.td, fontSize: 11, color: '#aaa', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myObs || '—'}</td>
                    <td style={styles.td}>
                      {c.subidoAt && <button style={styles.editBtn} onClick={() => openEdit(c)}>✏</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editCap && (
        <div style={styles.modalBg}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Capítulo {editCap.num}</h3>
            {myKeys.map(k => (
              <div key={k} style={styles.field}>
                <label style={styles.label}>{DEPT_LABELS[k] || k} — estatus</label>
                <select style={styles.input} value={form[`status_${k}`] || ''} onChange={e => setForm(f => ({ ...f, [`status_${k}`]: e.target.value }))}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{s || '— sin estatus —'}</option>)}
                </select>
              </div>
            ))}
            <div style={styles.field}>
              <label style={styles.label}>Observación <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#888' }}>(opcional)</span></label>
              <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} value={form.obs || ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Bloqueos, notas, avances..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Fase general</label>
              <div style={{ ...styles.input, background: '#111', color: '#888', cursor: 'not-allowed' }}>{editCap.phase || 'Pendiente'}</div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Tu fecha de entrega</label>
              <div style={{ ...styles.input, background: '#111', color: '#888', cursor: 'not-allowed' }}>
                {(isDX ? editCap.fechas?.dx : editCap.fechas?.[userData?.role]) || 'Aún no asignada'}
              </div>
            </div>
            {editCap.obs?.jefe && (
              <div style={styles.field}>
                <label style={styles.label}>Nota del jefe</label>
                <div style={{ ...styles.input, background: '#1a1500', color: '#FAC775', fontSize: 12 }}>{editCap.obs.jefe}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={styles.cancelBtn} onClick={() => setEditCap(null)}>Cancelar</button>
              <button style={styles.saveBtn} onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: "'DM Sans', sans-serif" },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #222' },
  title: { fontSize: 15, fontWeight: 600, color: '#1D9E75', cursor: 'pointer' },
  pill: { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  logoutBtn: { background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  content: { padding: '1.5rem' },
  search: { padding: '7px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, width: 130 },
  select: { padding: '7px 12px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 },
  tableWrap: { overflowX: 'auto', border: '1px solid #222', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  thead: { background: '#1a1a1a' },
  th: { padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: '#888', borderBottom: '1px solid #222', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #1a1a1a' },
  td: { padding: '8px 10px', verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 },
  editBtn: { background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#aaa', cursor: 'pointer', padding: '2px 7px', fontSize: 12 },
  modalBg: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, padding: '1.5rem', width: 420, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' },
  modalTitle: { fontSize: 16, fontWeight: 600, margin: '0 0 1rem' },
  field: { marginBottom: 12 },
  label: { fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' },
  cancelBtn: { background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#aaa', padding: '7px 16px', fontSize: 13, cursor: 'pointer' },
  saveBtn: { background: '#1D9E75', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}
