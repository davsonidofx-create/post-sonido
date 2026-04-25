import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listenSeries, createSerie } from '../lib/db'
import { ROLES } from '../lib/constants'
import { db } from '../lib/firebase'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'

const COLORS = [
  { color: '#533AB7', bg: '#EEEDFE' },
  { color: '#0F6E56', bg: '#E1F5EE' },
  { color: '#993C1D', bg: '#FAECE7' },
  { color: '#993556', bg: '#FBEAF0' },
  { color: '#185FA5', bg: '#E6F1FB' },
  { color: '#854F0B', bg: '#FAEEDA' },
  { color: '#3B6D11', bg: '#EAF3DE' },
]

export default function Series() {
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [series, setSeries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState('') // 'serie' | 'pelicula'
  const [form, setForm] = useState({ name: '', temporada: '', caps: '' })
  const [saving, setSaving] = useState(false)
  const [notif, setNotif] = useState('')
  const [error, setError] = useState('')

  const isJefe = userData?.role === 'jefe'
  const role = ROLES.find(r => r.key === userData?.role)
  const allowed = userData?.series || []

  useEffect(() => { return listenSeries(setSeries) }, [])

  const resetForm = () => {
    setTipo('')
    setForm({ name: '', temporada: '', caps: '' })
    setError('')
    setShowForm(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (tipo === 'serie' && (!form.caps || parseInt(form.caps) < 1)) {
      setError('Ingresa un número válido de capítulos.'); return
    }
    setSaving(true)
    setError('')
    const idx = series.length % COLORS.length
    const { color, bg } = COLORS[idx]
    try {
      const newSerie = await createSerie({
        name: form.name.trim(),
        tipo,
        temporada: tipo === 'serie' ? (form.temporada.trim() || '1') : null,
        caps: tipo === 'serie' ? parseInt(form.caps) : null,
        color, bg,
        creadoPor: userData?.name,
        creadoEn: new Date().toISOString(),
      })
      const userRef = doc(db, 'users', userData?.uid || '')
      await updateDoc(userRef, { series: arrayUnion(newSerie.id) })
      setNotif(`"${form.name.trim()}" creado exitosamente.`)
      setTimeout(() => setNotif(''), 4000)
      resetForm()
    } catch(e) {
      setError('Error al crear. Intenta de nuevo.')
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
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Nuevo proyecto</div>

            {!tipo && (
              <>
                <p style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>¿Qué tipo de proyecto es?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 360 }}>
                  <div style={S.tipoBtn} onClick={() => setTipo('serie')}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📺</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Serie</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Nombre + temporada + capítulos</div>
                  </div>
                  <div style={S.tipoBtn} onClick={() => setTipo('pelicula')}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Película</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Solo nombre</div>
                  </div>
                </div>
                <button style={{ ...S.logoutBtn, marginTop: 14 }} onClick={resetForm}>Cancelar</button>
              </>
            )}

            {tipo && (
              <form onSubmit={handleCreate}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>{tipo === 'serie' ? '📺' : '🎬'}</span>
                  <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 500 }}>{tipo === 'serie' ? 'Serie' : 'Película'}</span>
                  <span style={{ fontSize: 12, color: '#888', cursor: 'pointer', marginLeft: 4 }} onClick={() => setTipo('')}>← cambiar tipo</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: tipo === 'serie' ? '1fr 1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={S.label}>Nombre del proyecto <span style={{ color: '#F09595' }}>*</span></label>
                    <input style={S.input} placeholder={tipo === 'serie' ? 'Ej: La Casa de los Secretos' : 'Ej: Código Rojo'}
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  </div>
                  {tipo === 'serie' && (
                    <>
                      <div>
                        <label style={S.label}>Temporada</label>
                        <input style={S.input} placeholder="Ej: 1, 2, Única..."
                          value={form.temporada} onChange={e => setForm(f => ({ ...f, temporada: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Número de capítulos <span style={{ color: '#F09595' }}>*</span></label>
                        <input style={S.input} type="number" min="1" max="500" placeholder="Ej: 60"
                          value={form.caps} onChange={e => setForm(f => ({ ...f, caps: e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>

                {error && <p style={{ color: '#F09595', fontSize: 12, marginBottom: 10 }}>{error}</p>}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...S.createBtn, opacity: saving ? .6 : 1 }} type="submit" disabled={saving}>
                    {saving ? 'Creando...' : `Crear ${tipo === 'serie' ? 'serie' : 'película'}`}
                  </button>
                  <button style={S.logoutBtn} type="button" onClick={resetForm}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        )}

        <h2 style={S.sectionTitle}>
          {isJefe ? 'Mis proyectos' : 'Selecciona el proyecto en el que vas a trabajar'}
        </h2>

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
                {esSerie && s.temporada && (
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Temporada {s.temporada}</div>
                )}
                {esSerie && s.caps && (
                  <div style={{ fontSize: 11, color: '#888' }}>{s.caps} capítulos</div>
                )}
                {!esSerie && ok && (
                  <div style={{ fontSize: 11, color: '#888' }}>Película</div>
                )}
                {!ok && <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Sin acceso</div>}
                {ok && role && (
                  <span style={{ ...S.pill, background: s.bg || role.bg, color: s.color || role.color, display: 'inline-flex', marginTop: 8 }}>
                    {role.icon} {role.label}
                  </span>
                )}
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
