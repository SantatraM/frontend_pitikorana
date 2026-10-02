import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { creerPremierAdmin, getInitialisationStatut } from '../../api/initialisation'
import { rechercherPersonnesInscription } from '../../api/demandesInscription'
import { useLanguage } from '../../hooks/useLanguage'
import type { PersonneRecherchee } from '../../types/demandeInscription'
import type { ModeInitialisation, PremierAdminPayload } from '../../types/initialisation'

interface FormValues {
  nom: string
  prenom: string
  email: string
  telephone: string
  mot_de_passe: string
  confirmation_mot_de_passe: string
  secret: string
}

const initialForm: FormValues = { nom: '', prenom: '', email: '', telephone: '', mot_de_passe: '', confirmation_mot_de_passe: '', secret: '' }
const nullable = (value: string) => value.trim() || null

function Icon({ name }: { name: 'shield' | 'search' | 'check' | 'eye' }) {
  const paths = {
    shield: <><path d="M12 3 4.5 6v5.4c0 4.7 3.1 7.9 7.5 9.6 4.4-1.7 7.5-4.9 7.5-9.6V6L12 3Z" /><path d="M9 12h6M12 9v6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="5.4" /><path d="m15 15 4 4" /></>,
    check: <path d="m5 12 4.1 4.1L19 6.5" />,
    eye: <><path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.4" /></>,
  }[name]
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
}

function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage()
  return <div className="initialization-language" role="group" aria-label={t('common.languageChoice')}><button type="button" className={language === 'fr' ? 'active' : ''} aria-pressed={language === 'fr'} onClick={() => setLanguage('fr')}>FR</button><button type="button" className={language === 'mg' ? 'active' : ''} aria-pressed={language === 'mg'} onClick={() => setLanguage('mg')}>MG</button></div>
}

export function InitialisationPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [mode, setMode] = useState<ModeInitialisation>('NOUVELLE')
  const [form, setForm] = useState<FormValues>(initialForm)
  const [selectedPerson, setSelectedPerson] = useState<PersonneRecherchee | null>(null)
  const [personQuery, setPersonQuery] = useState('')
  const [personResults, setPersonResults] = useState<PersonneRecherchee[]>([])
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'empty' | 'found' | 'error'>('idle')
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function checkInitialisation() {
    setChecking(true)
    setError(null)
    try {
      const response = await getInitialisationStatut()
      if (!response.data?.initialisation_requise) {
        navigate('/connexion', { replace: true })
        return
      }
      setReady(true)
    } catch (caughtError) {
      setReady(false)
      setError(caughtError instanceof ApiError && caughtError.status === 403 ? t('initialization.unauthorized') : t('initialization.unavailableHelp'))
    } finally {
      setChecking(false)
    }
  }

  // Le contrôle initial ne doit être exécuté qu'une seule fois au montage.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void checkInitialisation() }, [])

  function updateField(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function chooseMode(nextMode: ModeInitialisation) {
    setMode(nextMode)
    setSelectedPerson(null)
    setPersonResults([])
    setSearchState('idle')
  }

  async function searchPerson() {
    const query = personQuery.trim()
    if (query.length < 2) {
      setSearchState('error')
      setError(t('initialization.searchMinimum'))
      return
    }
    setSearchState('searching')
    setError(null)
    setSelectedPerson(null)
    try {
      const response = await rechercherPersonnesInscription(query)
      const results = response.data ?? []
      setPersonResults(results)
      setSearchState(results.length ? 'found' : 'empty')
    } catch {
      setSearchState('error')
      setError(t('initialization.searchUnavailable'))
    }
  }

  function buildPayload(): PremierAdminPayload {
    const common = { email: nullable(form.email), telephone: nullable(form.telephone), mot_de_passe: form.mot_de_passe }
    if (mode === 'EXISTANTE') return { mode, id_personne: selectedPerson?.id ?? '', ...common }
    return { mode, ...common, donnees: { personne: { nom: form.nom.trim(), prenom: nullable(form.prenom) } } } as PremierAdminPayload
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    if (!form.secret) return setError(t('initialization.secretRequired'))
    if (!nullable(form.email) && !nullable(form.telephone)) return setError(t('initialization.contactRequired'))
    if (form.mot_de_passe.length < 8 || form.mot_de_passe.length > 128) return setError(t('initialization.passwordLength'))
    if (form.mot_de_passe !== form.confirmation_mot_de_passe) return setError(t('initialization.passwordMismatch'))
    if (mode === 'NOUVELLE' && !form.nom.trim()) return setError(t('initialization.nameRequired'))
    if (mode === 'EXISTANTE' && !selectedPerson) return setError(t('initialization.personRequired'))
    setSubmitting(true)
    try {
      await creerPremierAdmin(form.secret, buildPayload())
      setForm((current) => ({ ...current, secret: '', mot_de_passe: '', confirmation_mot_de_passe: '' }))
      setCreated(true)
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : t('initialization.unavailableHelp'))
      if (caughtError instanceof ApiError && caughtError.status === 409) void checkInitialisation()
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) return <section className="initialization-page"><p className="initialization-loading">{t('initialization.loading')}</p></section>
  if (error && !ready) return <section className="initialization-page"><main className="initialization-card"><h1>{t('initialization.unavailable')}</h1><p>{error}</p><button type="button" onClick={() => void checkInitialisation()}>{t('initialization.retry')}</button></main></section>
  if (created) return <section className="initialization-page"><main className="initialization-card initialization-success" aria-live="polite"><span><Icon name="check" /></span><h1>{t('initialization.successTitle')}</h1><p>{t('initialization.successDescription')}</p><Link to="/connexion">{t('initialization.signIn')}</Link></main></section>

  return <section className="initialization-page"><main className="initialization-card">
    <div className="initialization-topbar"><Link to="/connexion">← {t('initialization.back')}</Link><LanguageSwitch /></div>
    <header className="initialization-heading"><span><Icon name="shield" /></span><h1>{t('initialization.title')}</h1><p>{t('initialization.subtitle')}</p><small>{t('initialization.oneTime')}</small></header>
    <div className="initialization-modes" role="group"><button type="button" className={mode === 'EXISTANTE' ? 'active' : ''} onClick={() => chooseMode('EXISTANTE')}>{t('initialization.existingMode')}</button><button type="button" className={mode === 'NOUVELLE' ? 'active' : ''} onClick={() => chooseMode('NOUVELLE')}>{t('initialization.newMode')}</button></div>
    <form className="initialization-form" onSubmit={submit} noValidate>
      {mode === 'EXISTANTE' ? <section className="initialization-section"><h2>{t('initialization.existingTitle')}</h2>{selectedPerson ? <div className="initialization-selected"><span><Icon name="check" /></span><div><strong>{t('initialization.selectedSheet')}</strong><p>{[selectedPerson.nom, selectedPerson.prenom, selectedPerson.nom_usage].filter(Boolean).join(' ')}</p>{[selectedPerson.annee_naissance, selectedPerson.lieu_naissance].filter(Boolean).join(' · ')}</div><button type="button" onClick={() => setSelectedPerson(null)}>{t('initialization.changeSelection')}</button></div> : <><div className="initialization-person-search"><input value={personQuery} aria-label={t('initialization.existingTitle')} placeholder={t('initialization.existingPlaceholder')} onChange={(event) => setPersonQuery(event.target.value)} /><button type="button" onClick={() => void searchPerson()} disabled={searchState === 'searching'}><Icon name="search" />{searchState === 'searching' ? t('initialization.searching') : t('initialization.search')}</button></div>{searchState === 'empty' && <p className="initialization-search-message">{t('initialization.searchEmpty')}</p>}{searchState === 'found' && <div className="initialization-person-results">{personResults.map((person) => <button type="button" key={person.id} onClick={() => { setSelectedPerson(person); setPersonResults([]); setSearchState('idle') }}><strong>{[person.nom, person.prenom, person.nom_usage].filter(Boolean).join(' ')}</strong><small>{[person.annee_naissance, person.lieu_naissance].filter(Boolean).join(' · ')}</small></button>)}</div>}</>}</section> : <fieldset><legend>{t('initialization.identity')}</legend><div className="initialization-grid"><label>{t('initialization.name')}<input value={form.nom} onChange={(event) => updateField('nom', event.target.value)} required /></label><label>{t('initialization.firstName')}<input value={form.prenom} onChange={(event) => updateField('prenom', event.target.value)} /></label></div></fieldset>}
      <fieldset><legend>{t('initialization.contact')}</legend><p>{t('initialization.contactHelp')}</p><div className="initialization-grid"><label>{t('initialization.email')}<input type="email" autoComplete="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} /></label><label>{t('initialization.telephone')}<input type="tel" autoComplete="tel" value={form.telephone} onChange={(event) => updateField('telephone', event.target.value)} /></label><label>{t('initialization.password')}<span className="initialization-password"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.mot_de_passe} onChange={(event) => updateField('mot_de_passe', event.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t('initialization.hide') : t('initialization.show')}><Icon name="eye" /></button></span><small>{t('initialization.passwordHelp')}</small></label><label>{t('initialization.confirmPassword')}<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirmation_mot_de_passe} onChange={(event) => updateField('confirmation_mot_de_passe', event.target.value)} required /></label></div></fieldset>
      <fieldset><legend>{t('initialization.installationSecurity')}</legend><div className="initialization-grid"><label>{t('initialization.installationCode')}<span className="initialization-password"><input type={showSecret ? 'text' : 'password'} autoComplete="off" value={form.secret} onChange={(event) => updateField('secret', event.target.value)} required /><button type="button" onClick={() => setShowSecret((value) => !value)} aria-label={showSecret ? t('initialization.hide') : t('initialization.show')}><Icon name="eye" /></button></span><small>{t('initialization.installationCodeHelp')}</small></label></div></fieldset>
      {error && <p className="initialization-error" role="alert">{error}</p>}
      <button className="initialization-submit" type="submit" disabled={submitting}>{submitting ? t('initialization.creating') : t('initialization.create')}</button>
    </form>
  </main></section>
}
