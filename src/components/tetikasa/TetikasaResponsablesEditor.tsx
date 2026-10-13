import { useEffect, useMemo, useState } from 'react'
import { Search, Trash2, UserPlus, Users } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { rechercherPersonnesInscription } from '../../api/demandesInscription'
import { getTetikasa, updateTetikasaResponsables } from '../../api/tetikasa'
import type { PersonneRecherchee } from '../../types/demandeInscription'
import type { TetikasaDetail, TetikasaResponsablePayload } from '../../types/tetikasa'

type Props = {
  id: string
  item: TetikasaDetail
  enabled: boolean
  onUpdated: (item: TetikasaDetail) => void
}

type ResponsableRow = TetikasaResponsablePayload & {
  nom: string
  prenom: string | null
  nom_usage: string | null
}

const MINIMUM_SEARCH_LENGTH = 2

function personName(person: Pick<ResponsableRow, 'nom' | 'prenom' | 'nom_usage'>) {
  return [person.nom, person.prenom || person.nom_usage].filter(Boolean).join(' ') || 'Personne sans nom'
}

function toPayload(rows: ResponsableRow[]): TetikasaResponsablePayload[] {
  return rows.map(({ id, id_personne, type_responsabilite }) => ({ ...(id ? { id } : {}), id_personne, type_responsabilite }))
}

export function TetikasaResponsablesEditor({ id, item, enabled, onUpdated }: Props) {
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
    const nextRows = item.responsables.map((row) => ({
      id: row.id,
      id_personne: row.personne.id,
      type_responsabilite: row.type_responsabilite,
      nom: row.personne.nom,
      prenom: row.personne.prenom,
      nom_usage: row.personne.nom_usage,
    }))
    setRows(nextRows)
    setInitialRows(toPayload(nextRows))
    setQuery('')
    setResults([])
    setError('')
  }, [responsablesSignature])

  useEffect(() => {
    const trimmedQuery = query.trim()
    setSearchMessage('')

    if (trimmedQuery.length === 0) {
      setResults([])
      setSearching(false)
      return
    }
    if (trimmedQuery.length < MINIMUM_SEARCH_LENGTH) {
      setResults([])
      setSearching(false)
      setSearchMessage(`Saisissez au moins ${MINIMUM_SEARCH_LENGTH} caractères pour rechercher une personne.`)
      return
    }

    let active = true
    const timer = window.setTimeout(() => {
      setSearching(true)
      void rechercherPersonnesInscription(trimmedQuery)
        .then((response) => {
          if (!active) return
          setResults(response.data ?? [])
          if (!(response.data ?? []).length) setSearchMessage('Aucune personne trouvée.')
        })
        .catch((reason: unknown) => {
          if (!active) return
          setResults([])
          setSearchMessage(reason instanceof ApiError ? reason.message : 'La recherche de personnes est impossible pour le moment.')
        })
        .finally(() => { if (active) setSearching(false) })
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  const payload = useMemo(() => toPayload(rows), [rows])
  const dirty = JSON.stringify(payload) !== JSON.stringify(initialRows)
  const actionAssignments = useMemo(() => {
    const assignments = new Map<string, string[]>()
    item.actions.forEach((action) => {
      if (!action.id_responsable) return
      const titles = assignments.get(action.id_responsable) ?? []
      titles.push(action.titre.trim() || `Action ${action.ordre}`)
      assignments.set(action.id_responsable, titles)
    })
    return assignments
  }, [item.actions])

  const addAssociate = (person: PersonneRecherchee) => {
    if (rows.some((row) => row.id_personne === person.id)) {
      setError(`${[person.nom, person.prenom].filter(Boolean).join(' ')} est déjà responsable du projet.`)
      return
    }
    setRows((current) => [...current, {
      id_personne: person.id,
      type_responsabilite: 'ASSOCIE',
      nom: person.nom,
      prenom: person.prenom,
      nom_usage: person.nom_usage,
    }])
    setQuery('')
    setResults([])
    setError('')
    setSuccess('')
  }

  const setPrincipal = (idPersonne: string) => {
    setRows((current) => current.map((row) => ({
      ...row,
      type_responsabilite: row.id_personne === idPersonne ? 'PRINCIPAL' : 'ASSOCIE',
    })))
    setError('')
    setSuccess('')
  }

  const removeResponsable = (row: ResponsableRow) => {
    const assignedActions = actionAssignments.get(row.id_personne)
    if (assignedActions?.length) {
      const actionDetails = assignedActions.map((title) => `« ${title} »`).join(', ')
      setError(`Impossible de retirer ce responsable : il est encore affecté à une ou plusieurs actions. Modifiez d'abord les actions concernées.${actionDetails ? ` Actions concernées : ${actionDetails}.` : ''}`)
      return
    }
    if (!window.confirm(`Retirer ${personName(row)} des responsables du projet ?`)) return
    setRows((current) => current.filter((currentRow) => currentRow.id_personne !== row.id_personne))
    setError('')
    setSuccess('')
  }

  const save = async () => {
    if (!dirty || saving) return

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateTetikasaResponsables(id, item.revision, payload)
      const response = await getTetikasa(id)
      if (!response.data) throw new Error('Drafitra introuvable après enregistrement.')
      onUpdated(response.data)
      setSuccess('Responsables enregistrés avec succès.')
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : 'Impossible d’enregistrer les responsables. Vos modifications locales sont conservées.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="tetikasa-form-section tetikasa-responsables-editor">
    <h2><Users size={20} />Responsables du projet</h2>
    <p className="tetikasa-editor-note">Un responsable principal est facultatif ; un seul peut être défini.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="tetikasa-confirmation" role="status">{success}</p>}

    {enabled && <label className="tetikasa-person-search">
      Rechercher une personne
      <input
        type="search"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setError(''); setSuccess('') }}
        placeholder="Au moins 2 caractères"
        aria-describedby="tetikasa-person-search-help"
      />
      <Search size={18} aria-hidden="true" />
      <small id="tetikasa-person-search-help">La personne ajoutée devient responsable associé par défaut.</small>
    </label>}

    {enabled && (searching || searchMessage || results.length > 0) && <div className="tetikasa-person-results" aria-live="polite">
      {searching && <p>Recherche en cours…</p>}
      {!searching && searchMessage && <p>{searchMessage}</p>}
      {!searching && results.map((person) => <button type="button" key={person.id} onClick={() => addAssociate(person)}>
        <UserPlus size={16} aria-hidden="true" />
        <span>{[person.nom, person.prenom].filter(Boolean).join(' ') || 'Personne sans nom'}</span>
      </button>)}
    </div>}

    {rows.length > 0 ? <div className="tetikasa-responsable-list">
      {rows.map((row) => {
        const assignedActions = actionAssignments.get(row.id_personne) ?? []
        const assignedToAction = assignedActions.length > 0
        return <article key={row.id_personne}>
          <div>
            <strong>{personName(row)}</strong>
            <span>{row.type_responsabilite === 'PRINCIPAL' ? 'Responsable principal' : 'Responsable associé'}</span>
            {assignedToAction && <span>Attribué à : {assignedActions.map((title) => `« ${title} »`).join(', ')}.</span>}
          </div>
          {enabled && <div className="tetikasa-responsable-actions">
            <label>
              <input
                type="radio"
                name="tetikasa-principal"
                checked={row.type_responsabilite === 'PRINCIPAL'}
                onChange={() => setPrincipal(row.id_personne)}
              />
              Principal
            </label>
            <button
              type="button"
              onClick={() => removeResponsable(row)}
              disabled={saving}
              aria-label={assignedToAction ? `Pourquoi ${personName(row)} ne peut pas être retiré(e)` : `Retirer ${personName(row)}`}
              title={assignedToAction ? 'Cliquez pour afficher les actions concernées.' : 'Retirer ce responsable'}
            ><Trash2 size={16} aria-hidden="true" /></button>
          </div>}
        </article>
      })}
    </div> : <p className="tetikasa-empty">Aucun responsable défini pour le moment.</p>}

    {enabled && <footer className="tetikasa-actions-editor-footer">
      <button type="button" className="primary" disabled={!dirty || saving} onClick={() => void save()}>
        {saving ? 'Enregistrement…' : 'Enregistrer les responsables'}
      </button>
    </footer>}
  </section>
}
