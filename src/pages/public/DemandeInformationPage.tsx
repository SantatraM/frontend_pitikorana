import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ShieldCheck, Send } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { getPersonne } from '../../api/personnes'
import { informationErrorMessage, prepareInformation, sendInformation } from '../../api/demandesInformation'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import type { InformationDraft, InformationTicket } from '../../types/demandeInformation'
import './DemandeInformation.css'

const blank: InformationDraft = { nom: '', prenom: '', contact: '', message: '' }
type Field = keyof InformationDraft
const validContact = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || (/^\+?[\d ()\-.]+$/.test(v.trim()) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15)

export function DemandeInformationPage() {
  const { user, isAuthenticated, isLoading } = useAuth(); const { t, language, setLanguage } = useLanguage()
  const isConfirmedVisitor = !isLoading && !isAuthenticated && user === null
  const personId = user?.personne.id; const profileName = user?.personne.nom ?? ''; const profileFirstName = user?.personne.prenom ?? ''
  const initial = { ...blank, nom: profileName, prenom: profileFirstName }
  const [values, setValues] = useState<InformationDraft>(initial)
  const defaults = useRef(initial)
  const touched = useRef<Partial<Record<Field, boolean>>>({})
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [ticket, setTicket] = useState<InformationTicket | null>(null)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<unknown>(null)
  const [prepareError, setPrepareError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [success, setSuccess] = useState(false)
  const [guest, setGuest] = useState(false)
  const [website, setWebsite] = useState('')
  const [attempt, setAttempt] = useState<InformationDraft | null>(null)
  const frozen = busy || attempt !== null

  useEffect(() => {
    const controller = new AbortController()
    void prepareInformation(controller.signal).then(response => {
      if (!controller.signal.aborted) { setTicket(response.data ?? null); setPrepareError(response.data ? null : new Error('unavailable')) }
    }).catch(cause => { if (!controller.signal.aborted) setPrepareError(cause) })
    return () => controller.abort()
  }, [reload])

  useEffect(() => {
    if (!personId) return
    let active = true
    const apply = (contact = '') => {
      if (!active) return
      const next = { ...blank, nom: profileName, prenom: profileFirstName, contact }
      defaults.current = next
      setValues(current => ({ ...current,
        nom: !touched.current.nom && !current.nom ? next.nom : current.nom,
        prenom: !touched.current.prenom && !current.prenom ? next.prenom : current.prenom,
        contact: !touched.current.contact && !current.contact ? next.contact : current.contact,
      }))
    }
    void getPersonne(personId, language).then(response => {
      const person = response.data
      // Never use another person's response, nor unverified contact sources.
      if (person?.id !== personId) { apply(); return }
      const contact = [person.contact?.email, person.contact?.telephone].find(v => v && validContact(v)) ?? ''
      apply(contact)
    }).catch(() => apply())
    return () => { active = false }
  }, [personId, profileName, profileFirstName, language])

  const edit = (field: Field, value: string) => { touched.current[field] = true; setValues(v => ({ ...v, [field]: value })); setErrors(v => ({ ...v, [field]: undefined })) }
  const validate = () => {
    const next: Partial<Record<Field, string>> = {}
    for (const field of ['nom', 'prenom'] as const) {
      if (!values[field].trim()) next[field] = t('information.required')
      else if (values[field].trim().length > 100 || /[\r\n]/.test(values[field])) next[field] = t('information.invalidName')
    }
    if (!values.contact.trim()) next.contact = t('information.required')
    else if (!validContact(values.contact) || values.contact.length > 255) next.contact = t('information.invalidContact')
    if (values.message.trim().length < 10 || values.message.trim().length > 5000) next.message = t('information.invalidMessage')
    setErrors(next)
    if (Object.keys(next).length) document.getElementById(`information-${Object.keys(next)[0]}`)?.focus()
    return !Object.keys(next).length
  }
  const submit = async (asGuest = guest) => {
    if (!ticket || submitting.current || (!attempt && !validate())) return
    const payload = attempt ?? { ...values }
    submitting.current = true; setBusy(true); setError(null)
    try {
      const response = await sendInformation(payload, ticket, asGuest, website)
      if (response.data?.accepted !== true) throw new Error('unconfirmed')
      setSuccess(true); setAttempt(null)
    } catch (cause) {
      setError(cause)
      if (!(cause instanceof ApiError) || cause.status >= 500) setAttempt(payload)
      else if (!attempt && cause.status !== 409) setAttempt(null)
    } finally { setBusy(false); submitting.current = false }
  }
  const newTicket = () => { setTicket(null); setPrepareError(null); setError(null); setReload(n => n + 1) }
  const reset = () => { setSuccess(false); setGuest(false); setAttempt(null); setErrors({}); touched.current = {}; setValues(defaults.current); newTicket() }
  const field = (name: 'nom' | 'prenom' | 'contact') => <div className="information-field">
    <label htmlFor={`information-${name}`}>{t(`information.${name}`)} <span aria-hidden="true">*</span></label>
    <input id={`information-${name}`} name={name} value={values[name]} onChange={e => edit(name, e.target.value)}
      maxLength={name === 'contact' ? 255 : 100} required disabled={frozen} autoComplete={name === 'nom' ? 'family-name' : name === 'prenom' ? 'given-name' : 'email'}
      aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `information-${name}-error` : name === 'contact' ? 'information-contact-help' : undefined} />
    {name === 'contact' && <small id="information-contact-help">{t('information.contactHelp')}</small>}
    {errors[name] && <small id={`information-${name}-error`} className="information-field-error">{errors[name]}</small>}
  </div>

  return <section className="information-page" aria-labelledby="information-title">
    {isConfirmedVisitor && <div className="information-page-tools">
      <Link className="information-back-login" to="/connexion"><span aria-hidden="true">←</span> {t('information.backToLogin')}</Link>
      <div className="information-language-switch" role="group" aria-label={t('common.languageChoice')}>
        <button type="button" aria-pressed={language === 'fr'} onClick={() => setLanguage('fr')}>FR</button>
        <button type="button" aria-pressed={language === 'mg'} onClick={() => setLanguage('mg')}>MG</button>
      </div>
    </div>}
    <header className="information-heading"><div>{isConfirmedVisitor && <p className="information-eyebrow">PITIK’ORANA · FJKM FALIMANJAKA</p>}<h1 id="information-title">{t('information.title')}</h1><p>{t('information.subtitle')}</p></div></header>
    {success ? <div className="information-card information-success" role="status"><CheckCircle2 size={42} aria-hidden="true" /><h2>{t('information.success')}</h2><p>{t('information.successHelp')}</p><button type="button" className="information-primary" onClick={reset}>{t('information.another')}</button></div>
      : <form className="information-card information-form" onSubmit={(e: FormEvent) => { e.preventDefault(); void submit() }} noValidate aria-busy={busy}>
        <div className="information-form-grid">{field('nom')}{field('prenom')}<div className="information-wide">{field('contact')}</div>
          <div className="information-field information-wide"><label htmlFor="information-message">{t('information.message')} <span aria-hidden="true">*</span></label>
            <textarea id="information-message" name="message" value={values.message} onChange={e => edit('message', e.target.value)} minLength={10} maxLength={5000} required disabled={frozen} aria-invalid={!!errors.message} aria-describedby="information-message-help information-message-error" />
            <div className="information-message-help"><small id="information-message-help">{t('information.messageHelp')}</small><small>{values.message.length} / 5 000</small></div>
            <small id="information-message-error" className="information-field-error">{errors.message}</small>
          </div>
        </div>
        <div className="information-decoy" aria-hidden="true"><label htmlFor="information-website">{t('information.decoy')}</label><input id="information-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
        <p className="information-privacy"><ShieldCheck size={20} aria-hidden="true" /><span>{t('information.privacy')}</span></p>
        {guest && <p role="status">{t('information.guestNotice')}</p>}
        {prepareError !== null && <div className="information-error" role="alert"><p>{informationErrorMessage(prepareError, t)}</p><button type="button" onClick={newTicket}>{t('information.retry')}</button></div>}
        {error !== null && <div className="information-error" role="alert"><p>{attempt && error instanceof ApiError && error.status === 401 ? t('information.sessionRetry') : attempt && (!(error instanceof ApiError) || error.status >= 500) ? t('information.network') : informationErrorMessage(error, t)}</p>
          {!attempt && error instanceof ApiError && error.status === 401 && <button type="button" disabled={busy} onClick={() => { setGuest(true); void submit(true) }}>{t('information.guest')}</button>}
          {attempt && error instanceof ApiError && error.status === 401 && <a href="/connexion" target="_blank" rel="noopener noreferrer">{t('information.home')} ↗</a>}
          {!attempt && error instanceof ApiError && error.response?.code === 'INFORMATION_TOKEN_INVALID' && <button type="button" onClick={newTicket}>{t('information.reload')}</button>}
        </div>}
        <footer className="information-form-footer"><small role="status">{!ticket && prepareError === null ? t('information.preparing') : ''}</small><button className="information-primary" type="submit" disabled={busy || !ticket}><Send size={17} aria-hidden="true" />{busy ? t('information.sending') : attempt ? t('information.retry') : t('information.send')}</button></footer>
      </form>}
  </section>
}
