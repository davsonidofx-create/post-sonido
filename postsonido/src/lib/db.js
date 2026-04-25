import { db } from './firebase'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  addDoc, query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore'

// ── USUARIOS ──────────────────────────────────────────────
export const getUser = (uid) => getDoc(doc(db, 'users', uid))

export const updateUser = (uid, data) => updateDoc(doc(db, 'users', uid), data)

export const getUserByEmail = async (email) => {
  const q = query(collection(db, 'users'), where('email', '==', email))
  const snap = await getDocs(q)
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export const getTeamBySerie = async (serieId) => {
  const q = query(collection(db, 'users'), where('series', 'array-contains', serieId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── SERIES ────────────────────────────────────────────────
export const getSeries = async () => {
  const snap = await getDocs(collection(db, 'series'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const createSerie = async (data) => {
  const ref = await addDoc(collection(db, 'series'), { ...data, createdAt: serverTimestamp() })
  return { id: ref.id, ...data }
}

export const addSeriesToUser = (uid, serieId) => {
  const { arrayUnion } = require('firebase/firestore')
  return updateDoc(doc(db, 'users', uid), { series: arrayUnion(serieId) })
}

export const listenSeries = (cb) => onSnapshot(collection(db, 'series'), snap => {
  cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
})

// ── CAPÍTULOS ─────────────────────────────────────────────
export const getCaps = async (serieId) => {
  const q = query(collection(db, 'caps'), where('serieId', '==', serieId), orderBy('num'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const listenCaps = (serieId, cb) => {
  const q = query(collection(db, 'caps'), where('serieId', '==', serieId), orderBy('num'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export const createCap = (data) => addDoc(collection(db, 'caps'), {
  ...data,
  phase: 'Pendiente',
  status: { dx: '', adr: '', fx: '', foley: '', musica: '', vfx: '', mezcla: '' },
  obs: { dx: '', adr: '', fx: '', foley: '', musica: '', vfx: '', mezcla: '', jefe: '' },
  fechas: { dx: '', adr: '', fx: '', foley: '', musica: '', vfx: '', mezcla: '' },
  qc: { dept: '', fecha: '' },
  entregables: { dept: '', fecha: '' },
  sesiones: { dept: '', fecha: '' },
  createdAt: serverTimestamp()
})

export const updateCap = (capId, data) => updateDoc(doc(db, 'caps', capId), { ...data, updatedAt: serverTimestamp() })

// ── OBSERVACIONES ─────────────────────────────────────────
export const getObsByCap = async (capId) => {
  const q = query(collection(db, 'observations'), where('capId', '==', capId), orderBy('createdAt'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const listenObsBySerie = (serieId, cb) => {
  const q = query(collection(db, 'observations'), where('serieId', '==', serieId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export const addObservation = (data) => addDoc(collection(db, 'observations'), { ...data, createdAt: serverTimestamp() })
