import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { searchContributors, type ContributorOption } from '../../api/fandraisanAnjara'
import { useLanguage } from '../../hooks/useLanguage'
import type { FandraisanAnjaraContributorType } from '../../types/fandraisanAnjara'

interface Props {
  type: FandraisanAnjaraContributorType
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}

export function FandraisanAnjaraContributorSelector({ type, value, onChange, disabled = false }: Props) {
  const { t } = useLanguage()
  const uid = useId()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [active, setActive] = useState(-1)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<ContributorOption | null>(null)
  const [selectionError, setSelectionError] = useState(false)
  const [result, setResult] = useState<{ key: string; items: ContributorOption[]; more: boolean; error: boolean } | null>(null)
  const requestKey = JSON.stringify([type, query, page, retry])
  const expanded = open && !disabled
  const loading = expanded && result?.key !== requestKey
  const current = result?.key === requestKey ? result : null
  const items = current?.items ?? []
  const label = selected?.id === value ? selected.libelle : value ? selectionError ? value : t('fandraisanAnjara.loading') : ''

  useEffect(() => {
    if (!expanded) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void searchContributors({ type, recherche: query, page }, controller.signal)
        .then(response => {
          if (!controller.signal.aborted) setResult({ key: requestKey, items: response.data?.contributeurs ?? [], more: response.data?.pagination.has_more ?? false, error: false })
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ key: requestKey, items: [], more: false, error: true })
        })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [expanded, type, query, page, requestKey])

  // Restore the label for a saved, locked request without changing its ID.
  useEffect(() => {
    if (!value || selected?.id === value) return
    const controller = new AbortController()
    void searchContributors({ type, id: value }, controller.signal)
      .then(response => {
        if (!controller.signal.aborted) {
          const option = response.data?.contributeurs.find(item => item.id === value)
          if (option) setSelected(option)
          setSelectionError(!option)
        }
      })
      .catch(() => { if (!controller.signal.aborted) setSelectionError(true) })
    return () => controller.abort()
  }, [type, value, selected?.id, retry])

  useEffect(() => {
    if (active >= 0) document.getElementById(`${uid}-option-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, uid])

  const show = () => { if (!disabled) { setOpen(true); setQuery(''); setPage(1); setActive(-1) } }
  const choose = (option: ContributorOption) => {
    setSelected(option); setSelectionError(false); onChange(option.id); setOpen(false); setActive(-1)
    input.current?.focus()
  }
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!expanded) { show(); return }
      setActive(index => event.key === 'ArrowDown' ? Math.min(items.length - 1, index + 1) : index <= 0 ? items.length - 1 : index - 1)
    } else if (expanded && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault(); setActive(event.key === 'Home' ? 0 : items.length - 1)
    } else if (expanded && event.key === 'Enter') {
      event.preventDefault(); if (items[active]) choose(items[active])
    }
  }
  const changePage = (next: number) => { setPage(next); setActive(-1); input.current?.focus() }

  return <div className="fandraisan-contributor" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <label htmlFor={`${uid}-input`}>{t('fandraisanAnjara.contributor')}</label>
    <div className="fandraisan-contributor-field">
      <input ref={input} id={`${uid}-input`} role="combobox" aria-expanded={expanded} aria-controls={`${uid}-results`}
        aria-autocomplete="list" aria-activedescendant={expanded && items[active] ? `${uid}-option-${active}` : undefined}
        aria-describedby={value ? `${uid}-selected` : undefined} autoComplete="off" maxLength={100}
        placeholder={expanded ? t('contributorSelector.search') : t('fandraisanAnjara.selectContributor')}
        value={expanded ? query : label} disabled={disabled} onFocus={() => { if (!open) show() }}
        onClick={() => { if (!open) show() }} onKeyDown={keyDown}
        onChange={event => { setQuery(event.target.value); setPage(1); setActive(-1); setOpen(true) }} />
      {expanded ? <Search size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
    </div>
    {value && <small id={`${uid}-selected`} className="fandraisan-contributor-selected">
      {t('contributorSelector.selected')}: <strong>{selectionError && selected?.id !== value ? value : label}</strong>
    </small>}
    {selectionError && value && <p role="alert">{t('contributorSelector.error')} <button type="button" onClick={() => setRetry(n => n + 1)}>{t('contributorSelector.retry')}</button></p>}
    {expanded && <div className="fandraisan-contributor-panel">
      <p className="sr-only" role="status">{loading ? t('fandraisanAnjara.loading') : current?.error ? t('contributorSelector.error') : items.length ? `${items.length}` : t('contributorSelector.empty')}</p>
      <div id={`${uid}-results`} role="listbox" aria-label={t('fandraisanAnjara.contributor')} aria-busy={loading} className="fandraisan-contributor-results">
        {items.map((option, index) => <div key={option.id} id={`${uid}-option-${index}`} role="option"
          aria-selected={value === option.id} className={active === index ? 'active' : ''}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
          <strong>{option.libelle}</strong>
        </div>)}
      </div>
      {loading && <p>{t('fandraisanAnjara.loading')}</p>}
      {current?.error && <p role="alert">{t('contributorSelector.error')} <button type="button" onClick={() => setRetry(n => n + 1)}>{t('contributorSelector.retry')}</button></p>}
      {!loading && current && !current.error && !items.length && <p>{t('contributorSelector.empty')}</p>}
      <div className="fandraisan-contributor-pagination">
        <button type="button" aria-label={t('contributorSelector.previous')} onClick={() => changePage(page - 1)} disabled={loading || page <= 1}><ChevronLeft size={17} /></button>
        <span>{t('contributorSelector.page')} {page}</span>
        <button type="button" aria-label={t('contributorSelector.next')} onClick={() => changePage(page + 1)} disabled={loading || !current?.more}><ChevronRight size={17} /></button>
      </div>
    </div>}
  </div>
}
