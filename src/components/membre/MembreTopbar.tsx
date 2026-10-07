import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'

export function MembreTopbar({ onOpenMenu, isMenuOpen }: { onOpenMenu: () => void; isMenuOpen: boolean }) {
  const { user } = useAuth(); const { language, setLanguage, t } = useLanguage(); const { pathname } = useLocation()
  const displayName = [user?.personne.prenom, user?.personne.nom].filter(Boolean).join(' ') || t('member.member')
  const initials = [user?.personne.prenom, user?.personne.nom].filter(Boolean).map((value) => value?.slice(0, 1)).join('').toUpperCase() || 'M'
  return <header className="admin-topbar membre-topbar"><div className="admin-topbar-title"><button className="admin-menu-trigger membre-menu-trigger" type="button" onClick={onOpenMenu} aria-label={t('member.openMenu')} aria-expanded={isMenuOpen} aria-controls="membre-mobile-menu"><Menu size={20} aria-hidden="true" /></button><h1>{pathname.startsWith('/soso-kevitra') ? t('soso.moduleName') : pathname === '/membre/profil/modifier' ? t('member.editProfile') : pathname === '/membre/profil' ? t('member.myProfile') : (pathname === '/branches' || pathname.startsWith('/branches/')) ? t('admin.familyBranch') :  /^\/personnes\/[^/]+\/foyer$/.test(pathname) ? t('admin.personEdit.foyerTitle') : pathname.startsWith('/personnes') ? t('member.people') : t('member.dashboard')}</h1></div><div className="admin-topbar-actions"><div className="admin-language-switch" aria-label={t('common.languageChoice')}><button type="button" className={language === 'fr' ? 'active' : ''} onClick={() => setLanguage('fr')} aria-pressed={language === 'fr'}>FR</button><button type="button" className={language === 'mg' ? 'active' : ''} onClick={() => setLanguage('mg')} aria-pressed={language === 'mg'}>MG</button></div><div className="admin-user"><span className="admin-avatar" aria-hidden="true">{initials}</span><span><strong>{displayName}</strong><small>{t('member.member')}</small></span></div></div></header>
}
