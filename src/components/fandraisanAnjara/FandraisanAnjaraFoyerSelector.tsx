import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { listFoyersSelection } from '../../api/fandraisanAnjara'
import { useLanguage } from '../../hooks/useLanguage'
import type { FandraisanAnjaraFoyerSelection } from '../../types/fandraisanAnjara'

interface Props {
  value: string
  onChange: (foyer: FandraisanAnjaraFoyerSelection) => void
  disabled?: boolean
  historicLabel?: string
}

export function FandraisanAnjaraFoyerSelector({ value, onChange, disabled = false, historicLabel }: Props) {
  const { t } = useLanguage()
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(1)
  const [foyers, setFoyers] = useState<FandraisanAnjaraFoyerSelection[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)

  useEffect(() => { setPage(1) }, [recherche])
  useEffect(() => {
    const current = ++request.current
    setLoading(true); setError('')
    void listFoyersSelection({ recherche, page, limit: 20 })
      .then((response) => {
        if (current !== request.current) return
        setFoyers(response.data?.foyers ?? [])
        setPagination(response.data?.pagination ?? { page, limit: 20, total: 0, total_pages: 0 })
      })
      .catch((cause) => { if (current === request.current) setError(cause instanceof ApiError ? cause.message : t('fandraisanAnjaraWorkflow.foyerLoadError')) })
      .finally(() => { if (current === request.current) setLoading(false) })
  }, [page, recherche, t])

  const selectedInResults = foyers.some((foyer) => foyer.id === value)
  return <section className="fandraisan-foyer-selector" aria-label={t('fandraisanAnjaraWorkflow.foyerSelector')}>
    <label>{t('fandraisanAnjaraWorkflow.foyerSearch')}<span className="fandraisan-foyer-search"><Search size={16}/><input value={recherche} onChange={(event) => setRecherche(event.target.value)} disabled={disabled} /></span></label>
    {historicLabel && value && !selectedInResults && <p className="fandraisan-foyer-historical">{t('fandraisanAnjaraWorkflow.foyerHistorical')}: {historicLabel}</p>}
    {loading && <p>{t('fandraisanAnjara.loading')}</p>}
    {error && <p className="fandraisan-form-error" role="alert">{error}</p>}
    {!loading && !error && <div className="fandraisan-foyer-results" role="listbox" aria-label={t('fandraisanAnjaraWorkflow.foyerResults')}>
      {foyers.map((foyer) => <button type="button" key={foyer.id} className={value === foyer.id ? 'selected' : ''} onClick={() => onChange(foyer)} disabled={disabled} role="option" aria-selected={value === foyer.id}><strong>{foyer.libelle}</strong><small>{foyer.type_foyer} · {foyer.personnes.length}</small></button>)}
      {!foyers.length && <p>{t('fandraisanAnjaraWorkflow.foyerEmpty')}</p>}
    </div>}
    <div className="fandraisan-foyer-pagination"><button type="button" onClick={() => setPage((value) => value - 1)} disabled={disabled || loading || page <= 1}><ChevronLeft size={16}/></button><span>{pagination.page} / {pagination.total_pages || 1}</span><button type="button" onClick={() => setPage((value) => value + 1)} disabled={disabled || loading || page >= pagination.total_pages}><ChevronRight size={16}/></button></div>
  </section>
}
