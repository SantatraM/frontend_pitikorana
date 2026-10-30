import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, FolderKanban, MapPin, RefreshCw, UserRound, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listTetikasa } from '../../api/tetikasa'
import { useLanguage } from '../../hooks/useLanguage'
import type { TetikasaListItem } from '../../types/tetikasa'
import './Tetikasa.css'

function formatAriary(value: string) {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return value

  const [whole, decimal = ''] = normalized.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const usefulDecimal = decimal.replace(/0+$/, '')
  return `${grouped}${usefulDecimal ? `,${usefulDecimal}` : ''} Ar`
}

export function TetikasaListPage() {
  const { language, t } = useLanguage()
  const [items, setItems] = useState<TetikasaListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')

    void listTetikasa()
      .then((response) => {
        if (active) setItems(response.data ?? [])
      })
      .catch((reason: unknown) => {
        console.error(reason)
        if (active) setError(t('tetikasa.listLoadError'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [t])

  useEffect(() => load(), [load])

  const personName = (item: TetikasaListItem) => [item.created_by.nom, item.created_by.prenom].filter(Boolean).join(' ') || t('tetikasa.noPerson')
  const place = (item: TetikasaListItem) => item.lieu?.trim() || (item.lieu_non_defini ? t('tetikasa.locationUnknown') : t('tetikasa.notProvidedF'))
  const period = (item: TetikasaListItem) => `${item.date_debut_prevue || t('tetikasa.notProvidedF')} - ${item.date_fin_prevue || t('tetikasa.notProvidedF')}`
  const creationDate = (value: string) => {
    try { return new Intl.DateTimeFormat(language === 'mg' ? 'mg-MG' : 'fr-FR', { dateStyle: 'medium' }).format(new Date(value)) }
    catch { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value)) }
  }

  return <main className="tetikasa-page tetikasa-list-page">
    <header className="tetikasa-list-hero">
      <div className="tetikasa-list-hero-copy">
        <span className="tetikasa-list-eyebrow"><FolderKanban size={17} aria-hidden="true" />{t('tetikasa.listTitle')}</span>
        <h1>{t('tetikasa.listTitle')}</h1>
        <p>{t('tetikasa.listSubtitle')}</p>
      </div>
      <div className="tetikasa-list-count" aria-label={`${items.length} ${t('tetikasa.listCount')}`}>
        <strong>{items.length}</strong><span>{t('tetikasa.listCount')}</span>
      </div>
    </header>

    {loading && <section className="tetikasa-list-state" aria-live="polite"><RefreshCw className="tetikasa-list-spinner" size={26} aria-hidden="true" /><p>{t('tetikasa.listLoading')}</p></section>}

    {!loading && error && <section className="tetikasa-list-state tetikasa-list-state-error" role="alert">
      <p>{error}</p><button type="button" className="tetikasa-list-retry" onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />{t('tetikasa.retry')}</button>
    </section>}

    {!loading && !error && items.length === 0 && <section className="tetikasa-list-state">
      <FolderKanban size={32} aria-hidden="true" /><h2>{t('tetikasa.listEmpty')}</h2><p>{t('tetikasa.listEmptyHelp')}</p>
    </section>}

    {!loading && !error && items.length > 0 && <section className="tetikasa-list-grid" aria-label={t('tetikasa.listTitle')}>
      {items.map((item) => <article className="tetikasa-list-card" key={item.id}>
        <header className="tetikasa-list-card-head">
          <span className="tetikasa-status">{item.statut.code === 'DRAFITRA' ? t('tetikasa.statusDraft') : item.statut.code}</span>
          <small>{t('tetikasa.listCreated')} {creationDate(item.date_creation)}</small>
        </header>
        <h2>{item.titre || t('tetikasa.untitled')}</h2>
        <dl className="tetikasa-list-meta">
          <div><dt><MapPin size={17} aria-hidden="true" />{t('tetikasa.location')}</dt><dd>{place(item)}</dd></div>
          <div><dt><CalendarDays size={17} aria-hidden="true" />{t('tetikasa.plannedPeriod')}</dt><dd>{period(item)}</dd></div>
          <div><dt><UserRound size={17} aria-hidden="true" />{t('tetikasa.createdBy')}</dt><dd>{personName(item)}</dd></div>
        </dl>
        <footer className="tetikasa-list-card-footer">
          <div className="tetikasa-list-budget"><span><WalletCards size={17} aria-hidden="true" />{t('tetikasa.budget')}</span><strong>{formatAriary(item.total_budget_calcule)}</strong></div>
          <Link className="tetikasa-list-link" to={`/tetikasa/${item.id}`}>{t('tetikasa.listView')}<ArrowRight size={17} aria-hidden="true" /></Link>
        </footer>
      </article>)}
    </section>}
  </main>
}