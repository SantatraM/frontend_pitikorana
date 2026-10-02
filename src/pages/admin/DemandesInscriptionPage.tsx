import { useEffect, useMemo, useState } from 'react'
import { Eye, FileText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { getDemandesInscription } from '../../api/demandesInscription'
import { useLanguage } from '../../hooks/useLanguage'
import type { AdminDemandeInscription, StatutDemandeInscription } from '../../types/demandeInscription'

const PAGE_SIZE = 10
const filters: Array<'TOUTES' | StatutDemandeInscription> = ['TOUTES', 'EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'ANNULEE']

function statusText(status: 'TOUTES' | StatutDemandeInscription, t: ReturnType<typeof useLanguage>['t']) {
  return status === 'TOUTES' ? t('admin.all') : status === 'EN_ATTENTE' ? t('admin.statusPending') : status === 'VALIDEE' ? t('admin.statusApproved') : status === 'REFUSEE' ? t('admin.statusRejected') : t('admin.statusCancelled')
}

function requesterName(item: AdminDemandeInscription, t: ReturnType<typeof useLanguage>['t']) {
  if (item.id_personne) return t('admin.existingSheet')
  const person = item.donnees.personne
  const name = [person?.nom, person?.prenom].filter(Boolean).join(' ')
  return name || t('admin.requesterUnavailable')
}

export function DemandesInscriptionPage() {
  const { language, t } = useLanguage()
  const [items, setItems] = useState<AdminDemandeInscription[]>([])
  const [filter, setFilter] = useState<(typeof filters)[number]>('TOUTES')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getDemandesInscription()
      .then((response) => setItems(response.data ?? []))
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : t('admin.requestsLoadError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => setPage(1), [filter, query])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language === 'mg' ? 'mg-MG' : 'fr-FR')
    return items.filter((item) => {
      if (filter !== 'TOUTES' && item.statut.code !== filter) return false
      if (!normalized) return true
      const person = item.donnees.personne
      const searchable = [item.reference, item.email, item.telephone, person?.nom, person?.prenom]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase(language === 'mg' ? 'mg-MG' : 'fr-FR')
      return searchable.includes(normalized)
    })
  }, [filter, items, language, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const counts = useMemo(() => ({
    EN_ATTENTE: items.filter((item) => item.statut.code === 'EN_ATTENTE').length,
    VALIDEE: items.filter((item) => item.statut.code === 'VALIDEE').length,
    REFUSEE: items.filter((item) => item.statut.code === 'REFUSEE').length,
    ANNULEE: items.filter((item) => item.statut.code === 'ANNULEE').length,
  }), [items])
  const format = (value: string) => new Intl.DateTimeFormat(language === 'mg' ? 'mg-MG' : 'fr-FR', { dateStyle: 'medium' }).format(new Date(value))
  const hasItems = items.length > 0

  if (loading) return <p className="admin-state">{t('admin.loadingRequests')}</p>

  return <section className="admin-requests-page admin-requests-v2">
    <header className="admin-page-heading admin-requests-heading">
      <div><h2>{t('admin.requests')}</h2><span>{t('admin.requestsSubtitle')}</span></div>
    </header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="admin-request-stats" aria-label={t('admin.requests')}>
      {(['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'ANNULEE'] as const).map((status) => <article key={status} className={`admin-request-stat admin-request-stat-${status}`}><span>{statusText(status, t)}</span><strong>{counts[status]}</strong></article>)}
    </div>
    <div className="admin-request-controls">
      <label className="admin-request-search"><Search size={18} aria-hidden="true"/><input aria-label={t('admin.searchRequests')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admin.searchRequests')} /></label>
      <div className="admin-filter-row" aria-label={t('admin.requests')}>{filters.map((value) => <button key={value} type="button" className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{statusText(value, t)}</button>)}</div>
    </div>
    {!hasItems ? <section className="admin-request-empty"><FileText size={28} aria-hidden="true"/><p>{t('admin.noRequestsGlobal')}</p></section> : filtered.length === 0 ? <section className="admin-request-empty"><Search size={28} aria-hidden="true"/><p>{t('admin.noRequestsSearch')}</p></section> : <>
      <div className="admin-request-table-wrap"><table className="admin-request-table"><thead><tr><th>{t('admin.requester')}</th><th>{t('admin.contact')}</th><th>{t('admin.reference')}</th><th>{t('admin.type')}</th><th>{t('admin.date')}</th><th>{t('admin.status')}</th><th><span className="sr-only">{t('admin.actions')}</span></th></tr></thead><tbody>{paged.map((item) => <tr key={item.id}><td><strong>{requesterName(item, t)}</strong></td><td><span>{item.email || t('admin.contactUnavailable')}</span>{item.telephone && <small>{item.telephone}</small>}</td><td><code>{item.reference}</code></td><td><span className="admin-request-type">{item.id_personne ? t('admin.existingSheet') : t('admin.newSheet')}</span></td><td>{format(item.date_demande)}</td><td><span className={`admin-status-badge admin-status-${item.statut.code}`}>{statusText(item.statut.code, t)}</span></td><td><Link className="admin-request-view" to={`/admin/demandes-inscription/${item.id}`}><Eye size={16} aria-hidden="true"/>{t('admin.view')}</Link></td></tr>)}</tbody></table></div>
      <div className="admin-request-mobile-list">{paged.map((item) => <article className="admin-request-mobile-card" key={item.id}><header><strong>{requesterName(item, t)}</strong><span className={`admin-status-badge admin-status-${item.statut.code}`}>{statusText(item.statut.code, t)}</span></header><p>{item.email || t('admin.contactUnavailable')}{item.telephone && <><br/><small>{item.telephone}</small></>}</p><dl><div><dt>{t('admin.reference')}</dt><dd><code>{item.reference}</code></dd></div><div><dt>{t('admin.type')}</dt><dd>{item.id_personne ? t('admin.existingSheet') : t('admin.newSheet')}</dd></div><div><dt>{t('admin.date')}</dt><dd>{format(item.date_demande)}</dd></div></dl><Link className="admin-request-view" to={`/admin/demandes-inscription/${item.id}`}><Eye size={16} aria-hidden="true"/>{t('admin.view')}</Link></article>)}</div>
      {totalPages > 1 && <nav className="admin-request-pagination" aria-label={t('admin.requests')}><button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>{t('admin.previous')}</button><span>{t('admin.page')} {page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>{t('admin.next')}</button></nav>}
    </>}
  </section>
}