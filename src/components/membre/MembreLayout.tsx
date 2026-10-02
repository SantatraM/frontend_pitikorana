import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import { MembreSidebar } from './MembreSidebar'
import { MembreTopbar } from './MembreTopbar'

export function MembreLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  return <div className="admin-shell membre-shell"><MembreSidebar /><div className="admin-main"><MembreTopbar onOpenMenu={() => setIsMenuOpen(true)} isMenuOpen={isMenuOpen} /><main className="admin-content"><Outlet /></main></div>{isMenuOpen && <div className="admin-mobile-layer"><button className="admin-mobile-backdrop" type="button" aria-label={t('member.closeMenu')} onClick={() => setIsMenuOpen(false)} /><div id="membre-mobile-menu" className="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label={t('member.navigation')}><button className="admin-mobile-close" type="button" onClick={() => setIsMenuOpen(false)} aria-label={t('member.closeMenu')}>×</button><MembreSidebar onNavigate={() => setIsMenuOpen(false)} /></div></div>}</div>
}
