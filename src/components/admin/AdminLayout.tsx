import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'

export function AdminLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsMenuOpen(false) }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [])
  return <div className="admin-shell"><AdminSidebar /><div className="admin-main"><AdminTopbar onOpenMenu={() => setIsMenuOpen(true)} isMenuOpen={isMenuOpen} /><main className="admin-content"><Outlet /></main></div>{isMenuOpen && <div className="admin-mobile-layer"><button className="admin-mobile-backdrop" type="button" aria-label={t('admin.closeMenu')} onClick={() => setIsMenuOpen(false)} /><div id="admin-mobile-menu" className="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label={t('admin.navigation')}><button className="admin-mobile-close" type="button" onClick={() => setIsMenuOpen(false)} aria-label={t('admin.closeMenu')}>×</button><AdminSidebar onNavigate={() => setIsMenuOpen(false)} /></div></div>}</div>
}
