import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f5f4f0', fontSize: 13, color: '#888780',
      }}>
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}
