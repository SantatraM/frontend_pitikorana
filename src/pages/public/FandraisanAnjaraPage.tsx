import { useCallback, useEffect, useMemo, useState } from 'react'
import { Boxes, CircleDollarSign, HandCoins, RefreshCw, Search, UsersRound, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getFandraisanAnjaraParRazambe, getFandraisanAnjaraStatistiques } from '../../api/fandraisanAnjara'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { isBusinessManagerRole } from '../../types/auth'
import type { FandraisanAnjaraPeriodFilters, FandraisanAnjaraRazambeList, FandraisanAnjaraRazambeSummary, FandraisanAnjaraStatistics } from '../../types/fandraisanAnjara'
import './FandraisanAnjara.css'

function formatMGA(value: string, language: 'fr' | 'mg') {
  try { return `${new Intl.NumberFormat(language === 'mg' ? 'fr-MG' : 'fr-FR').format(BigInt(value))} Ar` } catch { return `${value} Ar` }
}

function compareMoneyDescending(left: FandraisanAnjaraRazambeSummary, right: FandraisanAnjaraRazambeSummary, language: 'fr' | 'mg') {
  try { const difference = BigInt(right.total_argent_mga) - BigInt(left.total_argent_mga); if (difference !== 0n) return difference > 0n ? 1 : -1 } catch { /* backend contract provides integer strings */ }
  return (left.nom_razambe_actuel ?? '').localeCompare(right.nom_razambe_actuel ?? '', language)
}

export function FandraisanAnjaraPage() {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const [filters, setFilters] = useState<FandraisanAnjaraPeriodFilters>({})
  const [statistics, setStatistics] = useState<FandraisanAnjaraStatistics | null>(null)
  const [groups, setGroups] = useState<FandraisanAnjaraRazambeList | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    let active = true
    setLoading(true); setError('')
    void Promise.all([getFandraisanAnjaraStatistiques(filters), getFandraisanAnjaraParRazambe(filters)])
      .then(([stats, razambe]) => { if (active) { setStatistics(stats.data ?? null); setGroups(razambe.data ?? null) } })
      .catch((reason: unknown) => { console.error(reason); if (active) { setStatistics(null); setGroups(null); setError(t('fandraisanAnjara.loadError')) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, t])
  useEffect(() => load(), [load])

  const listQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.date_debut) params.set('date_debut', filters.date_debut)
    if (filters.date_fin) params.set('date_fin', filters.date_fin)
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters])
  const rows = useMemo(() => (groups?.razambe ?? [])
    .filter((item) => (item.nom_razambe_actuel ?? '').toLocaleLowerCase(language).includes(search.trim().toLocaleLowerCase(language)))
    .sort((left, right) => compareMoneyDescending(left, right, language)), [groups, language, search])
  const nonDetermine = groups?.non_determine && groups.non_determine.nombre_contributions > 0 ? groups.non_determine : null

  return <main className="fandraisan-page fandraisan-dashboard">
    <section className="fandraisan-dashboard-sheet">
      <header className="fandraisan-head">
        <div><p className="fandraisan-eyebrow"><HandCoins size={18} />{t('fandraisanAnjara.eyebrow')}</p><h1>{t('fandraisanAnjara.title')}</h1><p>{t('fandraisanAnjara.subtitle')}</p></div>
        <div className="fandraisan-actions"><button type="button" className="fandraisan-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={17} />{t('fandraisanAnjara.refresh')}</button>{user && isBusinessManagerRole(user.compte.role) && <Link className="fandraisan-primary-link" to="/fandraisan-anjara/nouvelle">+ {t('fandraisanAnjara.newContribution')}</Link>}</div>
      </header>
      <form className="fandraisan-filters" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const start = String(data.get('date_debut') ?? ''); const end = String(data.get('date_fin') ?? ''); if (!start || !end || end >= start) setFilters({ date_debut: start || undefined, date_fin: end || undefined }) }}>
        <label>{t('fandraisanAnjara.dateStart')}<input name="date_debut" type="date" defaultValue={filters.date_debut} /></label><label>{t('fandraisanAnjara.dateEnd')}<input name="date_fin" type="date" defaultValue={filters.date_fin} /></label><button type="submit">{t('fandraisanAnjara.applyFilters')}</button><button type="button" className="fandraisan-ghost" onClick={() => setFilters({})}>{t('fandraisanAnjara.resetFilters')}</button>
      </form>
      {loading && <section className="fandraisan-state"><RefreshCw className="fandraisan-spin" size={28} /><p>{t('fandraisanAnjara.loading')}</p></section>}
      {!loading && error && <section className="fandraisan-state fandraisan-error" role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>{t('fandraisanAnjara.retry')}</button></section>}
      {!loading && !error && statistics && groups && <>
        <section className="fandraisan-metrics" aria-label={t('fandraisanAnjara.dashboardMetrics')}>
          <Link className="fandraisan-metric-link money" to={`/fandraisan-anjara/liste${listQuery}`}><WalletCards /><span>{t('fandraisanAnjara.totalMoney')}</span><strong>{formatMGA(statistics.total_argent_mga, language)}</strong></Link>
          <Link className="fandraisan-metric-link contributions" to={`/fandraisan-anjara/liste${listQuery ? `${listQuery}&statut=ACTIF` : '?statut=ACTIF'}`}><CircleDollarSign /><span>{t('fandraisanAnjara.activeContributions')}</span><strong>{statistics.nombre_contributions_actives}</strong></Link>
          <Link className="fandraisan-metric-link contributors" to={`/fandraisan-anjara/liste${listQuery}`}><UsersRound /><span>{t('fandraisanAnjara.distinctContributors')}</span><strong>{statistics.nombre_contributeurs_distincts}</strong></Link>
          <button type="button" className="fandraisan-metric-link razambe" onClick={() => document.getElementById('fandraisan-razambe-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Boxes /><span>{t('fandraisanAnjara.representedRazambe')}</span><strong>{statistics.nombre_razambe_representes}</strong></button>
        </section>
        <section className="fandraisan-card fandraisan-razambe-table-card" id="fandraisan-razambe-table">
          <header><div><h2>{t('fandraisanAnjara.participationsByRazambe')}</h2><p>{t('fandraisanAnjara.participationsByRazambeHelp')}</p></div><label className="fandraisan-razambe-search"><Search size={16} /><span className="sr-only">{t('fandraisanAnjara.searchRazambe')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('fandraisanAnjara.searchRazambe')} /></label></header>
          <div className="fandraisan-dashboard-table-wrap"><table><thead><tr><th>#</th><th>{t('fandraisanAnjara.razambe')}</th><th className="fandraisan-money-cell">{t('fandraisanAnjara.totalMoney')}</th><th>{t('fandraisanAnjara.actions')}</th></tr></thead><tbody>{rows.map((item, index) => <tr key={item.id_razambe}><td>{index + 1}</td><td><strong>{item.nom_razambe_actuel ?? t('fandraisanAnjara.unknownRazambe')}</strong></td><td className="fandraisan-money-cell">{formatMGA(item.total_argent_mga, language)}</td><td><Link className="fandraisan-view-link" to={`/fandraisan-anjara/razambe/${item.id_razambe}`}>{t('fandraisanAnjara.viewDetails')}</Link></td></tr>)}{nonDetermine && <tr className="fandraisan-nondet-row"><td>—</td><td><strong>{t('fandraisanAnjara.nonDetermined')}</strong></td><td className="fandraisan-money-cell">{formatMGA(nonDetermine.total_argent_mga, language)}</td><td><Link className="fandraisan-view-link" to="/fandraisan-anjara/razambe/non-determine">{t('fandraisanAnjara.viewDetails')}</Link></td></tr>}{!rows.length && !nonDetermine && <tr><td colSpan={4} className="fandraisan-empty-table">{t('fandraisanAnjara.noContributions')}</td></tr>}</tbody><tfoot><tr><th colSpan={2}>{t('fandraisanAnjara.grandTotal')}</th><th className="fandraisan-money-cell">{formatMGA(statistics.total_argent_mga, language)}</th><th /></tr></tfoot></table></div>
        </section>
      </>}
    </section>
  </main>
}
