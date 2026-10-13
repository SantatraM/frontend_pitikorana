import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { getTetikasa, updateTetikasaActions } from '../../api/tetikasa'
import type { TetikasaActionPayload, TetikasaDetail } from '../../types/tetikasa'

type Props = {
  id: string
  item: TetikasaDetail
  enabled: boolean
  onUpdated: (item: TetikasaDetail) => void
}

type ActionRow = TetikasaActionPayload & { key: string }
type FieldErrors = Partial<Record<'titre' | 'id_responsable' | 'date_fin_prevue', string>>

const MAX_TITLE_LENGTH = 200

function toPayload(rows: ActionRow[]): TetikasaActionPayload[] {
  return rows.map((row, index) => ({
    ...(row.id ? { id: row.id } : {}),
    titre: row.titre.trim(),
    description: row.description?.trim() || null,
    id_responsable: row.id_responsable || null,
    date_debut_prevue: row.date_debut_prevue || null,
    date_fin_prevue: row.date_fin_prevue || null,
    ordre: index + 1,
  }))
}

function dateSummary(start: string | null, end: string | null) {
  if (start && end) return `${start} — ${end}`
  if (start) return `À partir du ${start}`
  if (end) return `Jusqu’au ${end}`
  return 'Période non définie'
}

export function TetikasaActionsEditor({ id, item, enabled, onUpdated }: Props) {
  const [rows, setRows] = useState<ActionRow[]>([])
  const [initialRows, setInitialRows] = useState<TetikasaActionPayload[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, FieldErrors>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const actionsSignature = JSON.stringify(item.actions)
  useEffect(() => {
    const nextRows = [...item.actions]
      .sort((left, right) => left.ordre - right.ordre)
      .map((action) => ({ ...action, key: action.id }))
    setRows(nextRows)
    setInitialRows(toPayload(nextRows))
    setOpenKey(null)
    setErrors({})
    setError('')
  }, [actionsSignature])

  const payload = useMemo(() => toPayload(rows), [rows])
  const dirty = JSON.stringify(payload) !== JSON.stringify(initialRows)
  const responsablesById = useMemo(() => new Map(
    item.responsables.map((row) => [row.personne.id, row.personne]),
  ), [item.responsables])

  const updateRow = <Field extends keyof Omit<ActionRow, 'key' | 'ordre'>>(
    key: string,
    field: Field,
    value: ActionRow[Field],
  ) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row))
    setErrors((current) => ({ ...current, [key]: { ...current[key], [field]: undefined } }))
    setError('')
    setSuccess('')
  }

  const addAction = () => {
    const key = `new-${Date.now()}`
    setRows((current) => [...current, {
      key,
      titre: '',
      description: null,
      id_responsable: null,
      date_debut_prevue: null,
      date_fin_prevue: null,
      ordre: current.length + 1,
    }])
    setOpenKey(key)
    setError('')
    setSuccess('')
  }

  const removeAction = (row: ActionRow) => {
    if (!window.confirm(`Supprimer l’action « ${row.titre || 'sans titre'} » ?`)) return
    setRows((current) => current.filter((currentRow) => currentRow.key !== row.key))
    setErrors((current) => {
      const { [row.key]: _removed, ...remaining } = current
      return remaining
    })
    if (openKey === row.key) setOpenKey(null)
    setError('')
    setSuccess('')
  }

  const validate = (): Record<string, FieldErrors> => {
    const nextErrors: Record<string, FieldErrors> = {}
    payload.forEach((action, index) => {
      const actionErrors: FieldErrors = {}
      if (!action.titre) actionErrors.titre = 'Le titre de l’action est obligatoire.'
      else if (action.titre.length > MAX_TITLE_LENGTH) actionErrors.titre = `Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères.`
      if (action.id_responsable && !responsablesById.has(action.id_responsable)) {
        actionErrors.id_responsable = 'Le responsable sélectionné doit appartenir aux responsables actuels du projet.'
      }
      if (action.date_debut_prevue && action.date_fin_prevue && action.date_fin_prevue < action.date_debut_prevue) {
        actionErrors.date_fin_prevue = 'La date de fin doit être postérieure ou égale à la date de début.'
      }
      if (Object.keys(actionErrors).length) nextErrors[rows[index].key] = actionErrors
    })
    return nextErrors
  }

  const save = async () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    const firstInvalidKey = Object.keys(nextErrors)[0]
    if (firstInvalidKey) {
      setOpenKey(firstInvalidKey)
      setError('Corrigez les champs signalés avant d’enregistrer les actions.')
      return
    }
    if (!dirty || saving) return
    if (!window.confirm('L’enregistrement remplace toutes les actions et régénère leurs identifiants. Continuer ?')) return

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateTetikasaActions(id, item.revision, payload)
      const response = await getTetikasa(id)
      if (!response.data) throw new Error('Drafitra introuvable après enregistrement.')
      onUpdated(response.data)
      setSuccess('Actions enregistrées avec succès.')
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : 'Impossible d’enregistrer les actions. Vos modifications locales sont conservées.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="tetikasa-form-section tetikasa-actions-editor">
    <header className="tetikasa-actions-editor-head">
      <div>
        <h2><ClipboardList size={20} />Actions du projet <span>{rows.length}</span></h2>
        <p className="tetikasa-editor-note">Les actions sont enregistrées dans l’ordre affiché.</p>
      </div>
      {enabled && <button type="button" className="tetikasa-add-action" onClick={addAction} disabled={saving}>
        <Plus size={18} aria-hidden="true" />Ajouter une action
      </button>}
    </header>

    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="tetikasa-confirmation" role="status">{success}</p>}

    {rows.length > 0 ? <div className="tetikasa-action-editor-list">
      {rows.map((row, index) => {
        const expanded = openKey === row.key
        const changed = JSON.stringify(payload[index]) !== JSON.stringify(initialRows[index])
        const responsible = row.id_responsable ? responsablesById.get(row.id_responsable) : null
        const responsibleName = responsible ? [responsible.nom, responsible.prenom || responsible.nom_usage].filter(Boolean).join(' ') : 'Non attribué'
        const rowErrors = errors[row.key]

        return <article key={row.key} className={`tetikasa-action-editor-row${expanded ? ' is-open' : ''}${changed ? ' is-changed' : ''}`}>
          <button type="button" className="tetikasa-action-summary" onClick={() => setOpenKey(expanded ? null : row.key)} aria-expanded={expanded}>
            <span className="tetikasa-action-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="tetikasa-action-summary-text">
              <strong>{row.titre || 'Nouvelle action'}</strong>
              <small>{responsibleName} · {dateSummary(row.date_debut_prevue, row.date_fin_prevue)}</small>
            </span>
            {changed && <span className="tetikasa-action-change">Modifiée</span>}
            <ChevronDown className="tetikasa-action-chevron" size={18} aria-hidden="true" />
          </button>

          {enabled && <div className="tetikasa-action-summary-actions">
            <button type="button" onClick={() => setOpenKey(row.key)} disabled={saving}><Pencil size={16} aria-hidden="true" />Modifier</button>
            <button type="button" className="tetikasa-action-remove" onClick={() => removeAction(row)} disabled={saving}><Trash2 size={16} aria-hidden="true" />Supprimer</button>
          </div>}

          {expanded && <div className="tetikasa-action-editor-content">
            <label>
              Titre de l’action *
              <input
                value={row.titre}
                maxLength={MAX_TITLE_LENGTH}
                aria-invalid={Boolean(rowErrors?.titre)}
                aria-describedby={rowErrors?.titre ? `tetikasa-action-${row.key}-title-error` : undefined}
                disabled={!enabled || saving}
                onChange={(event) => updateRow(row.key, 'titre', event.target.value)}
              />
              {rowErrors?.titre && <small id={`tetikasa-action-${row.key}-title-error`} className="tetikasa-field-error">{rowErrors.titre}</small>}
            </label>

            <label>
              Description
              <textarea
                value={row.description ?? ''}
                maxLength={100000}
                disabled={!enabled || saving}
                onChange={(event) => updateRow(row.key, 'description', event.target.value || null)}
              />
            </label>

            <div className="tetikasa-action-fields">
              <label>
                Responsable
                <select
                  value={row.id_responsable ?? ''}
                  aria-invalid={Boolean(rowErrors?.id_responsable)}
                  aria-describedby={rowErrors?.id_responsable ? `tetikasa-action-${row.key}-responsible-error` : undefined}
                  disabled={!enabled || saving}
                  onChange={(event) => updateRow(row.key, 'id_responsable', event.target.value || null)}
                >
                  <option value="">Aucun responsable</option>
                  {item.responsables.map((responsableOption) => <option key={responsableOption.personne.id} value={responsableOption.personne.id}>
                    {[responsableOption.personne.nom, responsableOption.personne.prenom || responsableOption.personne.nom_usage].filter(Boolean).join(' ')}
                  </option>)}
                </select>
                {rowErrors?.id_responsable && <small id={`tetikasa-action-${row.key}-responsible-error`} className="tetikasa-field-error">{rowErrors.id_responsable}</small>}
              </label>
              <label>
                <span><CalendarDays size={16} aria-hidden="true" />Date de début prévue</span>
                <input type="date" value={row.date_debut_prevue ?? ''} disabled={!enabled || saving} onChange={(event) => updateRow(row.key, 'date_debut_prevue', event.target.value || null)} />
              </label>
              <label>
                <span><CalendarDays size={16} aria-hidden="true" />Date de fin prévue</span>
                <input
                  type="date"
                  value={row.date_fin_prevue ?? ''}
                  aria-invalid={Boolean(rowErrors?.date_fin_prevue)}
                  aria-describedby={rowErrors?.date_fin_prevue ? `tetikasa-action-${row.key}-end-error` : undefined}
                  disabled={!enabled || saving}
                  onChange={(event) => updateRow(row.key, 'date_fin_prevue', event.target.value || null)}
                />
                {rowErrors?.date_fin_prevue && <small id={`tetikasa-action-${row.key}-end-error`} className="tetikasa-field-error">{rowErrors.date_fin_prevue}</small>}
              </label>
            </div>
          </div>}
        </article>
      })}
    </div> : <p className="tetikasa-empty">Aucune action définie pour le moment.</p>}

    {enabled && <footer className="tetikasa-actions-editor-footer">
      <span>{dirty ? 'Des modifications locales ne sont pas encore enregistrées.' : 'Aucune modification à enregistrer.'}</span>
      <button type="button" className="primary" disabled={!dirty || saving} onClick={() => void save()}>
        {saving ? 'Enregistrement…' : 'Enregistrer les actions'}
      </button>
    </footer>}
  </section>
}
