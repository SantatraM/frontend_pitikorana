import { NavLink } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import '../../pages/public/DemandeInformation.css'

export function PublicNavigation() {
  const { t, language, setLanguage } = useLanguage()
  return <nav className="information-public-nav" aria-label={t('admin.navigation')}>
    <strong>PITIKORANA</strong><div><NavLink to="/connexion">{t('information.home')}</NavLink><NavLink to="/demande-information">{t('information.title')}</NavLink>
      <div role="group" aria-label={t('common.languageChoice')}><button type="button" aria-pressed={language === 'fr'} onClick={() => setLanguage('fr')}>FR</button> <button type="button" aria-pressed={language === 'mg'} onClick={() => setLanguage('mg')}>MG</button></div>
    </div>
  </nav>
}
