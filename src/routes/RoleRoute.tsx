import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isBusinessManagerRole, type AuthRole } from '../types/auth'

export function RoleRoute({ role }: { role: AuthRole | AuthRole[] }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/connexion" replace />
  const allowedRoles = Array.isArray(role) ? role : [role]
  if (!allowedRoles.includes(user.compte.role)) {
    return <Navigate to={isBusinessManagerRole(user.compte.role) ? '/admin' : '/membre'} replace />
  }
  return <Outlet />
}