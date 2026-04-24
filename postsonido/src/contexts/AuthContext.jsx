import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

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
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snap.exists()) setUserData(snap.data())
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
