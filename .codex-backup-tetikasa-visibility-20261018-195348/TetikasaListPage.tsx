import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Eye, FolderKanban, MapPin, RefreshCw, UserRound, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listTetikasa } from '../../api/tetikasa'
import { useLanguage } from '../../hooks/useLanguage'
import type { TetikasaListItem } from '../../types/tetikasa'
import './Tetikasa.css'

const PAGE_SIZE = 10

function formatAriary(value: string) {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return value

  const [whole, decimal = ''] = normalized.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const usefulDecimal = decimal.replace(/0+$/, '')
  return `${grouped}${usefulDecimal ? `,${usefulDecimal}` : ''} Ar`
}

function formatCivilDate(value: string | null, fallback: string) {
  if (!value) return fallback
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

export function TetikasaListPage() {
  const { language, t } = useLanguage()
  const [items, setItems] = useState<TetikasaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')

    void listTetikasa()
      .then((response) => {
        if (active) {
          setItems(response.data ?? [])
          setPage(1)
        }
      })
      .catch((reason: unknown) => {
        console.error(reason)
        if (active) setError(t('tetikasa.listLoadError'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [t])

  useEffect(() => load(), [load])

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const first = items.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const last = items.length ? first + pageItems.length - 1 : 0
  const projectCountLabel = items.length === 1
    ? t('tetikasa.project').toLocaleLowerCase(language === 'mg' ? 'mg-MG' : 'fr-FR')
    : t('tetikasa.listCount')

  const personName = (item: TetikasaListItem) => [item.created_by.nom, item.created_by.prenom].filter(Boolean).join(' ') || t('tetikasa.noPerson')
  const place = (item: TetikasaListItem) => item.lieu?.trim() || (item.lieu_non_defini ? t('tetikasa.locationUnknown') : t('tetikasa.notProvidedF'))
  const period = (item: TetikasaListItem) => {
    if (!item.date_debut_prevue && !item.date_fin_prevue) return t('tetikasa.noPeriod')
    return `${formatCivilDate(item.date_debut_prevue, t('tetikasa.notProvidedF'))}
– ${formatCivilDate(item.date_fin_prevue, t('tetikasa.notProvidedF'))}`
  }
  const renderStatus = (item: TetikasaListItem) => <span className="tetikasa-status">{item.statut.code === 'DRAFITRA' ? t('tetikasa.statusDraft') : item.statut.code}</span>

  return <main className="tetikasa-page tetikasa-list-page tetikasa-list-simple">
    <header className="tetikasa-list-simple-head">
      <h1>{t('tetikasa.listTitle')}</h1>
      <p className="tetikasa-list-count">{items.length} {items.length === 1 ? t('tetikasa.listRegisteredSingular') : t('tetikasa.listRegisteredPlural')}</p>
    </header>

    {loading && <section className="tetikasa-list-state" aria-live="polite"><RefreshCw className="tetikasa-list-spinner" size={26} aria-hidden="true" /><p>{t('tetikasa.listLoading')}</p></section>}
    {!loading && error && <section className="tetikasa-list-state tetikasa-list-state-error" role="alert"><p>{error}</p><button type="button" className="tetikasa-list-retry" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />{t('tetikasa.retry')}</button></section>}
    {!loading && !error && items.length === 0 && <section className="tetikasa-list-state"><FolderKanban size={32} aria-hidden="true" /><h2>{t('tetikasa.listEmpty')}</h2><p>{t('tetikasa.listEmptyHelp')}</p></section>}

    {!loading && !error && items.length > 0 && <section className="tetikasa-list-simple-table-panel">
      <table>
        <colgroup>
          <col className="tetikasa-list-col-number" />
          <col className="tetikasa-list-col-project" />
          <col className="tetikasa-list-col-status" />
          <col className="tetikasa-list-col-period" />
          <col className="tetikasa-list-col-budget" />
          <col className="tetikasa-list-col-action" />
        </colgroup>
        <thead><tr><th>{t('tetikasa.rowNumber')}</th><th>{t('tetikasa.project')}</th><th>{t('tetikasa.filterStatus')}</th><th>{t('tetikasa.plannedPeriod')}</th><th>{t('tetikasa.budget')}</th><th>{t('tetikasa.listActions')}</th></tr></thead>
        <tbody>{pageItems.map((item, index) => <tr key={item.id}><td className="tetikasa-list-index" data-label={t('tetikasa.rowNumber')}>{first + index}</td>
          <td className="tetikasa-list-project-cell" data-label={t('tetikasa.project')}>
            <strong>{item.titre || t('tetikasa.untitled')}</strong>
            <span><MapPin size={15} aria-hidden="true" />{place(item)}</span>
            <small><UserRound size={14} aria-hidden="true" />{personName(item)}</small>
          </td>
          <td data-label={t('tetikasa.filterStatus')}>{renderStatus(item)}</td>
          <td data-label={t('tetikasa.plannedPeriod')}><span className="tetikasa-list-cell-icon"><CalendarDays size={17} aria-hidden="true" />{period(item)}</span></td>
          <td className="tetikasa-list-money" data-label={t('tetikasa.budget')}><WalletCards size={17} aria-hidden="true" />{formatAriary(item.total_budget_calcule)}</td>
          <td className="tetikasa-list-action-cell" data-label={t('tetikasa.listActions')}><Link className="tetikasa-list-view" to={`/tetikasa/${item.id}`} aria-label={`${t('tetikasa.listView')} : ${item.titre || t('tetikasa.untitled')}`}><Eye size={17} aria-hidden="true" /><span>{t('tetikasa.listViewShort')}</span></Link></td>
        </tr>)}</tbody>
      </table>
      <footer className="tetikasa-list-pagination">
        <p>{t('tetikasa.showing')} {first} {t('tetikasa.to')} {last} {t('tetikasa.of')} {items.length} {projectCountLabel}</p>
        {pageCount > 1 && <div><button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label={t('tetikasa.previous')}><ChevronLeft size={19} aria-hidden="true" /></button><span aria-current="page">{currentPage}</span><button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label={t('tetikasa.next')}><ChevronRight size={19} aria-hidden="true" /></button></div>}
      </footer>
    </section>}
  </main>
}