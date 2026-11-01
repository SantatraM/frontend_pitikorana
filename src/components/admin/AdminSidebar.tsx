import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { AdminIcon } from './AdminIcon'

type Props = { onNavigate?: () => void }

export function AdminSidebar({ onNavigate }: Props) {
  const { logout, user } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const canManageInformation = ['ADMIN', 'PASTEUR'].includes(user?.compte.role ?? '')
  const links = [
    ['/admin', 'dashboard', t('admin.dashboard')], ['/personnes', 'people', t('admin.peopleMenu')], ...(['ADMIN', 'PASTEUR'].includes(user?.compte.role ?? '') ? [['/personnes/sans-compte', 'people', t('admin.peopleWithoutAccount')] as const] : []), ['/branches', 'branches', t('admin.familyBranch')], ['/admin/demandes-inscription', 'requests', t('admin.requests')], ...(user?.compte.role === 'ADMIN' ? [['/utilisateurs', 'people', 'Gestion des utilisateurs'] as const, ['/admin/referentiels', 'references', t('admin.references')] as const] : []), ['/soso-kevitra', 'suggestions', t('soso.moduleName')], ['/tetikasa', 'briefcase', language === 'mg' ? 'Tetikasa' : 'Projets'], ['/fandraisan-anjara', 'chart', t('fandraisanAnjara.moduleName')],
  ] as const
  async function signOut() { await logout(); navigate('/connexion', { replace: true }) }
  return <aside className="admin-sidebar">
    <div className="admin-brand"><strong>PITIKORANA</strong><span>FJKM Falimanjaka</span></div>
    <nav className="admin-navigation" aria-label={t('admin.navigation')}>
      {canManageInformation ? <div className="information-navigation-group" role="group" aria-label={t('information.title')}>
        <div className="information-navigation-heading"><AdminIcon name="requests" />{t('information.title')}</div>
        <div className="information-navigation-children">
          <NavLink to="/demande-information" onClick={onNavigate}>{t('information.newRequest')}</NavLink>
          <NavLink to="/admin/demandes-information" onClick={onNavigate}>{t('information.requestList')}</NavLink>
        </div>
      </div> : <NavLink to="/demande-information" onClick={onNavigate}><AdminIcon name="requests" />{t('information.title')}</NavLink>}
      {links.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => isActive ? 'active' : undefined} onClick={onNavigate}><AdminIcon name={icon} />{label}</NavLink>)}
    </nav>
    <div className="admin-sidebar-footer">
      {user?.personne.id ? <NavLink to="/admin/profil" onClick={onNavigate}><AdminIcon name="people" />{t('admin.myProfile')}</NavLink> : null}

      <button type="button" onClick={() => void signOut()}><AdminIcon name="logout" />{t('admin.logout')}</button>
    </div>
  </aside>
}
