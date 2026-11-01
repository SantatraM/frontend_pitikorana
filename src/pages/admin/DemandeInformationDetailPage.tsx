import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { changeInformationStatus, getInformation, informationErrorMessage } from '../../api/demandesInformation'
import { useLanguage } from '../../hooks/useLanguage'
import { ApiError } from '../../api/apiClient'
import type { InformationItem, InformationStatus } from '../../types/demandeInformation'
import '../public/DemandeInformation.css'
import './DemandesInformation.css'

export function DemandeInformationDetailPage() {
  const { id = '' } = useParams(); const { t, language } = useLanguage()
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{ id: string; revisionKey: number; item?: InformationItem; error?: unknown } | null>(null)
  const [status, setStatus] = useState<InformationStatus>('NOUVELLE')
  const [busy, setBusy] = useState(false); const saving = useRef(false); const [error, setError] = useState<unknown>(null); const [saved, setSaved] = useState(false)
  const item = result?.id === id && result.revisionKey === reload ? result.item : undefined
  useEffect(() => {
    const controller = new AbortController()
    void getInformation(id, controller.signal).then(response => {
      if (!controller.signal.aborted && response.data) { setResult({ id, revisionKey: reload, item: response.data }); setStatus(response.data.statut) }
    }).catch(cause => { if (!controller.signal.aborted) setResult({ id, revisionKey: reload, error: cause }) })
    return () => controller.abort()
  }, [id, reload])
  const save = async () => {
    if (!item || saving.current || status === item.statut) return
    saving.current = true; setBusy(true); setError(null); setSaved(false)
    try {
      const response = await changeInformationStatus(id, status, item.revision)
      if (!response.data) throw new Error('unconfirmed')
      setResult({ id, revisionKey: reload, item: response.data }); setStatus(response.data.statut); setSaved(true)
    } catch (cause) { setError(cause) } finally { saving.current = false; setBusy(false) }
  }
  const refresh = () => { setError(null); setSaved(false); setReload(n => n + 1) }
  const date = (value: string) => new Intl.DateTimeFormat(language === 'mg' ? 'mg-MG' : 'fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Indian/Antananarivo' }).format(new Date(value))
  const loadError = result?.id === id && result.revisionKey === reload ? result.error : undefined
  return <section className="information-page information-admin-detail" aria-labelledby="information-detail-title">
    <Link className="information-back" to="/admin/demandes-information">← {t('information.back')}</Link><h1 id="information-detail-title">{t('information.detail')}</h1>
    {!item && loadError === undefined && <p role="status">{t('information.loading')}</p>}
    {loadError !== undefined && <div className="information-error" role="alert"><p>{informationErrorMessage(loadError, t)}</p><button type="button" onClick={refresh}>{t('information.retry')}</button></div>}
    {item && <article className="information-card">
      <dl className="information-detail-meta"><div><dt>{t('information.requester')}</dt><dd>{item.nom} {item.prenom}</dd></div><div><dt>{t('information.contact')}</dt><dd>{item.contact}</dd></div><div><dt>{t('information.date')}</dt><dd><time dateTime={item.date_creation}>{date(item.date_creation)}</time></dd></div><div><dt>{t('information.origin')}</dt><dd>{t(`information.${item.origine}`)}</dd></div></dl>
      <section className="information-message"><h2>{t('information.message')}</h2><p>{item.message}</p></section>
      <form className="information-status-form" onSubmit={e => { e.preventDefault(); void save() }}><label htmlFor="information-status">{t('information.status')}</label><div><select id="information-status" value={status} onChange={e => { setStatus(e.target.value as InformationStatus); setSaved(false) }} disabled={busy}>{(['NOUVELLE','EN_COURS','TRAITEE'] as const).map(s => <option key={s} value={s}>{t(`information.${s}`)}</option>)}</select><button className="information-primary" type="submit" disabled={busy || status === item.statut || (error instanceof ApiError && error.status === 409)}>{busy ? t('information.sending') : t('information.save')}</button></div></form>
      {saved && <p className="information-saved" role="status">{t('information.saved')}</p>}
      {error !== null && <div className="information-error" role="alert"><p>{informationErrorMessage(error, t)}</p><button type="button" onClick={refresh}>{t('information.reload')}</button></div>}
    </article>}
  </section>
}
