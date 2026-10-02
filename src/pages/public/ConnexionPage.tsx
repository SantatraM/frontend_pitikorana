import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { getInitialisationStatut } from '../../api/initialisation'
import { useAuth } from '../../hooks/useAuth'
import { isBusinessManagerRole } from '../../types/auth'
import { useLanguage } from '../../hooks/useLanguage'
import type { Language, Translator } from '../../i18n/types'

function errorMessage(error: unknown, t: Translator) {
  if (error instanceof ApiError) {
    if (error.status === 401) return t('errors.auth.invalidCredentials')
    if (error.status === 403) return error.message || t('errors.auth.accountUnauthorized')
    if (error.status >= 500) return t('errors.auth.apiUnavailable')
    return error.message
  }
  return t('errors.auth.loginUnavailable')
}

export function ConnexionPage() {
  const { user, isLoading, login } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [bootstrapRequired, setBootstrapRequired] = useState<boolean | null>(null)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
  const copy = {
    institution: t('auth.login.institution'), institutionFull: t('auth.login.institutionFull'), welcomePrefix: t('auth.login.welcomePrefix'),
    welcomeTitle: t('auth.login.welcomeTitle'), welcomeTagline: t('auth.login.welcomeTagline'), welcomeText: t('auth.login.welcomeText'),
    signIn: t('auth.login.title'), signInDescription: t('auth.login.description'), identifier: t('auth.login.identifier'), password: t('auth.login.password'),
    showPassword: t('auth.login.showPassword'), hidePassword: t('auth.login.hidePassword'), show: t('auth.login.show'), hide: t('auth.login.hide'),
    submit: t('auth.login.submit'), submitting: t('auth.login.submitting'), forgotPassword: t('auth.login.forgotPassword'),
    passwordRecoveryUnavailable: t('auth.login.passwordRecoveryUnavailable'), or: t('auth.login.or'), createAccount: t('auth.login.createAccount'),
    createAccountDescription: t('auth.login.createAccountDescription'), followRequest: t('auth.login.followRequest'),
    followRequestDescription: t('auth.login.followRequestDescription'), firstAdministrator: t('auth.login.firstAdministrator'),
    firstAdministratorDescription: t('auth.login.firstAdministratorDescription'), wordmark: t('auth.login.wordmark'),
  }

  useEffect(() => {
    let active = true

    void getInitialisationStatut()
      .then((response) => { if (active) setBootstrapRequired(response.data?.initialisation_requise === true) })
      .catch(() => { if (active) setBootstrapRequired(false) })

    return () => { active = false }
  }, [])

  if (!isLoading && user) return <Navigate to={isBusinessManagerRole(user.compte.role) ? '/admin' : '/membre'} replace />
  const returnTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const authenticatedUser = await login({ identifiant: identifiant.trim(), mot_de_passe: motDePasse })
      const defaultPath = isBusinessManagerRole(authenticatedUser.compte.role) ? '/admin' : '/membre'
      navigate(returnTo && returnTo !== '/admin' ? returnTo : defaultPath, { replace: true })
    } catch (caughtError) { setError(errorMessage(caughtError, t)) } finally { setIsSubmitting(false) }
  }

  return <section className="login-screen" aria-labelledby="connexion-title">
    <aside className="login-hero" aria-label="FJKM Falimanjaka">
      <img className="login-hero-image" src="/images/eglise-falimanjaka.png" alt="Église FJKM Falimanjaka" />
      <div className="login-hero-content">
        <div className="login-identity"><span className="login-wordmark">PITIK’ORANA</span><span className="login-identity-divider" aria-hidden="true" /><span><strong>{copy.institution}</strong><small>{copy.institutionFull}</small></span></div>
        <div className="login-welcome"><span className="login-welcome-accent" aria-hidden="true" /><p>{copy.welcomePrefix}</p><h2>{copy.welcomeTitle}</h2><strong>{copy.welcomeTagline}</strong><p className="login-welcome-text">{copy.welcomeText}</p></div>
      </div>
    </aside>
    <main className="login-panel">
      <header className="login-mobile-header"><span className="login-wordmark">{copy.wordmark}</span><LanguageSwitch language={language} onChange={setLanguage} /></header>
      <div className="login-panel-language"><LanguageSwitch language={language} onChange={setLanguage} /></div>
      <div className="login-card">
        <div className="login-card-brand"><span className="login-wordmark">{copy.wordmark}</span><small>{copy.welcomeTagline}</small></div>
        <h1 id="connexion-title">{copy.signIn}</h1><p className="login-form-intro">{copy.signInDescription}</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field"><label htmlFor="identifiant">{copy.identifier}</label><input id="identifiant" name="identifiant" type="text" autoComplete="username" value={identifiant} onChange={(event) => setIdentifiant(event.target.value)} required disabled={isSubmitting} /></div>
          <div className="login-field"><label htmlFor="mot-de-passe">{copy.password}</label><div className="login-password-input"><input id="mot-de-passe" name="mot_de_passe" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={motDePasse} onChange={(event) => setMotDePasse(event.target.value)} required disabled={isSubmitting} /><button type="button" className="password-visibility" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? copy.hidePassword : copy.showPassword} aria-pressed={showPassword} disabled={isSubmitting}>{showPassword ? copy.hide : copy.show}</button></div></div>
          {error && <p className="login-form-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? copy.submitting : <>{copy.submit} <span aria-hidden="true">→</span></>}</button>
        </form>
        <button className="forgot-password" type="button" onClick={() => setRecoveryMessage(copy.passwordRecoveryUnavailable)}>{copy.forgotPassword}</button>
        {recoveryMessage && <p className="login-inline-message" role="status">{recoveryMessage}</p>}
        <div className="login-divider"><span />{copy.or}<span /></div>
        <div className="login-shortcuts">
          <Shortcut to="/inscription" tone="blue" title={copy.createAccount} description={copy.createAccountDescription} icon="＋" />
          <Shortcut to="/suivi-inscription" tone="sand" title={copy.followRequest} description={copy.followRequestDescription} icon="▣" />
          {bootstrapRequired === true && <Shortcut to="/initialisation" tone="green" title={copy.firstAdministrator} description={copy.firstAdministratorDescription} icon="✓" />}
        </div>
      </div>
    </main>
  </section>
}

function LanguageSwitch({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  const { t } = useLanguage()
  return <div className="language-switch" aria-label={t('common.languageChoice')}><button type="button" className={language === 'fr' ? 'active' : ''} onClick={() => onChange('fr')} aria-pressed={language === 'fr'}>FR</button><button type="button" className={language === 'mg' ? 'active' : ''} onClick={() => onChange('mg')} aria-pressed={language === 'mg'}>MG</button></div>
}

function Shortcut({ to, tone, title, description, icon }: { to: string; tone: 'blue' | 'sand' | 'green'; title: string; description: string; icon: string }) {
  return <Link className={`login-shortcut login-shortcut-${tone}`} to={to}><span className="login-shortcut-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><span className="login-shortcut-arrow" aria-hidden="true">→</span></Link>
}

