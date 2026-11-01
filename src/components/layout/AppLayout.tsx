import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PublicNavigation } from './PublicNavigation'

export function AppLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const publicPage = ['/inscription', '/suivi-inscription'].includes(pathname)
  return <>{!user && publicPage && <PublicNavigation />}<Outlet /></>
}