import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { creerCompteDepuisDemande, suivreDemandeInscription } from '../../api/demandesInscription'
import { useAuth } from '../../hooks/useAuth'
import { isBusinessManagerRole } from '../../types/auth'
import { useLanguage } from '../../hooks/useLanguage'
import type { Language } from '../../i18n/types'
import type { DemandeInscription } from '../../types/demandeInscription'

type TrackingStatusTone = 'pending' | 'approved' | 'rejected'

function TrackingIcon({ name }: { name: 'document-search' | 'document' | 'lock' | 'search' | 'pending' | 'approved' | 'rejected' }) {
  const paths = {
    'document-search': <><path d="M7 3h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><circle cx="12" cy="14" r="3" /><path d="m14.2 16.2 2.3 2.3" /></>,
    document: <><path d="M7 3h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    lock: <><rect x="6" y="10" width="12" height="10" rx="2" /><path d="M9 10V7a3 3 0 0 1 6 0v3M12 14v2" /></>,
    search: <><circle cx="10.8" cy="10.8" r="5.4" /><path d="m15 15 4 4" /></>,
    pending: <><path d="M7 3h10M7 21h10M8 3c0 4 3 4 4 6 1-2 4-2 4-6M16 21c0-4-3-4-4-6-1 2-4 2-4 6" /></>,
    approved: <><path d="m5 12 4.1 4.1L19 6.5" /></>,
    rejected: <><path d="M12 3 3.7 19h16.6L12 3Z" /><path d="M12 9v4M12 16h.01" /></>,
  }[name]

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
}

function TrackingLanguageSwitch() {
  const { language, setLanguage, t } = useLanguage()
  const chooseLanguage = (nextLanguage: Language) => setLanguage(nextLanguage)

  return (
    <div className="registration-tracking-language" role="group" aria-label={t('common.languageChoice')}>
      <button type="button" className={language === 'fr' ? 'active' : ''} aria-pressed={language === 'fr'} onClick={() => chooseLanguage('fr')}>FR</button>
      <button type="button" className={language === 'mg' ? 'active' : ''} aria-pressed={language === 'mg'} onClick={() => chooseLanguage('mg')}>MG</button>
    </div>
  )
}

function getStatusDetails(statut: DemandeInscription['statut'], t: ReturnType<typeof useLanguage>['t']) {
  if (statut === 'VALIDEE') return { tone: 'approved' as TrackingStatusTone, icon: 'approved' as const, title: t('registration.tracking.approvedTitle'), badge: t('registration.tracking.approvedBadge'), description: t('registration.tracking.approvedDescription') }
  if (statut === 'REFUSEE' || statut === 'ANNULEE') return { tone: 'rejected' as TrackingStatusTone, icon: 'rejected' as const, title: t('registration.tracking.rejectedTitle'), badge: t('registration.tracking.rejectedBadge'), description: t('registration.tracking.rejectedDescription') }
  return { tone: 'pending' as TrackingStatusTone, icon: 'pending' as const, title: t('registration.tracking.pendingTitle'), badge: t('registration.tracking.pendingBadge'), description: t('registration.tracking.pendingDescription') }
}

function formatRequestDate(value: string, language: Language) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  try {
    return new Intl.DateTimeFormat(language === 'mg' ? 'mg-MG' : 'fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(date)
  } catch {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(date)
  }
}

export function SuiviInscriptionPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const { language, t } = useLanguage()
  const [reference, setReference] = useState(() => typeof location.state?.reference === 'string' ? location.state.reference : '')
  const [code, setCode] = useState('')
  const [demande, setDemande] = useState<DemandeInscription | null>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!isLoading && user) return <Navigate to={isBusinessManagerRole(user.compte.role) ? '/admin' : '/membre'} replace />

  async function follow(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await suivreDemandeInscription({ reference, code_suivi: code })
      setDemande(response.data ?? null)
    } catch (caughtError) {
      setDemande(null)
      setError(caughtError instanceof ApiError ? caughtError.message : t('registration.tracking.followUnavailable'))
    } finally {
      setBusy(false)
    }
  }

  async function createAccount(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmation) {
      setError(t('registration.tracking.passwordMismatch'))
      return
    }
    if (password.length < 8 || password.length > 128) {
      setError(t('registration.tracking.passwordLength'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await creerCompteDepuisDemande({ reference, code_suivi: code, mot_de_passe: password })
      setMessage(t('registration.tracking.accountCreated'))
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : t('registration.tracking.accountUnavailable'))
    } finally {
      setBusy(false)
    }
  }

  function goBack() {
    if (window.history.length > 1 && location.key !== 'default') {
      navigate(-1)
      return
    }
    navigate('/inscription')
  }

  const status = demande ? getStatusDetails(demande.statut, t) : null
  const requestDate = demande?.date_demande ? formatRequestDate(demande.date_demande, language) : null

  return (
    <section className="registration-tracking-page">
      <main className="registration-tracking-card">
        <div className="registration-tracking-topbar">
          <button type="button" className="registration-tracking-back" onClick={goBack}>← {t('registration.tracking.back')}</button>
          <TrackingLanguageSwitch />
        </div>

        <header className="registration-tracking-heading">
          <span className="registration-tracking-heading-icon"><TrackingIcon name="document-search" /></span>
          <h1>{t('registration.tracking.title')}</h1>
          <p>{t('registration.tracking.subtitle')}</p>
        </header>

        <form className="registration-tracking-form" onSubmit={follow}>
          <label>
            <span><TrackingIcon name="document" />{t('registration.tracking.referenceLabel')}</span>
            <input value={reference} onChange={(event) => setReference(event.target.value)} autoComplete="off" required />
          </label>
          <label>
            <span><TrackingIcon name="lock" />{t('registration.tracking.codeLabel')}</span>
            <input type="text" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" required />
          </label>
          <button type="submit" disabled={busy}><TrackingIcon name="search" />{busy ? t('registration.tracking.consulting') : t('registration.tracking.consult')}</button>
        </form>

        {error && <p className="registration-tracking-error" role="alert">{error}</p>}

        {demande && status && (
          <div className="registration-tracking-result" aria-live="polite">
            <div className="registration-tracking-separator" />
            <section className={`registration-tracking-status ${status.tone}`}>
              <span className="registration-tracking-status-icon"><TrackingIcon name={status.icon} /></span>
              <div>
                <h2>{status.title}</h2>
                <span className="registration-tracking-badge">{status.badge}</span>
                <p>{status.description}</p>
                {status.tone === 'rejected' && demande.commentaire_admin && <p className="registration-tracking-admin-comment">{demande.commentaire_admin}</p>}
              </div>
            </section>

            {demande.statut === 'VALIDEE' && !message && (
              <form className="registration-tracking-account" onSubmit={createAccount}>
                <p>{t('registration.tracking.accountIntro')}</p>
                <label>{t('registration.tracking.passwordLabel')}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
                <label>{t('registration.tracking.confirmPasswordLabel')}<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /></label>
                <button type="submit" disabled={busy}>{busy ? t('registration.tracking.accountCreating') : t('registration.tracking.createAccount')}</button>
              </form>
            )}

            {message && <p className="registration-tracking-success">{message} <Link to="/connexion">{t('registration.tracking.signIn')}</Link></p>}

            <section className="registration-tracking-meta">
              <div>
                <span><TrackingIcon name="document" />{t('registration.tracking.referenceLabel')}</span>
                <strong>{demande.reference}</strong>
              </div>
              {requestDate && <div>
                <span><TrackingIcon name="pending" />{t('registration.tracking.sentOn')}</span>
                <strong>{requestDate}</strong>
              </div>}
            </section>
          </div>
        )}
      </main>
    </section>
  )
}