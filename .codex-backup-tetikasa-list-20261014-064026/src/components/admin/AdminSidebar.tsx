import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { AdminIcon } from './AdminIcon'

type Props = { onNavigate?: () => void }

export function AdminSidebar({ onNavigate }: Props) {
  const { logout, user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const links = [
    ['/admin', 'dashboard', t('admin.dashboard')], ['/personnes', 'people', t('admin.people')], ['/branches', 'branches', t('admin.familyBranch')], ['/admin/demandes-inscription', 'requests', t('admin.requests')], ...(user?.compte.role === 'ADMIN' ? [['/utilisateurs', 'people', 'Gestion des utilisateurs'] as const, ['/admin/referentiels', 'references', t('admin.references')] as const] : []), ['/alahadin-taranaka', 'calendar', t('alahadin.title')], ['/soso-kevitra', 'suggestions', t('soso.moduleName')],
  ] as const
  async function signOut() { await logout(); navigate('/connexion', { replace: true }) }
  return <aside className="admin-sidebar">
    <div className="admin-brand"><strong>PITIKORANA</strong><span>FJKM Falimanjaka</span></div>
    <nav className="admin-navigation" aria-label={t('admin.navigation')}>
      {links.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => isActive ? 'active' : undefined} onClick={onNavigate}><AdminIcon name={icon} />{label}</NavLink>)}
    </nav>
    <div className="admin-sidebar-footer">
      {user?.personne.id ? <NavLink to="/admin/profil" onClick={onNavigate}><AdminIcon name="people" />{t('admin.myProfile')}</NavLink> : null}

      <button type="button" onClick={() => void signOut()}><AdminIcon name="logout" />{t('admin.logout')}</button>
    </div>
  </aside>
}
