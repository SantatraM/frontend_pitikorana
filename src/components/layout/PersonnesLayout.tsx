import { Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { isBusinessManagerRole } from '../../types/auth'
import { AdminLayout } from '../admin/AdminLayout'
import { MembreLayout } from '../membre/MembreLayout'

/** Keeps the public/member Personnes routes unchanged while reusing the ADMIN shell for an authenticated administrator. */
export function PersonnesLayout() {
  const { user } = useAuth()
  if (isBusinessManagerRole(user?.compte.role)) return <AdminLayout />
  if (user?.compte.role === 'MEMBRE') return <MembreLayout />
  return <Outlet />
}
