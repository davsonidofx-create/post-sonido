import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenSeries, createSerie, getTeamBySerie } from '../lib/db'
import { ROLES } from '../lib/constants'
import { db } from '../lib/firebase'
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore'
import { notifyInvitacion } from '../lib/email'

const COLORS = [
  { color: '#533AB7', bg: '#EEEDFE' },
  { color: '#0F6E56', bg: '#E1F5EE' },
  { color: '#993C1D', bg: '#FAECE7' },
  { color: '#993556', bg: '#FBEAF0' },
  { color: '#185FA5', bg: '#E6F1FB' },
  { color: '#854F0B', bg: '#FAEEDA' },
  { color: '#3B6D11', bg: '#EAF3DE' },
]

const ROLES_EQUIPO = [
  { key: 'coordinadora', label: 'Coordinadora', icon: '📋' },
  { key: 'dx', label: 'DX / ADR', icon: '🎙' },
  { key: 'fx', label: 'FX', icon: '💥' },
  { key: 'foley', label: 'Foley', icon: '👟' },
  { key: 'musica', label: 'Musicalización', icon: '🎵' },
  { key: 'vfx', label: 'VFX', icon: '✨' },
  { key: 'mezcla', label: 'Mezcla', icon: '🎚' },
  { key: 'supervisor', label: 'Supervisor', icon: '👁' },
]

export default function Series() {
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [series, setSeries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState('')
  const [form, setForm] = useState({ name: '', temporada: '', caps: '' })
  const [teamMembers, setTeamMembers] = useState([{ name: '', email: '', role: 'dx' }])
  const [saving, setSaving] = useState(false)
  const [notif, setNotif] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1: tipo, 2: datos, 3: equipo

  const isJefe = userData?.role === 'jefe'
  const role = ROLES.find(r => r.key === userData?.role)
  const allowed = userData?.series || []

  useEffect(() => { return listenSeries(setSeries) }, [])

  const resetForm = () => {
    setTipo(''); setForm({ name: '', temporada: '', caps: '' })
    setTeamMembers([{ name: '', email: '', role: 'dx' }])
    setError(''); setShowForm(false); setStep(1)
  }

  const addMember = () => setTeamMembers(m => [...m, { name: '', email: '', role: 'dx' }])
  const removeMember = (i) => setTeamMembers(m => m.filter((_, idx) => idx !== i))
  const updateMember = (i, field, val) => setTeamMembers(m => m.map((x, idx) => idx === i ? { ...x, [field]: val } : x))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (tipo === 'serie' && (!form.caps || parseInt(form.caps) < 1)) {
      setError('Ingresa un número válido de capítulos.'); return
    }
    setSaving(true); setError('')
    try {
      const idx = series.length % COLORS.length
      const { color, bg } = COLORS[idx]

      // 1. Crear la serie
      const newSerie = await createSerie({
        name: form.name.trim(), tipo,
        temporada: tipo === 'serie' ? (form.temporada.trim() || '1') : null,
        caps: tipo === 'serie' ? parseInt(form.caps) : null,
        color, bg, creadoPor: userData?.name,
        creadoEn: new Date().toISOString(),
      })

      // 2. Asignar la serie al jefe
      const jefeRef = doc(db, 'users', userData?.uid || '')
      await updateDoc(jefeRef, { series: arrayUnion(newSerie.id) })

      // 3. Asignar la serie a cada miembro del equipo y enviar invitacion
      const validMembers = teamMembers.filter(m => m.name.trim() && m.email.trim())
      for (const member of validMembers) {
        // Buscar si ya existe el usuario
        const q = query(collection(db, 'users'), where('email', '==', member.email.toLowerCase().trim()))
        const snap = await getDocs(q)
        if (!snap.empty) {
          // Ya existe — solo agregar la serie
          await updateDoc(doc(db, 'users', snap.docs[0].id), { series: arrayUnion(newSerie.id) })
        } else {
          // No existe — crear usuario pendiente
          const { setDoc } = await import('firebase/firestore')
          const tempId = 'pending_' + member.email.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now()
          await setDoc(doc(db, 'users', tempId), {
            name: member.name.trim(), email: member.email.toLowerCase().trim(),
            role: member.role, series: [newSerie.id],
            invitedBy: userData?.name, invitedAt: new Date().toISOString(),
            status: 'pending', uid: null,
          })
        }
        // Enviar correo de invitacion
        try {
          const rolLabel = ROLES_EQUIPO.find(r => r.key === member.role)?.label || member.role
          await notifyInvitacion(member.name.trim(), member.email.trim(), rolLabel, form.name.trim(), window.location.origin, userData?.name)
        } catch(e) { console.log('Email error:', e) }
      }

      const msg = validMembers.length > 0 ? `"${form.name.trim()}" creado y ${validMembers.length} miembro(s) notificado(s).` : `"${form.name.trim()}" creado exitosamente.`
      setNotif(msg)
      setTimeout(() => setNotif(''), 5000)
      resetForm()
    } catch(e) {
      console.error(e)
      setError('Error al crear el proyecto. Intenta de nuevo.')
    }
    setSaving(false)
  }

  const enter = (sid) => navigate(`/app/${sid}`)

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div>
          <div style={S.appName}>Post Producción de Sonido</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            {role && <span style={{ ...S.pill, background: role.bg, color: role.color }}>{role.icon} {role.label}</span>}
            <span style={{ fontSize: 11, color: '#888' }}>· {userData?.name}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isJefe && !showForm && (
            <button style={S.createBtn} onClick={() => setShowForm(true)}>+ Nuevo proyecto</button>
          )}
          <button style={S.logoutBtn} onClick={logout}>Salir</button>
        </div>
      </div>

      <div style={S.content}>
        {notif && <div style={S.notif}>{notif}</div>}

        {isJefe && showForm && (
          <div style={S.formCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Nuevo proyecto</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3].map(s => (
                  <div key={s} style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s ? '#1D9E75' : '#222', color: step >= s ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{s}</div>
                ))}
              </div>
            </div>

            {/* PASO 1 — Tipo */}
            {step === 1 && (
              <>
                <p style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>¿Qué tipo de proyecto es?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 360, marginBottom: 14 }}>
                  <div style={{ ...S.tipoBtn, ...(tipo==='serie'?{borderColor:'#1D9E75',background:'#0d1f17'}:{}) }} onClick={() => setTipo('serie')}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📺</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Serie</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Nombre + temporada + capítulos</div>
                  </div>
                  <div style={{ ...S.tipoBtn, ...(tipo==='pelicula'?{borderColor:'#1D9E75',background:'#0d1f17'}:{}) }} onClick={() => setTipo('pelicula')}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Película</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Solo nombre</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...S.createBtn, opacity: tipo ? 1 : .4 }} onClick={() => tipo && setStep(2)} disabled={!tipo}>Siguiente →</button>
                  <button style={S.logoutBtn} onClick={resetForm}>Cancelar</button>
                </div>
              </>
            )}

            {/* PASO 2 — Datos */}
            {step === 2 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>{tipo === 'serie' ? '📺' : '🎬'}</span>
                  <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500 }}>{tipo === 'serie' ? 'Serie' : 'Película'}</span>
                  <span style={{ fontSize: 12, color: '#888', cursor: 'pointer' }} onClick={() => setStep(1)}>← cambiar</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: tipo === 'serie' ? '1fr 1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={S.label}>Nombre <span style={{ color: '#F09595' }}>*</span></label>
                    <input style={S.input} placeholder={tipo === 'serie' ? 'Ej: La Casa de los Secretos' : 'Ej: Código Rojo'}
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  </div>
                  {tipo === 'serie' && <>
                    <div>
                      <label style={S.label}>Temporada</label>
                      <input style={S.input} placeholder="Ej: 1, 2, Única..."
                        value={form.temporada} onChange={e => setForm(f => ({ ...f, temporada: e.target.value }))} />
                    </div>
                    <div>
                      <label style={S.label}>Capítulos <span style={{ color: '#F09595' }}>*</span></label>
                      <input style={S.input} type="number" min="1" max="500" placeholder="Ej: 60"
                        value={form.caps} onChange={e => setForm(f => ({ ...f, caps: e.target.value }))} />
                    </div>
                  </>}
                </div>
                {error && <p style={{ color: '#F09595', fontSize: 12, marginBottom: 10 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...S.createBtn, opacity: form.name.trim() ? 1 : .4 }}
                    onClick={() => { if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }; if (tipo==='serie'&&!form.caps){setError('Ingresa los capítulos.');return}; setError(''); setStep(3) }}
                    disabled={!form.name.trim()}>Siguiente → Agregar equipo</button>
                  <button style={S.logoutBtn} onClick={() => setStep(1)}>← Atrás</button>
                </div>
              </>
            )}

            {/* PASO 3 — Equipo */}
            {step === 3 && (
              <form onSubmit={handleCreate}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Agregar equipo al proyecto</div>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>Opcional — puedes agregar más personas después desde el panel del jefe.</p>
                {teamMembers.map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                    <div>
                      {i === 0 && <label style={S.label}>Nombre</label>}
                      <input style={S.input} placeholder="Nombre..." value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label style={S.label}>Correo Gmail</label>}
                      <input style={S.input} type="email" placeholder="correo@gmail.com" value={m.email} onChange={e => updateMember(i, 'email', e.target.value)} />
                    </div>
                    <div>
                      {i === 0 && <label style={S.label}>Rol</label>}
                      <select style={S.input} value={m.role} onChange={e => updateMember(i, 'role', e.target.value)}>
                        {ROLES_EQUIPO.map(r => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => removeMember(i)}
                      style={{ background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#F09595', cursor: 'pointer', padding: '7px', fontSize: 12, marginTop: i===0?16:0 }}>✕</button>
                  </div>
                ))}
                <button type="button" style={{ ...S.logoutBtn, fontSize: 12, marginBottom: 14 }} onClick={addMember}>+ Agregar otro</button>
                {error && <p style={{ color: '#F09595', fontSize: 12, marginBottom: 10 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...S.createBtn, opacity: saving ? .6 : 1 }} type="submit" disabled={saving}>
                    {saving ? 'Creando...' : `Crear ${tipo === 'serie' ? 'serie' : 'película'} y notificar equipo`}
                  </button>
                  <button style={S.logoutBtn} type="button" onClick={() => setStep(2)}>← Atrás</button>
                </div>
              </form>
            )}
          </div>
        )}

        <h2 style={S.sectionTitle}>{isJefe ? 'Mis proyectos' : 'Selecciona el proyecto en el que vas a trabajar'}</h2>

        {series.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No hay proyectos aún</div>
            {isJefe && <div style={{ fontSize: 12, color: '#888' }}>Crea tu primer proyecto con el botón "+ Nuevo proyecto"</div>}
          </div>
        )}

        <div style={S.grid}>
          {series.map(s => {
            const ok = allowed.includes(s.id)
            const esSerie = s.tipo === 'serie' || (!s.tipo && s.caps)
            return (
              <div key={s.id}
                style={{ ...S.card, ...(ok ? { borderColor: s.color, cursor: 'pointer' } : S.locked) }}
                onClick={() => ok && enter(s.id)}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{ok ? (esSerie ? '📺' : '🎬') : '🔒'}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: ok ? s.color : '#666', marginBottom: 4 }}>{s.name}</div>
                {esSerie && s.temporada && <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Temporada {s.temporada}</div>}
                {esSerie && s.caps && <div style={{ fontSize: 11, color: '#888' }}>{s.caps} capítulos</div>}
                {!esSerie && ok && <div style={{ fontSize: 11, color: '#888' }}>Película</div>}
                {!ok && <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Sin acceso</div>}
                {ok && role && <span style={{ ...S.pill, background: s.bg || role.bg, color: s.color || role.color, display: 'inline-flex', marginTop: 8 }}>{role.icon} {role.label}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const S = {
  page: { minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: "'DM Sans', sans-serif" },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #222' },
  appName: { fontSize: 16, fontWeight: 600 },
  pill: { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  createBtn: { background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  logoutBtn: { background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  content: { padding: '1.5rem' },
  notif: { background: '#1a2e1a', border: '1px solid #3B6D11', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#9FE1CB', marginBottom: '1rem' },
  formCard: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' },
  tipoBtn: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1rem', cursor: 'pointer', textAlign: 'center', transition: '.15s' },
  label: { fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, boxSizing: 'border-box' },
  sectionTitle: { fontSize: 15, fontWeight: 500, color: '#aaa', margin: '0 0 1rem' },
  emptyState: { textAlign: 'center', padding: '3rem 1rem', color: '#888' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1rem', transition: '.15s' },
  locked: { opacity: .35, cursor: 'not-allowed' },
}
