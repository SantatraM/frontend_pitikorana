import { CalendarDays, GitBranch, LayoutDashboard, LogOut, MessageCircle, User, Users } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'

type Props = { onNavigate?: () => void }

export function MembreSidebar({ onNavigate }: Props) {
  const { logout } = useAuth(); const { t } = useLanguage(); const navigate = useNavigate()
  const links = [{ to: '/membre', label: t('member.dashboard'), Icon: LayoutDashboard }, { to: '/membre/profil', label: t('member.myProfile'), Icon: User }, { to: '/personnes', label: t('member.people'), Icon: Users }, { to: '/branches', label: t('admin.familyBranch'), Icon: GitBranch }, { to: '/alahadin-taranaka', label: t('alahadin.title'), Icon: CalendarDays }, { to: '/soso-kevitra', label: t('soso.moduleName'), Icon: MessageCircle }]
  async function signOut() { await logout(); navigate('/connexion', { replace: true }) }
  return <aside className="admin-sidebar membre-sidebar"><div className="admin-brand"><strong>PITIKORANA</strong><span>FJKM Falimanjaka</span></div><nav className="admin-navigation" aria-label={t('member.navigation')}>{links.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/membre'} className={({ isActive }) => isActive ? 'active' : undefined} onClick={onNavigate}><Icon aria-hidden="true" />{label}</NavLink>)}</nav><div className="admin-sidebar-footer"><button type="button" onClick={() => void signOut()}><LogOut aria-hidden="true" />{t('member.logout')}</button></div></aside>
}
