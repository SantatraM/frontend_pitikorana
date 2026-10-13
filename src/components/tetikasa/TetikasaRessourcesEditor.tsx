import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { getTetikasa, updateTetikasaRessources } from '../../api/tetikasa'
import type { TetikasaDetail, TetikasaRessourcePayload, TetikasaRessourceType } from '../../types/tetikasa'

type Props = {
  id: string
  item: TetikasaDetail
  enabled: boolean
  onUpdated: (item: TetikasaDetail) => void
}

type ResourceRow = TetikasaRessourcePayload & { key: string }
type FieldErrors = Partial<Record<'type_ressource' | 'description' | 'quantite' | 'unite' | 'observation', string>>

const RESOURCE_TYPES: Array<{ value: TetikasaRessourceType; label: string }> = [
  { value: 'OLONA', label: 'Olona' },
  { value: 'FAHAIZA_MANAO', label: 'Fahaiza-manao' },
  { value: 'FITAOVANA_ZAVATRA', label: 'Fitaovana / Zavatra' },
  { value: 'FITATERANA', label: 'Fitaterana' },
  { value: 'TOERANA', label: 'Toerana' },
  { value: 'HAFA', label: 'Hafa' },
]

const MAX_DESCRIPTION_LENGTH = 100000
const MAX_UNIT_LENGTH = 100

function toPayload(rows: ResourceRow[]): TetikasaRessourcePayload[] {
  return rows.map((row, index) => ({
    ...(row.id ? { id: row.id } : {}),
    type_ressource: row.type_ressource,
    description: row.description.trim(),
    quantite: row.quantite?.trim() || null,
    unite: row.unite?.trim() || null,
    observation: row.observation?.trim() || null,
    ordre: index + 1,
  }))
}

function resourceTypeLabel(type: TetikasaRessourceType) {
  return RESOURCE_TYPES.find((option) => option.value === type)?.label ?? type
}

function isValidPositiveQuantity(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return false
  const [integer, fraction = ''] = value.split('.')
  return integer.length + fraction.length <= 12 && fraction.length <= 3 && Number(value) > 0
}

export function TetikasaRessourcesEditor({ id, item, enabled, onUpdated }: Props) {
  const [rows, setRows] = useState<ResourceRow[]>([])
  const [initialRows, setInitialRows] = useState<TetikasaRessourcePayload[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, FieldErrors>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const resourcesSignature = JSON.stringify(item.ressources)
  useEffect(() => {
    const nextRows = [...item.ressources]
      .sort((left, right) => left.ordre - right.ordre)
      .map((resource) => ({ ...resource, key: resource.id }))
    setRows(nextRows)
    setInitialRows(toPayload(nextRows))
    setOpenKey(null)
    setErrors({})
    setError('')
  }, [resourcesSignature])

  const payload = useMemo(() => toPayload(rows), [rows])
  const dirty = JSON.stringify(payload) !== JSON.stringify(initialRows)

  const updateRow = <Field extends keyof Omit<ResourceRow, 'key' | 'ordre'>>(
    key: string,
    field: Field,
    value: ResourceRow[Field],
  ) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row))
    setErrors((current) => ({ ...current, [key]: { ...current[key], [field]: undefined } }))
    setError('')
    setSuccess('')
  }

  const addResource = () => {
    const key = `new-${Date.now()}`
    setRows((current) => [...current, {
      key,
      type_ressource: 'OLONA',
      description: '',
      quantite: null,
      unite: null,
      observation: null,
      ordre: current.length + 1,
    }])
    setOpenKey(key)
    setError('')
    setSuccess('')
  }

  const removeResource = (row: ResourceRow) => {
    if (!window.confirm(`Supprimer la ressource « ${row.description || 'sans description'} » ?`)) return
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
    payload.forEach((resource, index) => {
      const resourceErrors: FieldErrors = {}
      if (!RESOURCE_TYPES.some((option) => option.value === resource.type_ressource)) {
        resourceErrors.type_ressource = 'Le type de ressource est invalide.'
      }
      if (!resource.description) resourceErrors.description = 'La description de la ressource est obligatoire.'
      else if (resource.description.length > MAX_DESCRIPTION_LENGTH) resourceErrors.description = 'La description est trop longue.'
      if (resource.quantite && !isValidPositiveQuantity(resource.quantite)) {
        resourceErrors.quantite = 'La quantité doit être un nombre strictement positif (12 chiffres maximum, dont 3 décimales).'
      }
      if (resource.unite && resource.unite.length > MAX_UNIT_LENGTH) resourceErrors.unite = `L’unité ne peut pas dépasser ${MAX_UNIT_LENGTH} caractères.`
      if (resource.observation && resource.observation.length > MAX_DESCRIPTION_LENGTH) resourceErrors.observation = 'L’observation est trop longue.'
      if (Object.keys(resourceErrors).length) nextErrors[rows[index].key] = resourceErrors
    })
    return nextErrors
  }

  const save = async () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    const firstInvalidKey = Object.keys(nextErrors)[0]
    if (firstInvalidKey) {
      setOpenKey(firstInvalidKey)
      setError('Corrigez les champs signalés avant d’enregistrer les ressources.')
      return
    }
    if (!dirty || saving) return
    if (!window.confirm('L’enregistrement remplace toutes les ressources et régénère leurs identifiants. Continuer ?')) return

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateTetikasaRessources(id, item.revision, payload)
      const response = await getTetikasa(id)
      if (!response.data) throw new Error('Drafitra introuvable après enregistrement.')
      onUpdated(response.data)
      setSuccess('Ressources enregistrées avec succès.')
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : 'Impossible d’enregistrer les ressources. Vos modifications locales sont conservées.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="tetikasa-form-section tetikasa-collection-editor tetikasa-resources-editor">
    <header className="tetikasa-actions-editor-head">
      <div>
        <h2><Package size={20} />Ressources du projet <span>{rows.length}</span></h2>
        <p className="tetikasa-editor-note">Les ressources sont enregistrées dans l’ordre affiché.</p>
      </div>
      {enabled && <button type="button" className="tetikasa-add-action" onClick={addResource} disabled={saving}>
        <Plus size={18} aria-hidden="true" />Ajouter une ressource
      </button>}
    </header>

    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="tetikasa-confirmation" role="status">{success}</p>}

    {rows.length > 0 ? <div className="tetikasa-action-editor-list">
      {rows.map((row, index) => {
        const expanded = openKey === row.key
        const changed = JSON.stringify(payload[index]) !== JSON.stringify(initialRows[index])
        const rowErrors = errors[row.key]
        const summary = [resourceTypeLabel(row.type_ressource), row.quantite ? `${row.quantite}${row.unite ? ` ${row.unite}` : ''}` : null]
          .filter(Boolean)
          .join(' · ')

        return <article key={row.key} className={`tetikasa-action-editor-row${expanded ? ' is-open' : ''}${changed ? ' is-changed' : ''}`}>
          <button type="button" className="tetikasa-action-summary" onClick={() => setOpenKey(expanded ? null : row.key)} aria-expanded={expanded}>
            <span className="tetikasa-action-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="tetikasa-action-summary-text">
              <strong>{row.description || 'Nouvelle ressource'}</strong>
              <small>{summary}</small>
            </span>
            {changed && <span className="tetikasa-action-change">Modifiée</span>}
            <ChevronDown className="tetikasa-action-chevron" size={18} aria-hidden="true" />
          </button>

          {enabled && <div className="tetikasa-action-summary-actions">
            <button type="button" onClick={() => setOpenKey(row.key)} disabled={saving}><Pencil size={16} aria-hidden="true" />Modifier</button>
            <button type="button" className="tetikasa-action-remove" onClick={() => removeResource(row)} disabled={saving}><Trash2 size={16} aria-hidden="true" />Supprimer</button>
          </div>}

          {expanded && <div className="tetikasa-action-editor-content">
            <label>
              Description *
              <input
                value={row.description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                aria-invalid={Boolean(rowErrors?.description)}
                aria-describedby={rowErrors?.description ? `tetikasa-resource-${row.key}-description-error` : undefined}
                disabled={!enabled || saving}
                onChange={(event) => updateRow(row.key, 'description', event.target.value)}
              />
              {rowErrors?.description && <small id={`tetikasa-resource-${row.key}-description-error`} className="tetikasa-field-error">{rowErrors.description}</small>}
            </label>

            <div className="tetikasa-collection-fields">
              <label>
                Type de ressource *
                <select value={row.type_ressource} aria-invalid={Boolean(rowErrors?.type_ressource)} disabled={!enabled || saving} onChange={(event) => updateRow(row.key, 'type_ressource', event.target.value as TetikasaRessourceType)}>
                  {RESOURCE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {rowErrors?.type_ressource && <small className="tetikasa-field-error">{rowErrors.type_ressource}</small>}
              </label>
              <label>
                Quantité
                <input inputMode="decimal" value={row.quantite ?? ''} aria-invalid={Boolean(rowErrors?.quantite)} disabled={!enabled || saving} onChange={(event) => updateRow(row.key, 'quantite', event.target.value || null)} />
                {rowErrors?.quantite && <small className="tetikasa-field-error">{rowErrors.quantite}</small>}
              </label>
              <label>
                Unité
                <input maxLength={MAX_UNIT_LENGTH} value={row.unite ?? ''} aria-invalid={Boolean(rowErrors?.unite)} disabled={!enabled || saving} onChange={(event) => updateRow(row.key, 'unite', event.target.value || null)} />
                {rowErrors?.unite && <small className="tetikasa-field-error">{rowErrors.unite}</small>}
              </label>
            </div>

            <label>
              Observation
              <textarea value={row.observation ?? ''} maxLength={MAX_DESCRIPTION_LENGTH} aria-invalid={Boolean(rowErrors?.observation)} disabled={!enabled || saving} onChange={(event) => updateRow(row.key, 'observation', event.target.value || null)} />
              {rowErrors?.observation && <small className="tetikasa-field-error">{rowErrors.observation}</small>}
            </label>
          </div>}
        </article>
      })}
    </div> : <p className="tetikasa-empty">Aucune ressource définie pour le moment.</p>}

    {enabled && <footer className="tetikasa-actions-editor-footer">
      <span>{dirty ? 'Des modifications locales ne sont pas encore enregistrées.' : 'Aucune modification à enregistrer.'}</span>
      <button type="button" className="primary" disabled={!dirty || saving} onClick={() => void save()}>
        {saving ? 'Enregistrement…' : 'Enregistrer les ressources'}
      </button>
    </footer>}
  </section>
}
