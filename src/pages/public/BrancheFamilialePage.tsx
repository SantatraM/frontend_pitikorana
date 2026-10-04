import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, GitBranch, Network, Search, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { getPersonnesByElement, getPersonnesByElementDescendants } from '../../api/personnes'
import { getElements, type ElementReference } from '../../api/referentielsInscription'
import { useLanguage } from '../../hooks/useLanguage'
import type { Personne } from '../../types/personne'

type BranchType = 'RAZAMBE' | 'TARANAKA' | 'SAMPANA' | null
type PeopleScope = 'DIRECT' | 'BRANCHE'

function branchType(element: ElementReference): BranchType {
  const value = element.type_element?.code
  return value === 'RAZAMBE' || value === 'TARANAKA' || value === 'SAMPANA' ? value : null
}

export function BrancheFamilialePage() {
  const { id_element: idElement = '' } = useParams()
  const { t, language } = useLanguage()
  const [elements, setElements] = useState<ElementReference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [directPeople, setDirectPeople] = useState<Personne[]>([])
  const [branchPeople, setBranchPeople] = useState<Personne[]>([])
  const [peopleScope, setPeopleScope] = useState<PeopleScope>('DIRECT')
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleError, setPeopleError] = useState<string | null>(null)
  const [peopleSearch, setPeopleSearch] = useState('')
  const [peoplePage, setPeoplePage] = useState(1)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void getElements().then((response) => {
      if (active) setElements(response.data ?? [])
    }).catch((caught) => {
      if (active) setError(caught instanceof ApiError ? caught.message : t('admin.branchLoadError'))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [idElement, t])

  const element = useMemo(() => elements.find((item) => item.id === idElement) ?? null, [elements, idElement])
  const hierarchy = useMemo(() => {
    if (!element) return []
    const path: ElementReference[] = []
    const seen = new Set<string>()
    let current: ElementReference | undefined = element
    while (current && !seen.has(current.id)) {
      path.unshift(current)
      seen.add(current.id)
      current = current.parent ? elements.find((item) => item.id === current?.parent?.id) : undefined
    }
    return path
  }, [element, elements])
  const type = element ? branchType(element) : null
  const children = useMemo(() => {
    if (!element || !type || type === 'SAMPANA') return []
    const childType = type === 'RAZAMBE' ? 'TARANAKA' : 'SAMPANA'
    return elements.filter((item) => item.parent?.id === element.id && branchType(item) === childType).sort((first, second) => first.nom.localeCompare(second.nom))
  }, [element, elements, type])
  const sampanaByParent = useMemo(() => elements.reduce((counts, item) => {
    if (branchType(item) === 'SAMPANA' && item.parent?.id) counts.set(item.parent.id, (counts.get(item.parent.id) ?? 0) + 1)
    return counts
  }, new Map<string, number>()), [elements])
  useEffect(() => {
    if (!element || !type) {
      setDirectPeople([])
      setBranchPeople([])
      setPeopleLoading(false)
      setPeopleError(null)
      return
    }
    let active = true
    setDirectPeople([])
    setBranchPeople([])
    setPeopleLoading(true)
    setPeopleError(null)
    setPeopleSearch('')
    setPeoplePage(1)
    void Promise.all([
      getPersonnesByElement(element.id, language),
      getPersonnesByElementDescendants(element.id, language),
    ]).then(([directResponse, descendantsResponse]) => {
      if (!active) return
      setDirectPeople(directResponse.data ?? [])
      setBranchPeople([...new Map((descendantsResponse.data ?? []).map((person) => [person.id, person])).values()])
    }).catch((caught) => {
      if (active) setPeopleError(caught instanceof ApiError ? caught.message : t('admin.peopleLoadError'))
    }).finally(() => { if (active) setPeopleLoading(false) })
    return () => { active = false }
  }, [element, language, t, type])
  const people = peopleScope === 'DIRECT' ? directPeople : branchPeople
  const filteredPeople = useMemo(() => {
    const query = peopleSearch.trim().toLocaleLowerCase()
    return people.filter((person) => !query || [person.nom, person.prenom, person.nom_usage, person.autres_appellations].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)).sort((first, second) => first.nom.localeCompare(second.nom) || (first.prenom ?? '').localeCompare(second.prenom ?? ''))
  }, [people, peopleSearch])
  const peoplePageCount = Math.max(1, Math.ceil(filteredPeople.length / 20))
  const safePeoplePage = Math.min(peoplePage, peoplePageCount)
  const visiblePeople = useMemo(() => filteredPeople.slice((safePeoplePage - 1) * 20, safePeoplePage * 20), [filteredPeople, safePeoplePage])
  const peopleRangeStart = filteredPeople.length ? (safePeoplePage - 1) * 20 + 1 : 0
  const peopleRangeEnd = Math.min(safePeoplePage * 20, filteredPeople.length)
  useEffect(() => { if (peoplePage !== safePeoplePage) setPeoplePage(safePeoplePage) }, [peoplePage, safePeoplePage])

  if (loading) return <p className="auth-loading">{t('admin.loadingPeople')}</p>
  if (error) return <section className="family-branch-page"><p className="form-error" role="alert">{error}</p><Link className="family-branch-back" to="/branches"><ArrowLeft size={16} aria-hidden="true" />{t('admin.allBranches')}</Link></section>
  if (!element) return <section className="family-branch-page"><h1>{t('admin.branchNotFound')}</h1><Link className="family-branch-back" to="/branches"><ArrowLeft size={16} aria-hidden="true" />{t('admin.allBranches')}</Link></section>

  const typeLabel = type ? t(`admin.${type.toLowerCase()}` as 'admin.razambe' | 'admin.taranaka' | 'admin.sampana') : element.type_element?.libelle ?? '—'
  const heroDescription = type === 'RAZAMBE' ? t('admin.razambeBranchDescription') : type === 'TARANAKA' ? t('admin.taranakaBranchDescription') : t('admin.sampanaBranchDescription')
  const childrenTitle = type === 'RAZAMBE' ? t('admin.childrenTaranaka') : t('admin.childrenSampana')
  const childrenDescription = type === 'RAZAMBE' ? t('admin.exploreTaranaka') : t('admin.exploreSampana')
  const childTypeLabel = type === 'RAZAMBE' ? t('admin.taranaka') : t('admin.sampana')
  const noChildrenLabel = type === 'RAZAMBE' ? t('admin.noTaranaka') : t('admin.noSampana')
  const peopleTitle = peopleScope === 'DIRECT' ? t('admin.directMembers') : t('admin.allBranchMembers')
  const noPeopleLabel = type === 'RAZAMBE' ? t('admin.noDirectPeopleRazambe') : type === 'TARANAKA' ? t('admin.noDirectPeopleTaranaka') : t('admin.noDirectPeopleSampana')

  return <section className="family-branch-page">
    <Link className="family-branch-back" to="/branches"><ArrowLeft size={16} aria-hidden="true" />{t('admin.allBranches')}</Link>
    <header className="family-branch-hero">
      <span className="family-branch-type"><Network size={17} aria-hidden="true" />{typeLabel}</span>
      <h1>{element.nom}</h1>
      <p>{heroDescription}</p>
    </header>
    <section className="family-branch-card family-branch-path-card">
      <h2><GitBranch size={18} aria-hidden="true" />{t('admin.familyPath')}</h2>
      <nav className="family-branch-breadcrumb" aria-label={t('admin.familyPath')}>
        {hierarchy.map((item, index) => <div key={item.id} className="family-branch-breadcrumb-item">
          {index > 0 && <b aria-hidden="true">›</b>}
          <span><small>{branchType(item) ? t(`admin.${branchType(item)?.toLowerCase()}` as 'admin.razambe' | 'admin.taranaka' | 'admin.sampana') : ''}</small>{index < hierarchy.length - 1 ? <Link to={`/branches/${item.id}`}>{item.nom}</Link> : <strong>{item.nom}</strong>}</span>
        </div>)}
      </nav>
    </section>
    {type !== 'SAMPANA' && <section className="family-branch-card family-branch-children-card">
      <header><h2><Users size={18} aria-hidden="true" />{childrenTitle}</h2><p>{childrenDescription}</p></header>
      {children.length ? <div className="family-branch-children">{children.map((child) => <article key={child.id}><span>{childTypeLabel}</span><strong>{child.nom}</strong>{type === 'RAZAMBE' && <p><GitBranch size={16} aria-hidden="true" />{sampanaByParent.get(child.id) ?? 0} {t('admin.sampana')}</p>}<Link to={`/branches/${child.id}`}>{t('admin.viewBranch')}<ArrowRight size={16} aria-hidden="true" /></Link></article>)}</div> : <p className="family-branch-empty">{noChildrenLabel}</p>}
    </section>}
    <section className="family-branch-card family-branch-children-card">
      <header><h2><Users size={18} aria-hidden="true" />{peopleTitle}</h2>{!peopleLoading && !peopleError && <p>{people.length} {people.length === 1 ? t('admin.personSingular') : t('admin.personPlural')}</p>}</header>
      <div className="family-branch-member-tabs" role="tablist" aria-label={t('admin.branchMemberScope')}>
        <button type="button" role="tab" aria-selected={peopleScope === 'DIRECT'} className={peopleScope === 'DIRECT' ? 'active' : ''} onClick={() => { setPeopleScope('DIRECT'); setPeoplePage(1) }}>{t('admin.directMembers')} ({directPeople.length})</button>
        <button type="button" role="tab" aria-selected={peopleScope === 'BRANCHE'} className={peopleScope === 'BRANCHE' ? 'active' : ''} onClick={() => { setPeopleScope('BRANCHE'); setPeoplePage(1) }}>{t('admin.allBranchMembers')} ({branchPeople.length})</button>
      </div>
      <div className="family-branch-people">
        {peopleLoading ? <p className="family-branch-empty">{t('admin.loadingPeople')}</p> : peopleError ? <p className="form-error" role="alert">{peopleError}</p> : people.length === 0 ? <p className="family-branch-empty">{noPeopleLabel}</p> : <>
          <div className="family-branch-people-heading"><span>{filteredPeople.length} {filteredPeople.length === 1 ? t('admin.personSingular') : t('admin.personPlural')}</span><label><Search size={16} aria-hidden="true" /><span className="sr-only">{t('admin.branchSearchPeople')}</span><input value={peopleSearch} onChange={(event) => { setPeopleSearch(event.target.value); setPeoplePage(1) }} placeholder={t('admin.branchSearchPeople')} /></label></div>
          {filteredPeople.length ? <><div className="family-branch-people-table-wrap"><table className="family-branch-people-table"><thead><tr><th>{t('admin.branchLastName')}</th><th>{t('admin.branchFirstName')}</th><th>{t('admin.branchStatus')}</th>{peopleScope === 'BRANCHE' && <th>{t('admin.attachment')}</th>}<th>{t('admin.branchAction')}</th></tr></thead><tbody>{visiblePeople.map((person) => <tr key={person.id}><td><strong>{person.nom}</strong></td><td>{person.prenom ?? ''}</td><td>{person.statut?.libelle ?? ''}</td>{peopleScope === 'BRANCHE' && <td>{person.element?.nom ?? '—'}</td>}<td><Link to={`/personnes/${person.id}`}>{t('admin.viewRecord')}<ArrowRight size={15} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div><div className="family-branch-people-mobile">{visiblePeople.map((person) => <article key={person.id}><strong>{[person.nom, person.prenom].filter(Boolean).join(' ')}</strong>{person.statut?.libelle && <span>{person.statut.libelle}</span>}{peopleScope === 'BRANCHE' && <small>{person.element?.nom ?? '—'}</small>}<Link to={`/personnes/${person.id}`}>{t('admin.viewRecord')}<ArrowRight size={15} aria-hidden="true" /></Link></article>)}</div>{peoplePageCount > 1 && <nav className="family-branch-people-pagination" aria-label={t('admin.branchPagination')}><p>{t('admin.branchDisplaying')} {peopleRangeStart}–{peopleRangeEnd} {t('admin.branchOf')} {filteredPeople.length}</p><div><button type="button" disabled={safePeoplePage === 1} onClick={() => setPeoplePage((current) => current - 1)}><ArrowLeft size={16} aria-hidden="true" /><span>{t('admin.branchPrevious')}</span></button><span>{t('admin.branchPage')} {safePeoplePage} {t('admin.branchOf')} {peoplePageCount}</span><button type="button" disabled={safePeoplePage === peoplePageCount} onClick={() => setPeoplePage((current) => current + 1)}><span>{t('admin.branchNext')}</span><ArrowRight size={16} aria-hidden="true" /></button></div></nav>}</> : <p className="family-branch-empty">{t('admin.noPeopleFound')}</p>}
        </>}
      </div>
    </section>
  </section>
}
