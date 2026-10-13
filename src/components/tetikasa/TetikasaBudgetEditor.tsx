import { useEffect, useMemo, useState } from 'react'
import { Banknote, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { getTetikasa, updateTetikasaBudget } from '../../api/tetikasa'
import type { TetikasaBudgetPayload, TetikasaDetail } from '../../types/tetikasa'

type Props = {
  id: string
  item: TetikasaDetail
  enabled: boolean
  onUpdated: (item: TetikasaDetail) => void
}

type BudgetRow = TetikasaBudgetPayload & { key: string }
type FieldErrors = Partial<Record<'designation' | 'quantite' | 'prix_unitaire_estime', string>>

const MAX_DESIGNATION_LENGTH = 100000
const QUANTITY_SCALE = 3
const PRICE_SCALE = 2
const TOTAL_SCALE = QUANTITY_SCALE + PRICE_SCALE

function toPayload(rows: BudgetRow[]): TetikasaBudgetPayload[] {
  return rows.map((row, index) => ({
    ...(row.id ? { id: row.id } : {}),
    designation: row.designation.trim(),
    quantite: row.quantite.trim(),
    prix_unitaire_estime: row.prix_unitaire_estime.trim(),
    ordre: index + 1,
  }))
}

function isDecimalWithin(value: string, precision: number, scale: number, strictlyPositive: boolean) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return false
  const [integer, fraction = ''] = value.split('.')
  if (integer.length + fraction.length > precision || fraction.length > scale) return false
  const unscaled = BigInt(`${integer}${fraction.padEnd(scale, '0')}`)
  return strictlyPositive ? unscaled > 0n : unscaled >= 0n
}

function decimalToScaled(value: string, scale: number) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null
  const [integer, fraction = ''] = value.split('.')
  if (fraction.length > scale) return null
  return BigInt(`${integer}${fraction.padEnd(scale, '0')}`)
}

function calculateLineTotal(quantity: string, unitPrice: string) {
  const normalizedQuantity = quantity.trim()
  const normalizedPrice = unitPrice.trim()
  if (!isDecimalWithin(normalizedQuantity, 12, QUANTITY_SCALE, true)) return null
  if (!isDecimalWithin(normalizedPrice, 18, PRICE_SCALE, false)) return null
  const quantityScaled = decimalToScaled(normalizedQuantity, QUANTITY_SCALE)
  const priceScaled = decimalToScaled(normalizedPrice, PRICE_SCALE)
  if (quantityScaled === null || priceScaled === null) return null
  return quantityScaled * priceScaled
}

function formatMGA(value: bigint | null) {
  if (value === null) return '—'
  const divisor = 10n ** BigInt(TOTAL_SCALE)
  const whole = value / divisor
  const fraction = (value % divisor).toString().padStart(TOTAL_SCALE, '0').replace(/0+$/, '')
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${grouped}${fraction ? `,${fraction}` : ''} Ar`
}

export function TetikasaBudgetEditor({ id, item, enabled, onUpdated }: Props) {
  const [rows, setRows] = useState<BudgetRow[]>([])
  const [initialRows, setInitialRows] = useState<TetikasaBudgetPayload[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, FieldErrors>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const budgetSignature = JSON.stringify(item.budget)
  useEffect(() => {
    const nextRows = [...item.budget]
      .sort((left, right) => left.ordre - right.ordre)
      .map((line) => ({ ...line, key: line.id }))
    setRows(nextRows)
    setInitialRows(toPayload(nextRows))
    setOpenKey(null)
    setErrors({})
    setError('')
  }, [budgetSignature])

  const payload = useMemo(() => toPayload(rows), [rows])
  const dirty = JSON.stringify(payload) !== JSON.stringify(initialRows)
  const lineTotals = useMemo(() => rows.map((row) => calculateLineTotal(row.quantite, row.prix_unitaire_estime)), [rows])
  const total = useMemo(() => lineTotals.reduce<bigint | null>((sum, lineTotal) => sum === null || lineTotal === null ? null : sum + lineTotal, 0n), [lineTotals])

  const updateRow = <Field extends keyof Omit<BudgetRow, 'key' | 'ordre'>>(
    key: string,
    field: Field,
    value: BudgetRow[Field],
  ) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row))
    setErrors((current) => ({ ...current, [key]: { ...current[key], [field]: undefined } }))
    setError('')
    setSuccess('')
  }

  const addBudgetLine = () => {
    const key = `new-${Date.now()}`
    setRows((current) => [...current, {
      key,
      designation: '',
      quantite: '',
      prix_unitaire_estime: '',
      ordre: current.length + 1,
    }])
    setOpenKey(key)
    setError('')
    setSuccess('')
  }

  const removeBudgetLine = (row: BudgetRow) => {
    if (!window.confirm(`Supprimer la ligne « ${row.designation || 'sans désignation'} » ?`)) return
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
    payload.forEach((line, index) => {
      const lineErrors: FieldErrors = {}
      if (!line.designation) lineErrors.designation = 'La désignation est obligatoire.'
      else if (line.designation.length > MAX_DESIGNATION_LENGTH) lineErrors.designation = 'La désignation est trop longue.'
      if (!line.quantite) lineErrors.quantite = 'La quantité est obligatoire.'
      else if (!isDecimalWithin(line.quantite, 12, QUANTITY_SCALE, true)) lineErrors.quantite = 'La quantité doit être strictement positive (12 chiffres maximum, dont 3 décimales).'
      if (!line.prix_unitaire_estime) lineErrors.prix_unitaire_estime = 'Le prix unitaire est obligatoire.'
      else if (!isDecimalWithin(line.prix_unitaire_estime, 18, PRICE_SCALE, false)) lineErrors.prix_unitaire_estime = 'Le prix doit être positif ou nul (18 chiffres maximum, dont 2 décimales).'
      if (Object.keys(lineErrors).length) nextErrors[rows[index].key] = lineErrors
    })
    return nextErrors
  }

  const save = async () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    const firstInvalidKey = Object.keys(nextErrors)[0]
    if (firstInvalidKey) {
      setOpenKey(firstInvalidKey)
      setError('Corrigez les champs signalés avant d’enregistrer le budget.')
      return
    }
    if (!dirty || saving) return
    if (!window.confirm('L’enregistrement remplace toutes les lignes budgétaires et régénère leurs identifiants. Continuer ?')) return

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateTetikasaBudget(id, item.revision, payload)
      const response = await getTetikasa(id)
      if (!response.data) throw new Error('Drafitra introuvable après enregistrement.')
      onUpdated(response.data)
      setSuccess('Budget prévisionnel enregistré avec succès.')
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : 'Impossible d’enregistrer le budget. Vos modifications locales sont conservées.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="tetikasa-form-section tetikasa-collection-editor tetikasa-budget-editor">
    <header className="tetikasa-actions-editor-head">
      <div>
        <h2><Banknote size={20} />Budget prévisionnel <span>{rows.length}</span></h2>
        <p className="tetikasa-editor-note">Les lignes sont enregistrées dans l’ordre affiché.</p>
      </div>
      {enabled && <button type="button" className="tetikasa-add-action" onClick={addBudgetLine} disabled={saving}>
        <Plus size={18} aria-hidden="true" />Ajouter une ligne
      </button>}
    </header>

    <div className="tetikasa-budget-editor-total" aria-live="polite">
      <span>Total prévisionnel actuellement saisi</span>
      <strong>{formatMGA(total)}</strong>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {success && <p className="tetikasa-confirmation" role="status">{success}</p>}

    {rows.length > 0 ? <div className="tetikasa-action-editor-list">
      {rows.map((row, index) => {
        const expanded = openKey === row.key
        const changed = JSON.stringify(payload[index]) !== JSON.stringify(initialRows[index])
        const rowErrors = errors[row.key]
        const lineTotal = lineTotals[index]

        return <article key={row.key} className={`tetikasa-action-editor-row${expanded ? ' is-open' : ''}${changed ? ' is-changed' : ''}`}>
          <button type="button" className="tetikasa-action-summary" onClick={() => setOpenKey(expanded ? null : row.key)} aria-expanded={expanded}>
            <span className="tetikasa-action-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="tetikasa-action-summary-text">
              <strong>{row.designation || 'Nouvelle ligne budgétaire'}</strong>
              <small>{row.quantite && row.prix_unitaire_estime ? `${row.quantite} × ${formatMGA(decimalToScaled(row.prix_unitaire_estime, PRICE_SCALE) === null ? null : decimalToScaled(row.prix_unitaire_estime, PRICE_SCALE)! * (10n ** BigInt(QUANTITY_SCALE)))}` : 'Montants non renseignés'}</small>
            </span>
            {changed && <span className="tetikasa-action-change">Modifiée</span>}
            <ChevronDown className="tetikasa-action-chevron" size={18} aria-hidden="true" />
          </button>

          {enabled && <div className="tetikasa-action-summary-actions">
            <button type="button" onClick={() => setOpenKey(row.key)} disabled={saving}><Pencil size={16} aria-hidden="true" />Modifier</button>
            <button type="button" className="tetikasa-action-remove" onClick={() => removeBudgetLine(row)} disabled={saving}><Trash2 size={16} aria-hidden="true" />Supprimer</button>
          </div>}

          {expanded && <div className="tetikasa-action-editor-content">
            <label>
              Désignation *
              <input value={row.designation} maxLength={MAX_DESIGNATION_LENGTH} aria-invalid={Boolean(rowErrors?.designation)} disabled={!enabled || saving} onChange={(event) => updateRow(row.key, 'designation', event.target.value)} />
              {rowErrors?.designation && <small className="tetikasa-field-error">{rowErrors.designation}</small>}
            </label>

            <div className="tetikasa-budget-fields">
              <label>
                Quantité *
                <input inputMode="decimal" value={row.quantite} aria-invalid={Boolean(rowErrors?.quantite)} disabled={!enabled || saving} onChange={(event) => updateRow(row.key, 'quantite', event.target.value)} />
                {rowErrors?.quantite && <small className="tetikasa-field-error">{rowErrors.quantite}</small>}
              </label>
              <label>
                Prix unitaire estimé (Ar) *
                <input inputMode="decimal" value={row.prix_unitaire_estime} aria-invalid={Boolean(rowErrors?.prix_unitaire_estime)} disabled={!enabled || saving} onChange={(event) => updateRow(row.key, 'prix_unitaire_estime', event.target.value)} />
                {rowErrors?.prix_unitaire_estime && <small className="tetikasa-field-error">{rowErrors.prix_unitaire_estime}</small>}
              </label>
            </div>
            <p className="tetikasa-budget-line-total"><span>Sous-total estimé</span><strong>{formatMGA(lineTotal)}</strong></p>
          </div>}
        </article>
      })}
    </div> : <p className="tetikasa-empty">Aucune ligne budgétaire définie pour le moment.</p>}

    {enabled && <footer className="tetikasa-actions-editor-footer">
      <span>{dirty ? 'Des modifications locales ne sont pas encore enregistrées.' : 'Aucune modification à enregistrer.'}</span>
      <button type="button" className="primary" disabled={!dirty || saving} onClick={() => void save()}>
        {saving ? 'Enregistrement…' : 'Enregistrer le budget'}
      </button>
    </footer>}
  </section>
}
