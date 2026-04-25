import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        // First try to find user by UID
        const snapByUid = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snapByUid.exists()) {
          setUserData({ ...snapByUid.data(), uid: firebaseUser.uid })
        } else {
          // If not found by UID, search by email (pending users)
          const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore')
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email?.toLowerCase()))
          const emailSnap = await getDocs(q)
          if (!emailSnap.empty) {
            const pendingDoc = emailSnap.docs[0]
            const pendingData = pendingDoc.data()
            // Create proper user doc with real UID and copy data
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ...pendingData,
              uid: firebaseUser.uid,
              status: 'active',
            })
            // Delete old pending doc if different ID
            if (pendingDoc.id !== firebaseUser.uid) {
              const { deleteDoc } = await import('firebase/firestore')
              await deleteDoc(doc(db, 'users', pendingDoc.id))
            }
            setUserData({ ...pendingData, uid: firebaseUser.uid, status: 'active' })
          } else {
            setUserData(null)
          }
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)

  const register = async (email, password, name, role, series) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, role, series,
      uid: cred.user.uid,
      createdAt: new Date().toISOString()
    })
    return cred
  }

  const logout = () => signOut(auth)
  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, register, logout, resetPassword }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
