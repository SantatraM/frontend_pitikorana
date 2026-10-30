import { useEffect, useMemo, useState } from 'react'
import { Search, Trash2, UserPlus, Users } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { useLanguage } from '../../hooks/useLanguage'
import { rechercherPersonnesInscription } from '../../api/demandesInscription'
import { getTetikasa, updateTetikasaResponsables } from '../../api/tetikasa'
import type { PersonneRecherchee } from '../../types/demandeInscription'
import type { TetikasaDetail, TetikasaResponsablePayload } from '../../types/tetikasa'

type Props = { id: string; item: TetikasaDetail; enabled: boolean; onUpdated: (item: TetikasaDetail) => void }
type ResponsableRow = TetikasaResponsablePayload & { nom: string; prenom: string | null; nom_usage: string | null }
const MINIMUM_SEARCH_LENGTH = 2

function toPayload(rows: ResponsableRow[]): TetikasaResponsablePayload[] {
  return rows.map(({ id, id_personne, type_responsabilite }) => ({ ...(id ? { id } : {}), id_personne, type_responsabilite }))
}

export function TetikasaResponsablesEditor({ id, item, enabled, onUpdated }: Props) {
  const { t } = useLanguage()
  const personName = (person: Pick<ResponsableRow, 'nom' | 'prenom' | 'nom_usage'>) => [person.nom, person.prenom || person.nom_usage].filter(Boolean).join(' ') || t('tetikasa.noPerson')
  const [rows, setRows] = useState<ResponsableRow[]>([])
  const [initialRows, setInitialRows] = useState<TetikasaResponsablePayload[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PersonneRecherchee[]>([])
  const [searching, setSearching] = useState(false)
  const [searchMessage, setSearchMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const responsablesSignature = JSON.stringify(item.responsables)
  useEffect(() => {
    const nextRows = item.responsables.map((row) => ({ id: row.id, id_personne: row.personne.id, type_responsabilite: row.type_responsabilite, nom: row.personne.nom, prenom: row.personne.prenom, nom_usage: row.personne.nom_usage }))
    setRows(nextRows); setInitialRows(toPayload(nextRows)); setQuery(''); setResults([]); setError('')
  }, [responsablesSignature])

  useEffect(() => {
    const trimmedQuery = query.trim(); setSearchMessage('')
    if (!trimmedQuery) { setResults([]); setSearching(false); return }
    if (trimmedQuery.length < MINIMUM_SEARCH_LENGTH) { setResults([]); setSearching(false); setSearchMessage(t('tetikasa.searchMinimum') + ' ' + MINIMUM_SEARCH_LENGTH + ' ' + t('tetikasa.searchMinimumSuffix'));  return }
    let active = true
    const timer = window.setTimeout(() => {
      setSearching(true)
      void rechercherPersonnesInscription(trimmedQuery).then((response) => {
        if (!active) return
        setResults(response.data ?? [])
        if (!(response.data ?? []).length) setSearchMessage(t('tetikasa.noResults'))
      }).catch((reason: unknown) => {
        if (!active) return
        console.error(reason); setResults([]); setSearchMessage(t('tetikasa.searchUnavailable'))
      }).finally(() => { if (active) setSearching(false) })
    }, 300)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, t])

  const payload = useMemo(() => toPayload(rows), [rows])
  const dirty = JSON.stringify(payload) !== JSON.stringify(initialRows)
  const actionAssignments = useMemo(() => {
    const assignments = new Map<string, string[]>()
    item.actions.forEach((action) => {
      if (!action.id_responsable) return
      const titles = assignments.get(action.id_responsable) ?? []
      titles.push(action.titre.trim() || t('tetikasa.actionFallback') + ' ' + action.ordre)
      assignments.set(action.id_responsable, titles)
    })
    return assignments
  }, [item.actions, t])

  const addAssociate = (person: PersonneRecherchee) => {
    if (rows.some((row) => row.id_personne === person.id)) { setError(t('tetikasa.personAlready')); return }
    setRows((current) => [...current, { id_personne: person.id, type_responsabilite: 'ASSOCIE', nom: person.nom, prenom: person.prenom, nom_usage: person.nom_usage }])
    setQuery(''); setResults([]); setError(''); setSuccess('')
  }
  const setPrincipal = (idPersonne: string) => { setRows((current) => current.map((row) => ({ ...row, type_responsabilite: row.id_personne === idPersonne ? 'PRINCIPAL' : 'ASSOCIE' }))); setError(''); setSuccess('') }
  const removeResponsable = (row: ResponsableRow) => {
    const assignedActions = actionAssignments.get(row.id_personne)
    if (assignedActions?.length) { setError(t('tetikasa.removeBlocked') + ' ' + t('tetikasa.removeBlockedDetails') + ' : ' + assignedActions.join(', ') + '.'); return }
    if (!window.confirm(t('tetikasa.removeResponsableConfirm') + ' — ' + personName(row))) return
    setRows((current) => current.filter((currentRow) => currentRow.id_personne !== row.id_personne)); setError(''); setSuccess('')
  }
  const save = async () => {
    if (!dirty || saving) return
    setSaving(true); setError(''); setSuccess('')
    try {
      await updateTetikasaResponsables(id, item.revision, payload)
      const response = await getTetikasa(id)
      if (!response.data) throw new Error(t('tetikasa.reloadMissing'))
      onUpdated(response.data); setSuccess(t('tetikasa.responsablesSaved'))
    } catch (reason: unknown) {
      console.error(reason)
      setError(reason instanceof ApiError && reason.status === 409 ? t('tetikasa.conflict') : t('tetikasa.apiError'))
    } finally { setSaving(false) }
  }

  return <section className="tetikasa-form-section tetikasa-responsables-editor">
    <h2><Users size={20} />{t('tetikasa.responsablesProject')}</h2>
    <p className="tetikasa-editor-note">{t('tetikasa.principalOptional')}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="tetikasa-confirmation" role="status">{success}</p>}
    {enabled && <label className="tetikasa-person-search">{t('tetikasa.searchPerson')}<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setError(''); setSuccess('') }} placeholder={t('tetikasa.searchPlaceholder')} aria-describedby="tetikasa-person-search-help" /><Search size={18} aria-hidden="true" /><small id="tetikasa-person-search-help">{t('tetikasa.associateDefault')}</small></label>}
    {enabled && (searching || searchMessage || results.length > 0) && <div className="tetikasa-person-results" aria-live="polite">{searching && <p>{t('tetikasa.searching')}</p>}{!searching && searchMessage && <p>{searchMessage}</p>}{!searching && results.map((person) => <button type="button" key={person.id} onClick={() => addAssociate(person)}><UserPlus size={16} aria-hidden="true" /><span>{[person.nom, person.prenom].filter(Boolean).join(' ') || t('tetikasa.noPerson')}</span></button>)}</div>}
    {rows.length > 0 ? <div className="tetikasa-responsable-list">{rows.map((row) => { const assignedActions = actionAssignments.get(row.id_personne) ?? []; const assignedToAction = assignedActions.length > 0; return <article key={row.id_personne}><div><strong>{personName(row)}</strong><span>{row.type_responsabilite === 'PRINCIPAL' ? t('tetikasa.principal') : t('tetikasa.associate')}</span>{assignedToAction && <span>{t('tetikasa.assignedTo')} : {assignedActions.join(', ')}.</span>}</div>{enabled && <div className="tetikasa-responsable-actions"><label><input type="radio" name="tetikasa-principal" checked={row.type_responsabilite === 'PRINCIPAL'} onChange={() => setPrincipal(row.id_personne)} />{t('tetikasa.principalShort')}</label><button type="button" onClick={() => removeResponsable(row)} disabled={saving} aria-label={assignedToAction ? t('tetikasa.removeBlockedAria') : t('tetikasa.removeAria')} title={assignedToAction ? t('tetikasa.removeReason') : t('tetikasa.removeAria')}><Trash2 size={16} aria-hidden="true" /></button></div>}</article> })}</div> : <p className="tetikasa-empty">{t('tetikasa.noResponsable')}</p>}
    {enabled && <footer className="tetikasa-actions-editor-footer"><button type="button" className="primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? t('tetikasa.saving') : t('tetikasa.saveResponsables')}</button></footer>}
  </section>
}
