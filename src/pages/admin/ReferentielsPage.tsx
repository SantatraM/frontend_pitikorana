import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, BarChart3, ChevronLeft, ChevronRight, Folder, FolderPlus, Heart, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { useLanguage } from '../../hooks/useLanguage'
import {
  createActivite,
  createCentreInteret,
  createCompetence,
  createDomaineActivite,
  deleteActivite,
  deleteCentreInteret,
  deleteCompetence,
  deleteDomaineActivite,
  getActivites,
  getCentresInteret,
  getCompetences,
  getDomainesActivite,
  getLangues,
  updateActivite,
  updateCentreInteret,
  updateCompetence,
  updateDomaineActivite,
} from '../../api/adminReferentiels'
import type { Activite, CentreInteret, Competence, DomaineActivite, Langue, TraductionReferentiel } from '../../types/adminReferentiels'

type ReferentielKind = 'domaines' | 'activites' | 'competences' | 'centres'
type ReferentielEntry = DomaineActivite | Activite | Competence | CentreInteret
const PAGE_SIZE = 20
const initialPageByKind: Record<ReferentielKind, number> = { domaines: 1, activites: 1, competences: 1, centres: 1 }
const initialSearchByKind: Record<ReferentielKind, string> = { domaines: '', activites: '', competences: '', centres: '' }

function isActivite(entry: ReferentielEntry): entry is Activite {
  return 'id_domaine_activite' in entry
}

export function ReferentielsPage() {
  const { t } = useLanguage()
  const titles: Record<ReferentielKind, string> = { domaines: t('admin.domains'), activites: t('admin.activities'), competences: t('admin.skills'), centres: t('admin.interests') }
  const [kind, setKind] = useState<ReferentielKind>('domaines')
  const [langues, setLangues] = useState<Langue[]>([])
  const [domaines, setDomaines] = useState<DomaineActivite[]>([])
  const [activites, setActivites] = useState<Activite[]>([])
  const [competences, setCompetences] = useState<Competence[]>([])
  const [centres, setCentres] = useState<CentreInteret[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState<ReferentielEntry | null>(null)
  const [frLabel, setFrLabel] = useState('')
  const [mgLabel, setMgLabel] = useState('')
  const [domaineId, setDomaineId] = useState('')
  const [pages, setPages] = useState<Record<ReferentielKind, number>>(initialPageByKind)
  const [searches, setSearches] = useState<Record<ReferentielKind, string>>(initialSearchByKind)

  const fr = useMemo(() => langues.find((langue) => langue.code.toLowerCase() === 'fr') ?? langues[0] ?? null, [langues])
  const mg = useMemo(() => langues.find((langue) => langue.code.toLowerCase() === 'mg') ?? null, [langues])
  const primaryLabel = fr?.code.toLowerCase() === 'fr' ? t('admin.frenchLabel') : `Libellé ${fr?.nom ?? t('admin.notProvided')}`
  const list = kind === 'domaines' ? domaines : kind === 'activites' ? activites : kind === 'competences' ? competences : centres
  const referenceMeta = {
    domaines: { Icon: Folder, FormIcon: FolderPlus, addTitle: t(editing ? 'admin.referenceEditDomain' : 'admin.referenceAddDomain'), subtitle: t('admin.referenceDomainHelp'), listHelp: t('admin.referenceDomainListHelp'), search: t('admin.referenceSearchDomain'), frPlaceholder: t('admin.referencePlaceholderDomainFr'), mgPlaceholder: t('admin.referencePlaceholderDomainMg'), action: t('admin.referenceAddDomain') },
    activites: { Icon: Activity, FormIcon: Activity, addTitle: t(editing ? 'admin.referenceEditActivity' : 'admin.referenceAddActivity'), subtitle: t('admin.referenceActivityHelp'), listHelp: t('admin.referenceActivityListHelp'), search: t('admin.referenceSearchActivity'), frPlaceholder: t('admin.referencePlaceholderActivityFr'), mgPlaceholder: t('admin.referencePlaceholderActivityMg'), action: t('admin.referenceAddActivity') },
    competences: { Icon: BarChart3, FormIcon: BarChart3, addTitle: t(editing ? 'admin.referenceEditSkill' : 'admin.referenceAddSkill'), subtitle: t('admin.referenceSkillHelp'), listHelp: t('admin.referenceSkillListHelp'), search: t('admin.referenceSearchSkill'), frPlaceholder: t('admin.referencePlaceholderSkillFr'), mgPlaceholder: t('admin.referencePlaceholderSkillMg'), action: t('admin.referenceAddSkill') },
    centres: { Icon: Heart, FormIcon: Heart, addTitle: t(editing ? 'admin.referenceEditInterest' : 'admin.referenceAddInterest'), subtitle: t('admin.referenceInterestHelp'), listHelp: t('admin.referenceInterestListHelp'), search: t('admin.referenceSearchInterest'), frPlaceholder: t('admin.referencePlaceholderInterestFr'), mgPlaceholder: t('admin.referencePlaceholderInterestMg'), action: t('admin.referenceAddInterest') },
  } as const
  const meta = referenceMeta[kind]

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [languesResponse, domainesResponse, activitesResponse, competencesResponse, centresResponse] = await Promise.all([
        getLangues(), getDomainesActivite(), getActivites(), getCompetences(), getCentresInteret(),
      ])
      setLangues(languesResponse.data ?? [])
      setDomaines(domainesResponse.data ?? [])
      setActivites(activitesResponse.data ?? [])
      setCompetences(competencesResponse.data ?? [])
      setCentres(centresResponse.data ?? [])
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('admin.referencesLoadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  function translation(entry: ReferentielEntry, code: string): string {
    return entry.traductions.find((item) => item.code_langue?.toLowerCase() === code)?.libelle
      ?? entry.traductions.find((item) => item.id_langue === langues.find((langue) => langue.code.toLowerCase() === code)?.id)?.libelle
      ?? '—'
  }

  const entryLabel = (entry: ReferentielEntry) => translation(entry, 'fr')
  const domaineLabel = (id: string | null) => id ? entryLabel(domaines.find((domaine) => domaine.id === id) ?? { id: '', traductions: [] }) : ''
  const filteredList = useMemo(() => {
    const query = searches[kind].trim().toLocaleLowerCase()
    return list.filter((entry) => {
      const labels = [entryLabel(entry), translation(entry, 'mg')]
      if (isActivite(entry)) labels.push(domaineLabel(entry.id_domaine_activite))
      return !query || labels.some((label) => label.toLocaleLowerCase().includes(query))
    }).slice().sort((first, second) => entryLabel(first).localeCompare(entryLabel(second)))
  }, [domaines, kind, list, searches])
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE))
  const currentPage = Math.min(pages[kind], totalPages)
  const visibleList = useMemo(() => filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [currentPage, filteredList])
  const rangeStart = filteredList.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredList.length)
  const paginationPages = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1).filter((value) => value === 1 || value === totalPages || Math.abs(value - currentPage) <= 1), [currentPage, totalPages])

  useEffect(() => {
    if (pages[kind] > totalPages) setPages((current) => ({ ...current, [kind]: totalPages }))
  }, [kind, pages, totalPages])

  function updateSearch(value: string) {
    setSearches((current) => ({ ...current, [kind]: value }))
    setPages((current) => ({ ...current, [kind]: 1 }))
  }

  function updatePage(value: number) {
    setPages((current) => ({ ...current, [kind]: Math.min(Math.max(1, value), totalPages) }))
  }

  function startCreate() {
    setEditing(null)
    setFrLabel('')
    setMgLabel('')
    setDomaineId('')
    setError(null)
  }

  function startEdit(entry: ReferentielEntry) {
    setEditing(entry)
    setFrLabel(fr ? translation(entry, fr.code.toLowerCase()) === '—' ? '' : translation(entry, fr.code.toLowerCase()) : '')
    setMgLabel(mg ? translation(entry, 'mg') === '—' ? '' : translation(entry, 'mg') : '')
    setDomaineId(isActivite(entry) ? entry.id_domaine_activite ?? '' : '')
    setError(null)
    setSuccess(null)
  }

  function preserveAndBuildTranslations(): TraductionReferentiel[] | null {
    if (!fr) {
      setError(t('admin.languageUnavailable'))
      return null
    }
    const first = frLabel.trim()
    const second = mgLabel.trim()
    if (!first) {
      setError(`${primaryLabel} ${t('registration.newForm.requiredName')}`)
      return null
    }
    if (first.length > 150 || second.length > 150) {
      setError(t('admin.labelTooLong'))
      return null
    }
    const editableLanguageIds = new Set([fr.id, mg?.id].filter((id): id is string => Boolean(id)))
    const preserved = editing?.traductions.filter((item) => !editableLanguageIds.has(item.id_langue)) ?? []
    const next: TraductionReferentiel[] = [...preserved, { id_langue: fr.id, libelle: first }]
    if (mg && mg.id !== fr.id && second) next.push({ id_langue: mg.id, libelle: second })
    return next
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const traductions = preserveAndBuildTranslations()
    if (!traductions) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (kind === 'domaines') {
        if (editing) await updateDomaineActivite(editing.id, { traductions })
        else await createDomaineActivite({ traductions })
      } else if (kind === 'activites') {
        const payload = { id_domaine_activite: domaineId || null, traductions }
        if (editing) await updateActivite(editing.id, payload)
        else await createActivite(payload)
      } else if (kind === 'competences') {
        if (editing) await updateCompetence(editing.id, { traductions })
        else await createCompetence({ traductions })
      } else {
        if (editing) await updateCentreInteret(editing.id, { traductions })
        else await createCentreInteret({ traductions })
      }
      setSuccess(t('admin.referencesSaved'))
      startCreate()
      await load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('admin.referencesSaveError'))
    } finally {
      setSaving(false)
    }
  }

  function deleteMessage(): string {
    if (kind === 'competences') return t('admin.confirmDeleteCompetence')
    if (kind === 'centres') return t('admin.confirmDeleteInterest')
    return kind === 'domaines' ? t('admin.confirmDeleteDomain') : t('admin.confirmDeleteActivity')
  }

  async function remove(entry: ReferentielEntry) {
    if (deletingId || !window.confirm(deleteMessage())) return
    setDeletingId(entry.id)
    setError(null)
    setSuccess(null)
    try {
      if (kind === 'domaines') await deleteDomaineActivite(entry.id)
      else if (kind === 'activites') await deleteActivite(entry.id)
      else if (kind === 'competences') await deleteCompetence(entry.id)
      else await deleteCentreInteret(entry.id)
      setSuccess(t('admin.referencesDeleted'))
      if (editing?.id === entry.id) startCreate()
      await load()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 500 && kind === 'domaines') setError(t('admin.domainDeleteBlocked'))
      else if (caught instanceof ApiError && caught.status === 500 && kind === 'activites') setError(t('admin.activityDeleteBlocked'))
      else if (caught instanceof ApiError && caught.status === 409) setError(t('admin.duplicateTranslation'))
      else setError(caught instanceof ApiError ? caught.message : t('admin.referencesDeleteError'))
    } finally {
      setDeletingId(null)
    }
  }

  return <section className="referentiels-page referentiels-v2">
    <Link className="admin-back-link" to="/admin">← {t('admin.dashboard')}</Link>
    <header className="admin-page-heading"><div><h2>{t('admin.references')}</h2><span>{t('admin.referencesDescription')}</span></div></header>
    <div className="admin-filter-row referentiel-tabs" role="tablist" aria-label={t('admin.references')}>
      {(Object.keys(titles) as ReferentielKind[]).map((item) => { const Icon = referenceMeta[item].Icon; return <button key={item} type="button" role="tab" aria-selected={kind === item} className={kind === item ? 'selected' : ''} onClick={() => { setKind(item); setSuccess(null); startCreate() }}><Icon size={18} aria-hidden="true" /><span>{titles[item]}</span></button> })}
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {success ? <p className="success-message" role="status">{success}</p> : null}
    {loading ? <p className="admin-state">{t('admin.loadingReferences')}</p> : <>
      <form className="referentiel-form referentiel-form-v2" onSubmit={save}>
        <div className="referentiel-form-intro"><i><meta.FormIcon size={20} aria-hidden="true" /></i><div><h2>{meta.addTitle}</h2><p>{meta.subtitle}</p></div></div>
        <div className={`form-grid referentiel-form-fields ${kind === 'activites' ? 'with-domain' : ''}`}>
          <label>{primaryLabel} *<input value={frLabel} onChange={(event) => setFrLabel(event.target.value)} placeholder={meta.frPlaceholder} maxLength={150} required={Boolean(fr)} /></label>
          {mg && mg.id !== fr?.id ? <label>{t('admin.malagasyLabel')}<input value={mgLabel} onChange={(event) => setMgLabel(event.target.value)} placeholder={meta.mgPlaceholder} maxLength={150} /></label> : null}
          {kind === 'activites' ? <label>{t('admin.domain')} *<select value={domaineId} onChange={(event) => setDomaineId(event.target.value)}><option value="">{t('admin.noDomain')}</option>{domaines.map((domaine) => <option key={domaine.id} value={domaine.id}>{translation(domaine, 'fr')}</option>)}</select></label> : null}
          <div className="referentiel-actions"><button type="submit" disabled={saving || !fr}>{saving ? t('admin.saving') : <><Plus size={16} aria-hidden="true" />{editing ? t('admin.save') : meta.action}</>}</button>{editing ? <button type="button" className="secondary-button" onClick={startCreate} disabled={saving}>{t('admin.cancel')}</button> : null}</div>
        </div>
        {!fr ? <p className="form-error">{t('admin.languageUnavailable')}</p> : null}
      </form>
      <section className="referentiel-list" aria-live="polite">
        <div className="referentiel-list-heading"><div><i><meta.Icon size={20} aria-hidden="true" /></i><div><h2>{titles[kind]}</h2><p>{meta.listHelp}</p></div></div><span>{searches[kind].trim() ? t('admin.referenceFilteredCount').replace('{count}', String(filteredList.length)).replace('{total}', String(list.length)) : t('admin.referenceCount').replace('{count}', String(list.length))}</span></div>
        <label className="admin-search referentiel-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{meta.search}</span><input value={searches[kind]} onChange={(event) => updateSearch(event.target.value)} placeholder={meta.search} />{searches[kind] ? <button type="button" onClick={() => updateSearch('')} aria-label={t('admin.referenceClearSearch')}><X size={16} aria-hidden="true" /></button> : null}</label>
        {!list.length ? <div className="referentiel-empty"><meta.Icon size={25} aria-hidden="true" /><p>{t('admin.noEntries')}</p></div> : !filteredList.length ? <div className="referentiel-empty"><Search size={25} aria-hidden="true" /><p>{t('admin.noReferenceResults')}</p></div> : <><div className="referentiel-table-wrap"><table><thead><tr><th>#</th><th>{t('admin.frenchLabel')}</th><th>{t('admin.malagasyLabel')}</th>{kind === 'activites' ? <th>{t('admin.domain')}</th> : null}<th>{t('admin.actions')}</th></tr></thead><tbody>{visibleList.map((entry, index) => <tr key={entry.id}><td className="referentiel-row-number">{rangeStart + index}</td><td>{translation(entry, 'fr')}</td><td>{translation(entry, 'mg')}</td>{kind === 'activites' ? <td>{isActivite(entry) && entry.id_domaine_activite ? domaineLabel(entry.id_domaine_activite) : t('admin.noDomain')}</td> : null}<td className="table-actions"><button type="button" onClick={() => startEdit(entry)} disabled={Boolean(deletingId)}><Pencil size={14} aria-hidden="true" />{t('admin.edit')}</button><button type="button" className="danger-button" onClick={() => void remove(entry)} disabled={Boolean(deletingId)}><Trash2 size={14} aria-hidden="true" />{deletingId === entry.id ? t('admin.saving') : t('admin.delete')}</button></td></tr>)}</tbody></table></div><div className="referentiel-mobile-list">{visibleList.map((entry, index) => <article key={entry.id}><span>{rangeStart + index}</span><strong>{translation(entry, 'fr')}</strong><p>{translation(entry, 'mg')}</p>{kind === 'activites' ? <small>{t('admin.domain')} : {isActivite(entry) && entry.id_domaine_activite ? domaineLabel(entry.id_domaine_activite) : t('admin.noDomain')}</small> : null}<div className="table-actions"><button type="button" onClick={() => startEdit(entry)} disabled={Boolean(deletingId)}><Pencil size={14} aria-hidden="true" />{t('admin.edit')}</button><button type="button" className="danger-button" onClick={() => void remove(entry)} disabled={Boolean(deletingId)}><Trash2 size={14} aria-hidden="true" />{deletingId === entry.id ? t('admin.saving') : t('admin.delete')}</button></div></article>)}</div>{totalPages > 1 ? <nav className="admin-pagination referentiel-pagination" aria-label={t('admin.referencePagination')}><span>{t('admin.referenceDisplaying').replace('{start}', String(rangeStart)).replace('{end}', String(rangeEnd)).replace('{total}', String(filteredList.length))}</span><div><button type="button" onClick={() => updatePage(currentPage - 1)} disabled={currentPage === 1} aria-label={t('admin.previous')}><ChevronLeft size={16} aria-hidden="true" /><span>{t('admin.previous')}</span></button><div className="referentiel-pagination-pages">{paginationPages.map((value, index) => <>{index > 0 && value - paginationPages[index - 1] > 1 ? <span key={`ellipsis-${value}`}>…</span> : null}<button key={value} type="button" className={value === currentPage ? 'active' : ''} onClick={() => updatePage(value)} aria-label={`${t('admin.page')} ${value}`}>{value}</button></>)}</div><button type="button" onClick={() => updatePage(currentPage + 1)} disabled={currentPage === totalPages} aria-label={t('admin.next')}><span>{t('admin.next')}</span><ChevronRight size={16} aria-hidden="true" /></button></div><span className="referentiel-pagination-mobile-page">{t('admin.page')} {currentPage} / {totalPages}</span></nav> : null}</>}
      </section>
    </>}
  </section>
}



