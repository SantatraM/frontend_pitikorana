import { useEffect, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { informationErrorMessage, informationStats, listInformation } from '../../api/demandesInformation'
import { useLanguage } from '../../hooks/useLanguage'
import type { InformationList, InformationStatus } from '../../types/demandeInformation'
import '../public/DemandeInformation.css'
import './DemandesInformation.css'

export function DemandesInformationPage() {
  const { t, language } = useLanguage()
  const [query, setQuery] = useState(''); const [statut, setStatut] = useState<InformationStatus | ''>(''); const [page, setPage] = useState(1); const [reload, setReload] = useState(0)
  const key = JSON.stringify([query, statut, page, reload])
  const [result, setResult] = useState<{ key: string; data?: InformationList; nouvelles?: number; error?: unknown } | null>(null)
  const current = result?.key === key ? result : null
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void Promise.all([listInformation({ recherche: query, statut, page }, controller.signal), informationStats(controller.signal)])
        .then(([list, stats]) => { if (!controller.signal.aborted) setResult({ key, data: list.data, nouvelles: stats.data?.nouvelles }) })
        .catch(error => { if (!controller.signal.aborted) setResult({ key, error }) })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query, statut, page, key])
  const date = (value: string) => new Intl.DateTimeFormat(language === 'mg' ? 'mg-MG' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Indian/Antananarivo' }).format(new Date(value))
  const data = current?.data
  return <section className="information-page information-admin" aria-labelledby="information-admin-title">
    <header className="information-admin-heading"><div><h1 id="information-admin-title">{t('information.adminTitle')}</h1><p>{t('information.adminSubtitle')}</p></div>{current?.nouvelles !== undefined && <div className="information-counter"><span>{t('information.newCount')}</span><strong>{current.nouvelles}</strong></div>}</header>
    <div className="information-card">
      <div className="information-admin-filters"><label><span>{t('information.search')}</span><div className="information-admin-search"><Search size={17} aria-hidden="true"/><input maxLength={100} value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></div></label>
        <label><span>{t('information.status')}</span><select value={statut} onChange={e => { setStatut(e.target.value as InformationStatus | ''); setPage(1) }}><option value="">{t('information.all')}</option>{(['NOUVELLE','EN_COURS','TRAITEE'] as const).map(s => <option key={s} value={s}>{t(`information.${s}`)}</option>)}</select></label>
      </div>
      {!current && <p role="status">{t('information.loading')}</p>}
      {current?.error !== undefined && <div className="information-error" role="alert"><p>{informationErrorMessage(current.error, t)}</p><button type="button" onClick={() => setReload(n => n + 1)}>{t('information.retry')}</button></div>}
      {data && <><div className="information-table-wrap"><table><thead><tr><th>{t('information.date')}</th><th>{t('information.requester')}</th><th>{t('information.contact')}</th><th>{t('information.origin')}</th><th>{t('information.status')}</th><th><span className="sr-only">{t('information.open')}</span></th></tr></thead><tbody>
        {data.demandes.map(item => <tr key={item.id}>
          <td data-label={t('information.date')}><time dateTime={item.date_creation}>{date(item.date_creation)}</time></td>
          <td data-label={t('information.requester')}><strong>{item.nom} {item.prenom}</strong></td><td data-label={t('information.contact')}>{item.contact}</td>
          <td data-label={t('information.origin')}>{t(`information.${item.origine}`)}</td><td data-label={t('information.status')}><span className={`information-badge information-status-${item.statut}`}>{t(`information.${item.statut}`)}</span></td>
          <td data-label={t('information.open')}><Link className="information-view" to={`/admin/demandes-information/${item.id}`} aria-label={`${t('information.open')} — ${item.nom} ${item.prenom}`}><Eye size={17} aria-hidden="true"/><span className="sr-only">{t('information.open')}</span></Link></td>
        </tr>)}
      </tbody></table></div>{!data.demandes.length && <p className="information-empty" role="status">{t('information.empty')}</p>}
        <nav className="information-pagination" aria-label={t('information.page')}><span>{data.pagination.total} {t('information.total')}</span><div><button type="button" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>{t('information.previous')}</button><span>{t('information.page')} {page} / {Math.max(1, data.pagination.total_pages)}</span><button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.total_pages}>{t('information.next')}</button></div></nav>
      </>}
    </div>
  </section>
}
