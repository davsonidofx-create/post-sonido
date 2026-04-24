import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Series from './pages/Series'
import AppView from './pages/AppView'
import CoordView from './pages/CoordView'
import JefeView from './pages/JefeView'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

function RoleRoute({ children, roles }) {
  const { userData } = useAuth()
  if (!userData) return null
  if (!roles.includes(userData.role)) return <Navigate to="/series" replace />
  return children
}

function SmartAppRoute() {
  const { userData } = useAuth()
  if (!userData) return null
  if (userData.role === 'coordinadora') return <CoordView />
  if (userData.role === 'jefe') return <JefeView />
  return <AppView />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/series" element={<PrivateRoute><Series /></PrivateRoute>} />
          <Route path="/app/:serieId" element={<PrivateRoute><SmartAppRoute /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
