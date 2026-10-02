import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'

const titleFor = (pathname: string, t: ReturnType<typeof useLanguage>['t']) => {
  if (pathname === '/admin') return t('admin.dashboard')
  if (pathname === '/admin/profil') return t('admin.myProfile')
  if (pathname === '/admin/profil/modifier') return t('admin.editPerson')
  if (pathname === '/personnes') return t('admin.people')
  if (pathname === '/branches' || pathname.startsWith('/branches/')) return t('admin.familyBranch')
  if (pathname === '/personnes/nouvelle') return t('admin.newPerson')
  if (/^\/personnes\/[^/]+\/modifier$/.test(pathname)) return t('admin.editPerson')
  if (/^\/personnes\/[^/]+\/foyer$/.test(pathname)) return t('admin.personEdit.foyerTitle')
  if (/^\/personnes\/[^/]+$/.test(pathname)) return t('admin.personRecord')
  if (pathname === '/admin/demandes-inscription') return t('admin.requests')
  if (pathname.startsWith('/admin/demandes-inscription/')) return t('admin.requestDetail')
  return t('admin.references')
}

export function AdminTopbar({ onOpenMenu, isMenuOpen }: { onOpenMenu: () => void; isMenuOpen: boolean }) {
  const { user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { pathname } = useLocation()
  const displayName = [user?.personne.prenom, user?.personne.nom].filter(Boolean).join(' ') || t('admin.administrator')
  const initials = [user?.personne.prenom, user?.personne.nom].filter(Boolean).map((value) => value?.slice(0, 1)).join('').toUpperCase() || 'A'
  return <header className="admin-topbar">
    <div className="admin-topbar-title"><button className="admin-menu-trigger" type="button" onClick={onOpenMenu} aria-label={t('admin.openMenu')} aria-expanded={isMenuOpen} aria-controls="admin-mobile-menu">☰</button><h1>{titleFor(pathname, t)}</h1></div>
    <div className="admin-topbar-actions"><div className="admin-language-switch" aria-label={t('common.languageChoice')}><button type="button" className={language === 'fr' ? 'active' : ''} onClick={() => setLanguage('fr')} aria-pressed={language === 'fr'}>FR</button><button type="button" className={language === 'mg' ? 'active' : ''} onClick={() => setLanguage('mg')} aria-pressed={language === 'mg'}>MG</button></div><div className="admin-user"><span className="admin-avatar" aria-hidden="true">{initials}</span><span><strong>{displayName}</strong><small>{t('admin.administrator')}</small></span></div></div>
  </header>
}
