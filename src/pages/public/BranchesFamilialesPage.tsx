import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, GitBranch, Plus, Search, UsersRound, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { getElements, getTypesElement, type ElementReference, type TypeElementReference } from '../../api/referentielsInscription'
import { BranchCreateModal, type BranchType } from '../../components/branches/BranchCreateModal'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'

const pageSize = 20
const branchTypes: BranchType[] = ['RAZAMBE', 'TARANAKA', 'SAMPANA']
const typeOf = (element: ElementReference) => element.type_element?.code as BranchType | undefined
const translationKeyFor = (type: BranchType) => `admin.${type.toLowerCase()}` as 'admin.razambe' | 'admin.taranaka' | 'admin.sampana'
const normalize = (value: string) => value.trim().toLocaleLowerCase()

export function BranchesFamilialesPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [elements, setElements] = useState<ElementReference[]>([])
  const [typesElement, setTypesElement] = useState<TypeElementReference[]>([])
  const [activeType, setActiveType] = useState<BranchType>('RAZAMBE')
  const [search, setSearch] = useState('')
  const [selectedRazambe, setSelectedRazambe] = useState('')
  const [selectedTaranaka, setSelectedTaranaka] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const loadElements = async () => {
    const response = await getElements()
    setElements(response.data ?? [])
  }

  useEffect(() => {
    let active = true
    void Promise.all([getElements(), getTypesElement()]).then(([elementsResponse, typesResponse]) => { if (active) { setElements(elementsResponse.data ?? []); setTypesElement(typesResponse.data ?? []) } }).catch((caught) => {
      if (active) setError(caught instanceof ApiError ? caught.message : 'branch-load-error')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const byId = useMemo(() => new Map(elements.map((element) => [element.id, element])), [elements])
  const grouped = useMemo(() => Object.fromEntries(branchTypes.map((type) => [type, elements.filter((element) => typeOf(element) === type)])) as Record<BranchType, ElementReference[]>, [elements])
  const counts = useMemo(() => Object.fromEntries(branchTypes.map((type) => [type, grouped[type].length])) as Record<BranchType, number>, [grouped])
  const sortedRazambe = useMemo(() => grouped.RAZAMBE.slice().sort((a, b) => a.nom.localeCompare(b.nom)), [grouped.RAZAMBE])
  const taranakaOptions = useMemo(() => grouped.TARANAKA.filter((item) => !selectedRazambe || item.parent?.id === selectedRazambe).sort((a, b) => a.nom.localeCompare(b.nom)), [grouped.TARANAKA, selectedRazambe])
  const hierarchy = useMemo(() => {
    const childrenOf = (parentId: string, type: BranchType) => grouped[type].filter((item) => item.parent?.id === parentId)
    return new Map(elements.map((element) => {
      const taranaka = typeOf(element) === 'RAZAMBE' ? childrenOf(element.id, 'TARANAKA') : []
      const sampana = typeOf(element) === 'RAZAMBE' ? taranaka.flatMap((child) => childrenOf(child.id, 'SAMPANA')) : typeOf(element) === 'TARANAKA' ? childrenOf(element.id, 'SAMPANA') : []
      return [element.id, { taranaka: taranaka.length, sampana: sampana.length }]
    }))
  }, [elements, grouped])
  const branches = useMemo(() => {
    const query = normalize(search)
    return grouped[activeType].filter((branch) => {
      if (activeType === 'TARANAKA' && selectedRazambe && branch.parent?.id !== selectedRazambe) return false
      if (activeType === 'SAMPANA') {
        const parent = branch.parent ? byId.get(branch.parent.id) : null
        if (selectedTaranaka && branch.parent?.id !== selectedTaranaka) return false
        if (!selectedTaranaka && selectedRazambe && parent?.parent?.id !== selectedRazambe) return false
      }
      return !query || normalize(branch.nom).includes(query)
    }).sort((first, second) => first.nom.localeCompare(second.nom))
  }, [activeType, byId, grouped, search, selectedRazambe, selectedTaranaka])
  const pageCount = Math.max(1, Math.ceil(branches.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageBranches = useMemo(() => branches.slice((safePage - 1) * pageSize, safePage * pageSize), [branches, safePage])
  const paginationPages = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1).filter((value) => value === 1 || value === pageCount || Math.abs(value - safePage) <= 1), [pageCount, safePage])

  useEffect(() => { if (page !== safePage) setPage(safePage) }, [page, safePage])
  useEffect(() => { if (selectedTaranaka && !taranakaOptions.some((item) => item.id === selectedTaranaka)) setSelectedTaranaka('') }, [selectedTaranaka, taranakaOptions])

  const emptyLabel = activeType === 'RAZAMBE' ? t('admin.noRazambe') : activeType === 'TARANAKA' ? t('admin.noTaranaka') : t('admin.noSampana')
  const description = activeType === 'RAZAMBE' ? t('admin.razambeDescription') : activeType === 'TARANAKA' ? t('admin.taranakaDescription') : t('admin.sampanaDescription')
  const hasActiveFilters = Boolean(search || selectedRazambe || selectedTaranaka)
  const rangeStart = branches.length ? (safePage - 1) * pageSize + 1 : 0
  const rangeEnd = Math.min(safePage * pageSize, branches.length)
  const canCreate = user?.compte.role === 'ADMIN' || user?.compte.role === 'MEMBRE'
  const selectTab = (type: BranchType) => { setActiveType(type); setPage(1) }
  const selectRazambe = (value: string) => { setSelectedRazambe(value); setSelectedTaranaka(''); setPage(1) }
  const selectTaranaka = (value: string) => { setSelectedTaranaka(value); setPage(1) }
  const closeCreateModal = () => { setIsCreateOpen(false); window.setTimeout(() => triggerRef.current?.focus(), 0) }
  const onCreated = async (element: ElementReference) => {
    await loadElements()
    setCreateSuccess(t('admin.branchCreated'))
    closeCreateModal()
    window.setTimeout(() => navigate(`/branches/${element.id}`), 280)
  }

  if (loading) return <p className="auth-loading">{t('admin.loadingPeople')}</p>
  if (error) return <section className="branches-directory-page"><p className="form-error" role="alert">{error === 'branch-load-error' ? t('admin.branchLoadError') : error}</p></section>

  return <section className="branches-directory-page">
    <header className="branches-directory-hero">
      <div className="branches-directory-hero-heading"><div><span className="branches-directory-eyebrow"><GitBranch size={19} aria-hidden="true" />{t('admin.branchesTitle')}</span><h1>{t('admin.branchesTitle')}</h1><p>{t('admin.branchesSubtitle')}</p></div>{canCreate && <button ref={triggerRef} type="button" className="branches-directory-add" onClick={() => { setCreateSuccess(null); setIsCreateOpen(true) }}><Plus size={17} aria-hidden="true" />{t('admin.addBranch')}</button>}</div>
      <div className="branches-directory-highlights">
        <div><BookOpen aria-hidden="true" /><p><strong>{t('admin.discover')}</strong><span>{t('admin.branchOrganization')}</span></p></div>
        <div><UsersRound aria-hidden="true" /><p><strong>{t('admin.navigateBranches')}</strong><span>{t('admin.familyHierarchy')}</span></p></div>
        <div><Search aria-hidden="true" /><p><strong>{t('admin.searchAction')}</strong><span>{t('admin.searchBranchQuickly')}</span></p></div>
      </div>
    </header>
    {createSuccess && <p className="branches-directory-feedback" role="status">{createSuccess}</p>}
    <label className="branches-directory-search"><Search size={20} aria-hidden="true" /><span className="sr-only">{t('admin.searchBranches')}</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={t('admin.searchBranches')} />{search && <button type="button" onClick={() => { setSearch(''); setPage(1) }} aria-label={t('admin.clearBranchSearch')}><X size={19} aria-hidden="true" /></button>}</label>
    <div className="branches-directory-controls"><div className="branches-directory-tabs" role="tablist" aria-label={t('admin.familyBranch')}>{branchTypes.map((type) => <button key={type} type="button" role="tab" aria-selected={activeType === type} className={activeType === type ? 'active' : ''} onClick={() => selectTab(type)}>{t(translationKeyFor(type))}<b>{counts[type]}</b></button>)}</div></div>
    {(activeType === 'TARANAKA' || activeType === 'SAMPANA') && <div className="branches-directory-filters"><label><span>{t('admin.filterRazambe')}</span><select value={selectedRazambe} onChange={(event) => selectRazambe(event.target.value)}><option value="">{t('admin.allRazambe')}</option>{sortedRazambe.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</select></label>{activeType === 'SAMPANA' && <label><span>{t('admin.filterTaranaka')}</span><select value={selectedTaranaka} onChange={(event) => selectTaranaka(event.target.value)}><option value="">{t('admin.allTaranaka')}</option>{taranakaOptions.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</select></label>}</div>}
    <header className="branches-directory-section-heading"><div><GitBranch aria-hidden="true" /><p><strong>{t(translationKeyFor(activeType))}</strong><span>{description}</span></p></div><span>{branches.length} {hasActiveFilters ? t('admin.branchResults') : t(translationKeyFor(activeType))}</span></header>
    {branches.length ? <><div className="branches-directory-table-wrap"><table className="branches-directory-table"><thead><tr>{activeType === 'RAZAMBE' ? <><th>{t('admin.razambe')}</th><th>{t('admin.taranaka')}</th><th>{t('admin.sampana')}</th></> : activeType === 'TARANAKA' ? <><th>{t('admin.taranaka')}</th><th>{t('admin.razambe')}</th><th>{t('admin.sampana')}</th></> : <><th>{t('admin.sampana')}</th><th>{t('admin.taranaka')}</th><th>{t('admin.razambe')}</th></>}<th>{t('admin.branchAction')}</th></tr></thead><tbody>{pageBranches.map((branch) => { const parent = branch.parent ? byId.get(branch.parent.id) : null; const ancestor = parent?.parent ? byId.get(parent.parent.id) : null; const statistics = hierarchy.get(branch.id); return <tr key={branch.id}><td><strong>{branch.nom}</strong></td>{activeType === 'RAZAMBE' ? <><td>{statistics?.taranaka ?? 0}</td><td>{statistics?.sampana ?? 0}</td></> : activeType === 'TARANAKA' ? <><td>{parent?.nom ?? '—'}</td><td>{statistics?.sampana ?? 0}</td></> : <><td>{parent?.nom ?? '—'}</td><td>{ancestor?.nom ?? '—'}</td></>}<td><Link to={`/branches/${branch.id}`}>{t('admin.viewBranch')}<ArrowRight size={15} aria-hidden="true" /></Link></td></tr> })}</tbody></table></div><div className="branches-directory-mobile-list">{pageBranches.map((branch) => { const parent = branch.parent ? byId.get(branch.parent.id) : null; const ancestor = parent?.parent ? byId.get(parent.parent.id) : null; const statistics = hierarchy.get(branch.id); return <article key={branch.id}><span>{t(translationKeyFor(activeType))}</span><strong>{branch.nom}</strong>{activeType === 'RAZAMBE' ? <p>{statistics?.taranaka ?? 0} {t('admin.taranaka')} · {statistics?.sampana ?? 0} {t('admin.sampana')}</p> : activeType === 'TARANAKA' ? <><p><small>{t('admin.razambe')}</small>{parent?.nom ?? '—'}</p><p>{statistics?.sampana ?? 0} {t('admin.sampana')}</p></> : <><p><small>{t('admin.taranaka')}</small>{parent?.nom ?? '—'}</p><p><small>{t('admin.razambe')}</small>{ancestor?.nom ?? '—'}</p></>}<Link to={`/branches/${branch.id}`}>{t('admin.viewBranch')}<ArrowRight size={15} aria-hidden="true" /></Link></article> })}</div>{pageCount > 1 && <nav className="branches-directory-pagination" aria-label={t('admin.branchPagination')}><p>{t('admin.branchDisplaying')} {rangeStart}–{rangeEnd} {t('admin.branchOf')} {branches.length}</p><div><button type="button" onClick={() => setPage((current) => current - 1)} disabled={safePage === 1} aria-label={t('admin.branchPrevious')}><ArrowLeft size={16} aria-hidden="true" /><span>{t('admin.branchPrevious')}</span></button><div className="branches-directory-pages">{paginationPages.map((value, index) => <>{index > 0 && value - paginationPages[index - 1] > 1 && <span key={`ellipsis-${value}`}>…</span>}<button key={value} type="button" className={value === safePage ? 'active' : ''} onClick={() => setPage(value)}>{value}</button></>)}</div><button type="button" onClick={() => setPage((current) => current + 1)} disabled={safePage === pageCount} aria-label={t('admin.branchNext')}><span>{t('admin.branchNext')}</span><ArrowRight size={16} aria-hidden="true" /></button></div><span className="branches-directory-mobile-page">{t('admin.branchPage')} {safePage} {t('admin.branchOf')} {pageCount}</span></nav>}</> : <p className="branches-directory-empty">{hasActiveFilters ? t('admin.noBranches') : emptyLabel}</p>}
    <BranchCreateModal open={isCreateOpen} elements={elements} typesElement={typesElement} initialType={activeType} onClose={closeCreateModal} onCreated={onCreated} />
  </section>
}