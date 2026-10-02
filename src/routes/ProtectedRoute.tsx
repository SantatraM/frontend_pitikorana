import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <main className="auth-loading" aria-live="polite">Vérification de la session…</main>
  if (!isAuthenticated) return <Navigate to="/connexion" replace state={{ from: location }} />
  return <Outlet />
}
