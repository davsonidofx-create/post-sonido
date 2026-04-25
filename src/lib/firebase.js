import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCPqvkF1sfvSvYLB8kJlsDT9Z54hsUOA-A",
  authDomain: "post-sonido.firebaseapp.com",
  projectId: "post-sonido",
  storageBucket: "post-sonido.firebasestorage.app",
  messagingSenderId: "257951387153",
  appId: "1:257951387153:web:8c3bfc30c1c2134ae52bb0",
  measurementId: "G-NQPCZ0G5GV"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
