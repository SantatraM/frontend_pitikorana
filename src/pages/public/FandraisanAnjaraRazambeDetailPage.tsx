import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, ChevronDown, HandCoins, Package, RefreshCw, UsersRound, WalletCards } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getFandraisanAnjaraNonDetermineDetail, getFandraisanAnjaraParRazambe, getFandraisanAnjaraRazambeDetail } from '../../api/fandraisanAnjara'
import { useLanguage } from '../../hooks/useLanguage'
import type { FandraisanAnjaraContribution, FandraisanAnjaraContributorType, FandraisanAnjaraRazambeDetail } from '../../types/fandraisanAnjara'
import './FandraisanAnjara.css'

function formatMGA(value: string, language: 'fr' | 'mg') {
  try { return `${new Intl.NumberFormat(language === 'mg' ? 'fr-MG' : 'fr-FR').format(BigInt(value))} Ar` } catch { return `${value} Ar` }
}

function formatDate(value: string, language: 'fr' | 'mg') {
  const locale = language === 'mg' ? 'mg-MG' : 'fr-FR'
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(parsed)
}

function totalMoneyLines(contributions: FandraisanAnjaraContribution[]) {
  try {
    return contributions.reduce((total, contribution) => total + contribution.lignes.reduce(
      (lineTotal, line) => line.nature === 'ARGENT' ? lineTotal + BigInt(line.montant ?? '0') : lineTotal,
      0n,
    ), 0n).toString()
  } catch { return '0' }
}

type ContributorGroup = {
  key: string
  type: FandraisanAnjaraContributorType
  libelle: string
  contributions: FandraisanAnjaraContribution[]
  totalArgent: string
}

export function FandraisanAnjaraRazambeDetailPage({ nonDetermine = false }: { nonDetermine?: boolean }) {
  const { id } = useParams()
  const { t, language } = useLanguage()
  const [detail, setDetail] = useState<FandraisanAnjaraRazambeDetail | null>(null)
  const [razambeName, setRazambeName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openContributorKeys, setOpenContributorKeys] = useState<Set<string>>(() => new Set())
  const load = useCallback(() => {
    let active = true
    setLoading(true); setError(''); setRazambeName(null)
    const request = nonDetermine ? getFandraisanAnjaraNonDetermineDetail() : id ? getFandraisanAnjaraRazambeDetail(id) : Promise.reject(new Error('missing id'))
    void request.then((response) => { if (active) setDetail(response.data ?? null) })
      .catch(() => { if (active) { setDetail(null); setError(t('fandraisanAnjaraWorkflow.razambeDetailLoadError')) } })
      .finally(() => { if (active) setLoading(false) })
    if (!nonDetermine && id) {
      void getFandraisanAnjaraParRazambe().then((response) => {
        const current = response.data?.razambe.find((razambe) => razambe.id_razambe?.toLowerCase() === id.toLowerCase())
        const name = current?.nom_razambe_actuel?.trim()
        if (active && name) setRazambeName(name)
      }).catch(() => {})
    }
    return () => { active = false }
  }, [id, nonDetermine, t])
  useEffect(() => load(), [load])
  useEffect(() => { setOpenContributorKeys(new Set()) }, [id, nonDetermine])

  const contributionCount = useMemo(() => detail?.contributions_par_date.reduce((count, group) => count + group.contributions.length, 0) ?? 0, [detail])
  const contributionsByDateAndContributor = useMemo(() => detail?.contributions_par_date.map((dateGroup) => {
    const groups = new Map<string, ContributorGroup>()
    dateGroup.contributions.forEach((contribution) => {
      const contributorId = contribution.contributeur.id?.trim()
      // A missing stable identifier intentionally creates a one-record group: names alone are never used for grouping.
      const key = contributorId ? `${contribution.contributeur.type}:${contributorId}` : `unknown:${contribution.id}`
      const existing = groups.get(key)
      if (existing) existing.contributions.push(contribution)
      else groups.set(key, { key, type: contribution.contributeur.type, libelle: contribution.contributeur.libelle_snapshot, contributions: [contribution], totalArgent: '0' })
    })
    return {
      date_contribution: dateGroup.date_contribution,
      totalArgent: dateGroup.total_argent_mga,
      contributors: [...groups.values()].map((group) => ({ ...group, totalArgent: totalMoneyLines(group.contributions) })),
    }
  }) ?? [], [detail])
  const contributorType = (value: FandraisanAnjaraContributorType) => t(`fandraisanAnjara.contributorType${value}`)
  const title = nonDetermine ? t('fandraisanAnjara.nonDetermined') : razambeName ?? t('fandraisanAnjara.razambeDetail')
  const contributionLabel = (count: number) => count === 1 ? t('fandraisanAnjara.contributionSingular') : t('fandraisanAnjara.contributionPlural')
  const toggleContributor = (key: string) => setOpenContributorKeys((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  return <main className="fandraisan-page fandraisan-razambe-detail-page">
    <Link className="fandraisan-back" to="/fandraisan-anjara"><ArrowLeft size={18} />{t('fandraisanAnjara.back')}</Link>
    <header className="fandraisan-head">
      <div><p className="fandraisan-eyebrow"><HandCoins size={18} />{t('fandraisanAnjara.eyebrow')} / {t('fandraisanAnjara.byRazambe')}</p><h1>{title}</h1><p>{t('fandraisanAnjara.participationHistory')}</p></div>
      <button type="button" className="fandraisan-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={17} />{t('fandraisanAnjara.refresh')}</button>
    </header>
    {loading && <section className="fandraisan-state"><RefreshCw className="fandraisan-spin" size={28} /><p>{t('fandraisanAnjara.loading')}</p></section>}
    {!loading && error && <section className="fandraisan-state fandraisan-error" role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>{t('fandraisanAnjara.retry')}</button></section>}
    {!loading && !error && detail && <>
      <section className="fandraisan-razambe-metrics">
        <article><span className="fandraisan-razambe-metric-icon money"><WalletCards /></span><span>{t('fandraisanAnjara.totalMoney')}</span><strong>{formatMGA(detail.total_argent_mga, language)}</strong></article>
        <article><span className="fandraisan-razambe-metric-icon contributions"><UsersRound /></span><span>{t('fandraisanAnjara.contributions')}</span><strong>{contributionCount}</strong></article>
      </section>
      <section className="fandraisan-history-section">
        <h2>{t('fandraisanAnjara.participationHistory')}</h2>
        {contributionsByDateAndContributor.length ? contributionsByDateAndContributor.map((dateGroup) => <section className="fandraisan-date-group" key={dateGroup.date_contribution}>
          <h3><span><CalendarDays size={17} />{formatDate(dateGroup.date_contribution, language)}</span><strong>{formatMGA(dateGroup.totalArgent, language)}</strong></h3>
          <div className="fandraisan-contributor-list">
            {dateGroup.contributors.map((group) => {
              const expandableKey = `${dateGroup.date_contribution}:${group.key}`
              const expanded = openContributorKeys.has(expandableKey)
              const contentId = `contributor-${dateGroup.date_contribution}-${group.key}`
              return <article className={`fandraisan-contributor-row${expanded ? ' is-open' : ''}`} key={group.key}>
                <button type="button" className="fandraisan-contributor-toggle" onClick={() => toggleContributor(expandableKey)} aria-expanded={expanded} aria-controls={contentId}>
                  <span className="fandraisan-contributor-identity"><strong>{group.libelle}</strong><span><i>{contributorType(group.type)}</i>{group.contributions.length} {contributionLabel(group.contributions.length)}</span></span>
                  <span className="fandraisan-contributor-total"><strong>{formatMGA(group.totalArgent, language)}</strong><ChevronDown size={19} aria-hidden="true" /></span>
                </button>
                {expanded && <div className="fandraisan-contributor-details" id={contentId}>
                  {group.contributions.map((contribution, recordIndex) => <section className="fandraisan-contribution-record" key={contribution.id}>
                    {group.contributions.length > 1 && <p className="fandraisan-contribution-record-title">{t('fandraisanAnjara.contributionRecord')} {recordIndex + 1} — {contribution.contributeur.libelle_snapshot}</p>}
                    <div className="fandraisan-donation-lines">{contribution.lignes.map((line) => line.nature === 'ARGENT'
                      ? <div className="fandraisan-donation-line money" key={line.ordre}><WalletCards size={18} /><span>{t('fandraisanAnjara.money')}</span><strong>{formatMGA(line.montant ?? '0', language)}</strong></div>
                      : <div className="fandraisan-donation-line material" key={line.ordre}><Package size={18} /><span>{line.designation}</span><strong>{line.quantite} {line.unite}</strong></div>)}</div>
                    {contribution.observation && <p className="fandraisan-contribution-observation"><strong>{t('fandraisanAnjara.observation')}:</strong>{contribution.observation}</p>}
                  </section>)}
                </div>}
              </article>
            })}
          </div>
        </section>) : <section className="fandraisan-state"><p>{t('fandraisanAnjara.noContributions')}</p></section>}
      </section>
    </>}
  </main>
}
