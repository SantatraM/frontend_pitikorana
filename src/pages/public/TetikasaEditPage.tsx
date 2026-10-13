import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, FileText, MapPin, Target } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { getTetikasa, updateTetikasa } from '../../api/tetikasa'
import { useAuth } from '../../hooks/useAuth'
import type { TetikasaDetail, TetikasaMainUpdatePayload } from '../../types/tetikasa'
import { TetikasaResponsablesEditor } from '../../components/tetikasa/TetikasaResponsablesEditor'
import { TetikasaActionsEditor } from '../../components/tetikasa/TetikasaActionsEditor'
import './Tetikasa.css'
import { TetikasaRessourcesEditor } from '../../components/tetikasa/TetikasaRessourcesEditor'
import { TetikasaBudgetEditor } from '../../components/tetikasa/TetikasaBudgetEditor'

type FormValues = {
  titre: string; description: string; raison: string; objectif: string; beneficiaires: string
  lieu: string; lieu_non_defini: boolean; date_debut_prevue: string; date_fin_prevue: string
}

const toValues = (item: TetikasaDetail): FormValues => ({
  titre: item.titre ?? '', description: item.description ?? '', raison: item.raison ?? '',
  objectif: item.objectif ?? '', beneficiaires: item.beneficiaires ?? '', lieu: item.lieu ?? '',
  lieu_non_defini: item.lieu_non_defini, date_debut_prevue: item.date_debut_prevue ?? '',
  date_fin_prevue: item.date_fin_prevue ?? '',
})
const asNullable = (value: string) => value.trim() || null
const DATE_RANGE_ERROR = 'La date de fin doit être postérieure ou égale à la date de début.'

function payloadFrom(values: FormValues, initial: FormValues): TetikasaMainUpdatePayload {
  const payload: TetikasaMainUpdatePayload = {}
  const textFields: Array<keyof Pick<FormValues, 'titre' | 'description' | 'raison' | 'objectif' | 'beneficiaires' | 'lieu'>> = ['titre', 'description', 'raison', 'objectif', 'beneficiaires', 'lieu']
  for (const field of textFields) {
    const next = asNullable(values[field])
    const before = asNullable(initial[field])
    if (next !== before) payload[field] = next
  }
  if (values.lieu_non_defini !== initial.lieu_non_defini) payload.lieu_non_defini = values.lieu_non_defini
  for (const field of ['date_debut_prevue', 'date_fin_prevue'] as const) {
    const next = values[field] || null
    const before = initial[field] || null
    if (next !== before) payload[field] = next
  }
  return payload
}

export function TetikasaEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [item, setItem] = useState<TetikasaDetail | null>(null)
  const [values, setValues] = useState<FormValues | null>(null)
  const endDateRef = useRef<HTMLInputElement>(null)
  const [initial, setInitial] = useState<FormValues | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getTetikasa(id).then((response) => {
      if (!active || !response.data) return
      const next = toValues(response.data)
      setItem(response.data); setValues(next); setInitial(next)
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof ApiError ? reason.message : 'Impossible de charger le Drafitra.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const payload = useMemo(() => values && initial ? payloadFrom(values, initial) : {}, [values, initial])
  const dirty = Object.keys(payload).length > 0
  const allowed = (user?.compte.role === 'ADMIN' || user?.compte.role === 'PASTEUR') && item?.statut.code === 'DRAFITRA'
  const set = (field: keyof FormValues, value: string | boolean) => setValues((current) => current ? { ...current, [field]: value } : current)

  const datesInvalid = Boolean(values?.date_debut_prevue && values.date_fin_prevue && values.date_fin_prevue < values.date_debut_prevue)
  const setDate = (field: 'date_debut_prevue' | 'date_fin_prevue', value: string) => { set(field, value); if (error === DATE_RANGE_ERROR) setError('') }
  const cancel = () => {
    if (!dirty || window.confirm('Les modifications non enregistrées seront perdues. Continuer ?')) navigate('/tetikasa/' + id)
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!values || !item || saving) return
    if (!values.titre.trim()) { setError('Le titre est obligatoire.'); return }
    if (datesInvalid) {
      endDateRef.current?.focus(); return
    }
    if (!dirty) { setError('Aucune modification à enregistrer.'); return }
    setSaving(true); setError('')
    try {
      await updateTetikasa(id, payload)
      navigate('/tetikasa/' + id, { state: { message: 'Drafitra modifié avec succès.' } })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Impossible d’enregistrer les modifications.')
    } finally { setSaving(false) }
  }

  if (loading) return <p className="auth-loading">Chargement du Drafitra…</p>
  if (!item || !values) return <section className="tetikasa-page"><Link to="/soso-kevitra">← Retour aux suggestions</Link><p className="form-error">{error || 'Drafitra introuvable.'}</p></section>
  if (!allowed) return <section className="tetikasa-page"><Link className="tetikasa-back" to={'/tetikasa/' + id}>← Retour au Drafitra</Link><section className="tetikasa-panel"><h1>Modification indisponible</h1><p className="tetikasa-empty">Seuls ADMIN et PASTEUR peuvent modifier un Drafitra au statut DRAFITRA.</p></section></section>

  return <main className="tetikasa-page tetikasa-edit-page">
    <Link className="tetikasa-back" to={'/tetikasa/' + id} onClick={(event) => { if (dirty && !window.confirm('Les modifications non enregistrées seront perdues. Continuer ?')) event.preventDefault() }}>← Retour au Drafitra</Link>
    <header className="tetikasa-head"><div><span className="tetikasa-status">{item.statut.code}</span><h1>Modifier le Drafitra</h1><p>Modifiez uniquement les informations générales du projet.</p></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <form className="tetikasa-form" onSubmit={(event) => void submit(event)}>
      <section className="tetikasa-form-section"><h2><FileText size={20} />Informations principales</h2><label>Titre *<input required maxLength={200} value={values.titre} onChange={(event) => set('titre', event.target.value)} /></label><label>Description<textarea value={values.description} onChange={(event) => set('description', event.target.value)} /></label></section>
      <section className="tetikasa-form-section"><h2><Target size={20} />Finalité</h2><div className="tetikasa-form-grid"><label>Raison<textarea value={values.raison} onChange={(event) => set('raison', event.target.value)} /></label><label>Objectif<textarea value={values.objectif} onChange={(event) => set('objectif', event.target.value)} /></label><label>Bénéficiaires<textarea value={values.beneficiaires} onChange={(event) => set('beneficiaires', event.target.value)} /></label></div></section>
      <section className="tetikasa-form-section"><h2><MapPin size={20} />Lieu et période</h2><div className="tetikasa-form-grid"><label>Lieu<input disabled={values.lieu_non_defini} value={values.lieu} onChange={(event) => setValues((current) => current ? { ...current, lieu: event.target.value, lieu_non_defini: event.target.value.trim() ? false : current.lieu_non_defini } : current)} /></label><label className="tetikasa-checkbox"><input type="checkbox" checked={values.lieu_non_defini} onChange={(event) => set('lieu_non_defini', event.target.checked)} />Lieu à définir</label><label><CalendarDays size={16} />Date de début prévue<input type="date" value={values.date_debut_prevue} aria-invalid={datesInvalid} aria-describedby={datesInvalid ? 'tetikasa-date-range-error' : undefined} onChange={(event) => setDate('date_debut_prevue', event.target.value)} /></label><label><CalendarDays size={16} />Date de fin prévue<input ref={endDateRef} type="date" value={values.date_fin_prevue} aria-invalid={datesInvalid} aria-describedby={datesInvalid ? 'tetikasa-date-range-error' : undefined} onChange={(event) => setDate('date_fin_prevue', event.target.value)} /></label>{datesInvalid && <p id="tetikasa-date-range-error" className="tetikasa-date-error" role="alert">{DATE_RANGE_ERROR}</p>}</div></section>
      <footer className="tetikasa-form-actions"><button type="button" onClick={cancel} disabled={saving}>Annuler</button><button className="primary" disabled={saving || !dirty}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button></footer>
    </form>
    <TetikasaResponsablesEditor id={id} item={item} enabled={allowed} onUpdated={setItem} />
    <TetikasaActionsEditor id={id} item={item} enabled={allowed} onUpdated={setItem} />
    <TetikasaRessourcesEditor id={id} item={item} enabled={allowed} onUpdated={setItem} />
    <TetikasaBudgetEditor id={id} item={item} enabled={allowed} onUpdated={setItem} />
  </main>
}
