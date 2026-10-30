import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, FileClock, Package, Pencil, RefreshCw, Trash2, UserRound, WalletCards, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, apiClient } from '../../api/apiClient'
import { cancelFandraisanAnjara, getFandraisanAnjaraHistorique, updateFandraisanAnjara } from '../../api/fandraisanAnjara'
import { FandraisanAnjaraFoyerSelector } from '../../components/fandraisanAnjara/FandraisanAnjaraFoyerSelector'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import type { ApiSuccess } from '../../types/api'
import type { FandraisanAnjaraContribution, FandraisanAnjaraCreateLine, FandraisanAnjaraHistoryEvent, FandraisanAnjaraHistorySnapshot, FandraisanAnjaraLine } from '../../types/fandraisanAnjara'
import { fandraisanAnjaraWorkflowLabels } from '../../utils/fandraisanAnjaraWorkflowLabels'
import './FandraisanAnjara.css'
import './FandraisanAnjaraActions.css'

type Draft = FandraisanAnjaraCreateLine & { key: string }
type Pending = 'CORRECTION' | 'ANNULATION' | null
const managerRoles = new Set(['ADMIN', 'PASTEUR', 'BUREAU_ZANAKA_AMPIELEZANA'])
const uid = () => crypto.randomUUID()
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Indian/Antananarivo' }).format(new Date())
const money = (value: string, language: 'fr' | 'mg') => { try { return `${new Intl.NumberFormat(language === 'mg' ? 'fr-MG' : 'fr-FR').format(BigInt(value))} Ar` } catch { return `${value} Ar` } }
const asDraft = (line: FandraisanAnjaraLine): Draft => ({ key: uid(), nature: line.nature, montant: line.montant ?? undefined, devise: line.devise ?? undefined, designation: line.designation ?? undefined, quantite: line.quantite ?? undefined, unite: line.unite ?? undefined, observation: line.observation })

function formatDate(value: string, language: 'fr' | 'mg', withTime = false) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return new Intl.DateTimeFormat(language === 'mg' ? 'mg-MG' : 'fr-FR', withTime ? { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Indian/Antananarivo' } : { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

function actorName(event: FandraisanAnjaraHistoryEvent, fallback: string) {
  const { nom, prenom, nom_usage: nomUsage } = event.acteur
  return [nom, prenom || nomUsage].filter(Boolean).join(' ') || fallback
}

function snapshotLine(line: FandraisanAnjaraLine, language: 'fr' | 'mg', labels: ReturnType<typeof fandraisanAnjaraWorkflowLabels>) {
  return line.nature === 'ARGENT'
    ? `${labels.moneyLine} — ${money(line.montant ?? '0', language)}`
    : `${labels.materialLine} — ${line.designation ?? labels.notProvided} · ${line.quantite ?? labels.notProvided} ${line.unite ?? ''}`.trim()
}

function SnapshotPanel({ title, snapshot, comparedWith, language, labels, contributorTypeLabel }: {
  title: string
  snapshot: FandraisanAnjaraHistorySnapshot | null
  comparedWith: FandraisanAnjaraHistorySnapshot | null
  language: 'fr' | 'mg'
  labels: ReturnType<typeof fandraisanAnjaraWorkflowLabels>
  contributorTypeLabel: (type: string) => string
}) {
  if (!snapshot) return <section className="fandraisan-history-snapshot fandraisan-history-empty-snapshot"><h3>{title}</h3><p>{labels.noPreviousValue}</p></section>
  const changed = <T,>(key: keyof FandraisanAnjaraHistorySnapshot, value: T) => comparedWith !== null && JSON.stringify(value) !== JSON.stringify(comparedWith[key])
  const status = snapshot.statut === 'ACTIF' ? labels.active : snapshot.statut === 'ANNULE' ? labels.cancelled : null
  const fields: Array<[string, string, boolean]> = [
    [labels.historyDate, snapshot.date_contribution ?? labels.notProvided, changed('date_contribution', snapshot.date_contribution)],
    [labels.contributionType, snapshot.type_contributeur ? contributorTypeLabel(snapshot.type_contributeur) : labels.notProvided, changed('type_contributeur', snapshot.type_contributeur)],
    [labels.historyContributor, snapshot.contributeur_libelle_snapshot ?? labels.notProvided, changed('contributeur_libelle_snapshot', snapshot.contributeur_libelle_snapshot)],
    [labels.razambeSnapshot, snapshot.id_razambe_snapshot ? labels.recorded : labels.notProvided, changed('id_razambe_snapshot', snapshot.id_razambe_snapshot)],
    [labels.taranakaSnapshot, snapshot.id_taranaka_snapshot ? labels.recorded : labels.notProvided, changed('id_taranaka_snapshot', snapshot.id_taranaka_snapshot)],
    [labels.sampanaSnapshot, snapshot.id_sampana_snapshot ? labels.recorded : labels.notProvided, changed('id_sampana_snapshot', snapshot.id_sampana_snapshot)],
    [labels.resolution, snapshot.resolution_razambe === 'RESOLU' ? labels.resolved : snapshot.resolution_razambe === 'NON_DETERMINE' ? labels.nonDetermined : labels.notProvided, changed('resolution_razambe', snapshot.resolution_razambe)],
    [labels.historyStatus, status ?? labels.notProvided, changed('statut', snapshot.statut)],
    [labels.observation, snapshot.observation || labels.notProvided, changed('observation', snapshot.observation)],
  ]
  return <section className="fandraisan-history-snapshot"><h3>{title}</h3><dl>{fields.map(([label, value, differs]) => <div className={differs ? 'is-changed' : ''} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className={changed('lignes', snapshot.lignes) ? 'fandraisan-history-lines is-changed' : 'fandraisan-history-lines'}><strong>{labels.historyLines}</strong>{snapshot.lignes?.length ? <ul>{snapshot.lignes.map((line, index) => <li key={`${line.ordre}-${index}`}>{snapshotLine(line, language, labels)}</li>)}</ul> : <p>{labels.notProvided}</p>}</div></section>
}

export function FandraisanAnjaraDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const text = fandraisanAnjaraWorkflowLabels(t)
  const [item, setItem] = useState<FandraisanAnjaraContribution | null>(null)
  const [lines, setLines] = useState<Draft[]>([])
  const [date, setDate] = useState('')
  const [observation, setObservation] = useState('')
  const [foyerId, setFoyerId] = useState('')
  const [changeFoyer, setChangeFoyer] = useState(false)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState<Pending>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [history, setHistory] = useState<FandraisanAnjaraHistoryEvent[] | null>(null)
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())
  const focus = useRef<HTMLTextAreaElement>(null)
  const manager = managerRoles.has(user?.compte.role ?? '')
  const editable = manager && item?.statut === 'ACTIF'

  const reset = (value: FandraisanAnjaraContribution) => {
    setDate(value.date_contribution); setObservation(value.observation ?? ''); setLines(value.lignes.map(asDraft)); setFoyerId(value.contributeur.type === 'FOYER' ? value.contributeur.id : ''); setChangeFoyer(false)
  }
  const load = async () => {
    setLoading(true); setError('')
    try {
      const response = await apiClient<ApiSuccess<FandraisanAnjaraContribution>>(`/api/fandraisan-anjara/${encodeURIComponent(id)}`)
      setItem(response.data ?? null)
      if (response.data) reset(response.data)
    } catch (cause) {
      setItem(null); setError(cause instanceof ApiError ? cause.message : t('fandraisanAnjaraWorkflow.contributionDetailLoadError'))
    } finally { setLoading(false) }
  }
  useEffect(() => { setEditing(false); setHistory(null); setExpandedHistory(new Set()); setSuccess(''); void load() }, [id])
  useEffect(() => { if (pending) queueMicrotask(() => focus.current?.focus()) }, [pending])
  const patch = (index: number, value: Partial<Draft>) => setLines((current) => current.map((line, position) => position === index ? { ...line, ...value } : line))
  const validate = () => {
    if (!date || date > today()) return text.invalidDate
    for (const line of lines) {
      if (line.nature === 'ARGENT' && (!/^\d+$/.test(line.montant ?? '') || BigInt(line.montant ?? '0') <= 0n)) return text.invalidMoney
      if (line.nature === 'MATERIEL' && (!line.designation?.trim() || !line.unite?.trim() || !/^\d+(?:\.\d{1,3})?$/.test(line.quantite ?? '') || Number(line.quantite) <= 0)) return text.invalidMaterial
    }
    if (changeFoyer && !foyerId) return text.invalidContributor
    return ''
  }
  const confirmCorrection = () => { const invalid = validate(); if (invalid) { setError(invalid); return }; setError(''); setSuccess(''); setReason(''); setPending('CORRECTION') }
  const submit = async () => {
    if (!item || busy) return
    if (!reason.trim()) { setError(text.required); return }
    setBusy(true); setError(''); setSuccess('')
    try {
      if (pending === 'CORRECTION') {
        const payload = { revision: item.revision, motif_correction: reason.trim(), date_contribution: date, observation: observation.trim() || null, lignes: lines.map(({ key: _key, ...line }) => line), ...(changeFoyer ? { type_contributeur: 'FOYER' as const, id_contributeur: foyerId } : {}) }
        await updateFandraisanAnjara(item.id, payload)
        setSuccess(text.updateSuccess); setEditing(false)
      } else {
        await cancelFandraisanAnjara(item.id, { revision: item.revision, motif_annulation: reason.trim() })
        setSuccess(text.cancelSuccess)
      }
      setPending(null); await load()
    } catch (cause) {
      setPending(null)
      setError(cause instanceof ApiError && cause.status === 409 ? text.conflict : cause instanceof ApiError && (cause.status === 500 || cause.status === 503) ? text.uncertain : cause instanceof ApiError ? cause.message : text.uncertain)
    } finally { setBusy(false) }
  }
  const loadHistory = async () => {
    if (!item || !manager || busy) return
    try { const response = await getFandraisanAnjaraHistorique(item.id); setHistory(response.data?.historique ?? []) }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : t('fandraisanAnjaraWorkflow.contributionDetailLoadError')) }
  }
  const historyAction = (action: FandraisanAnjaraHistoryEvent['action']) => action === 'CREATION' ? text.creation : action === 'CORRECTION' ? text.correction : text.cancellation
  const contributorTypeLabel = (type: string) => {
    if (type === 'RAZAMBE') return t('fandraisanAnjara.contributorTypeRAZAMBE')
    if (type === 'TARANAKA') return t('fandraisanAnjara.contributorTypeTARANAKA')
    if (type === 'SAMPANA') return t('fandraisanAnjara.contributorTypeSAMPANA')
    if (type === 'FOYER') return t('fandraisanAnjara.contributorTypeFOYER')
    if (type === 'PERSONNE') return t('fandraisanAnjara.contributorTypePERSONNE')
    return type
  }
  const historyKey = (event: FandraisanAnjaraHistoryEvent, index: number) => `${event.date_action}-${event.revision}-${index}`
  const toggleHistory = (key: string) => setExpandedHistory((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  return <main className="fandraisan-page fandraisan-detail-page">
    <section className="fandraisan-detail-sheet">
      <Link className="fandraisan-back" to="/fandraisan-anjara/liste"><ArrowLeft size={18} />{t('fandraisanAnjara.back')}</Link>
      {error && <section className="fandraisan-state fandraisan-error" role="alert"><p>{error}</p>{error === text.conflict && <button type="button" onClick={() => void load()}>{text.reload}</button>}</section>}
      {success && <section className="fandraisan-state fandraisan-success" role="status"><p>{success}</p></section>}
      {loading && <section className="fandraisan-state"><RefreshCw className="fandraisan-spin" /><p>{t('fandraisanAnjara.loading')}</p></section>}
      {!loading && item && <>
      <header className="fandraisan-detail-hero">
        <div><p className="fandraisan-eyebrow"><UserRound size={17} />{t(`fandraisanAnjara.contributorType${item.contributeur.type}`)}</p><h1>{item.contributeur.libelle_snapshot}</h1><div className="fandraisan-detail-meta"><span><CalendarDays size={16} />{formatDate(item.date_contribution, language)}</span><span className={`fandraisan-status ${item.statut.toLowerCase()}`}>{item.statut === 'ACTIF' ? text.active : text.cancelled}</span></div></div>
        <div className="fandraisan-detail-total"><span>{t('fandraisanAnjara.totalMoney')}</span><strong>{money(item.total_argent_mga, language)}</strong></div>
      </header>
      {manager && <div className="fandraisan-detail-actions">
        {editable && !editing && <><button type="button" onClick={() => { reset(item); setError(''); setSuccess(''); setEditing(true) }} disabled={busy}><Pencil size={16} />{text.edit}</button><button type="button" className="danger" onClick={() => { setError(''); setSuccess(''); setReason(''); setPending('ANNULATION') }} disabled={busy}><Trash2 size={16} />{text.cancel}</button></>}
        <button type="button" onClick={() => void loadHistory()} disabled={busy}><FileClock size={16} />{text.loadHistory}</button>
      </div>}
      {editing ? <section className="fandraisan-form fandraisan-edit-form">
        <label>{t('fandraisanAnjara.date')}<input type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>{t('fandraisanAnjara.observation')}<textarea value={observation} onChange={(event) => setObservation(event.target.value)} /></label>
        {item.contributeur.type === 'FOYER' && <section className="fandraisan-foyer-change"><label><input type="checkbox" checked={changeFoyer} onChange={(event) => setChangeFoyer(event.target.checked)} />{t('fandraisanAnjaraWorkflow.changeFoyer')}</label>{changeFoyer ? <FandraisanAnjaraFoyerSelector value={foyerId} historicLabel={item.contributeur.libelle_snapshot} onChange={(foyer) => setFoyerId(foyer.id)} /> : <p>{item.contributeur.libelle_snapshot}</p>}</section>}
        <div className="fandraisan-edit-lines"><header><h2>{text.lines}</h2><button type="button" onClick={() => setLines((current) => [...current, { key: uid(), nature: 'MATERIEL', designation: '', quantite: '', unite: '' }])}><Package size={16} />{t('fandraisanAnjara.addLine')}</button></header>{lines.map((line, index) => <fieldset key={line.key}><div className="fandraisan-form-grid"><label>{t('fandraisanAnjara.nature')}<select value={line.nature} onChange={(event) => patch(index, event.target.value === 'ARGENT' ? { nature: 'ARGENT', montant: '', devise: 'MGA', designation: undefined, quantite: undefined, unite: undefined } : { nature: 'MATERIEL', montant: undefined, devise: undefined, designation: '', quantite: '', unite: '' })}><option value="ARGENT">{t('fandraisanAnjara.money')}</option><option value="MATERIEL">{t('fandraisanAnjara.material')}</option></select></label>{line.nature === 'ARGENT' ? <label>{t('fandraisanAnjara.amountMGA')}<input value={line.montant ?? ''} onChange={(event) => patch(index, { montant: event.target.value })} /></label> : <><label>{t('fandraisanAnjara.designation')}<input value={line.designation ?? ''} onChange={(event) => patch(index, { designation: event.target.value })} /></label><label>{t('fandraisanAnjara.quantity')}<input value={line.quantite ?? ''} onChange={(event) => patch(index, { quantite: event.target.value })} /></label><label>{t('fandraisanAnjara.unit')}<input value={line.unite ?? ''} onChange={(event) => patch(index, { unite: event.target.value })} /></label></>}<button type="button" className="fandraisan-remove" disabled={lines.length === 1 || busy} onClick={() => setLines((current) => current.filter((_, position) => position !== index))}><X size={16} />{t('fandraisanAnjara.removeLine')}</button></div></fieldset>)}</div>
        <button type="button" className="fandraisan-primary-action" onClick={confirmCorrection} disabled={busy}>{text.edit}</button>
      </section> : <section className="fandraisan-contribution-lines-card">
        <h2>{t('fandraisanAnjara.contributionLines')}</h2>
        <div className="fandraisan-detail-lines">{item.lignes.map((line) => line.nature === 'ARGENT' ? <div className="fandraisan-detail-line money" key={line.ordre}><WalletCards size={19} /><span>{t('fandraisanAnjara.money')}</span><strong>{money(line.montant ?? '0', language)}</strong></div> : <div className="fandraisan-detail-line material" key={line.ordre}><Package size={19} /><span>{line.designation}</span><strong>{line.quantite} {line.unite}</strong></div>)}</div>
        {item.observation && <p className="fandraisan-detail-observation"><strong>{t('fandraisanAnjara.observation')}:</strong>{item.observation}</p>}
      </section>}
      {manager && history && <section className="fandraisan-history"><h2><FileClock size={19} />{text.history}</h2>{history.length ? <ol>{history.map((event, index) => { const key = historyKey(event, index); const expanded = expandedHistory.has(key); const detailsId = `fandraisan-history-${key}`; return <li key={key}><header><div><strong>{historyAction(event.action)}</strong><span>{formatDate(event.date_action, language, true)} · r{event.revision}</span><small>{text.performedBy}: {actorName(event, text.unknownActor)}</small></div><button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => toggleHistory(key)}>{expanded ? text.hideDetails : text.showDetails}</button></header>{event.commentaire && <p className="fandraisan-history-comment"><strong>{event.action === 'ANNULATION' ? text.cancellationReason : event.action === 'CORRECTION' ? text.correctionReason : text.observation}:</strong>{event.commentaire}</p>}{expanded && <div id={detailsId} className="fandraisan-history-changes">{event.action === 'CREATION' ? <><p className="fandraisan-history-no-before">{text.noPreviousValue}</p><SnapshotPanel title={text.initialValues} snapshot={event.donnees_apres} comparedWith={null} language={language} labels={text} contributorTypeLabel={contributorTypeLabel} /></> : <><SnapshotPanel title={text.before} snapshot={event.donnees_avant} comparedWith={event.donnees_apres} language={language} labels={text} contributorTypeLabel={contributorTypeLabel} /><SnapshotPanel title={text.after} snapshot={event.donnees_apres} comparedWith={event.donnees_avant} language={language} labels={text} contributorTypeLabel={contributorTypeLabel} /></>}</div>}</li>})}</ol> : <p>{text.empty}</p>}</section>}
      {pending && <div className="fandraisan-modal-backdrop" role="presentation"><section className={`fandraisan-modal${pending === 'ANNULATION' ? ' danger' : ''}`} role="dialog" aria-modal="true" aria-labelledby="fandraisan-confirm-title"><h2 id="fandraisan-confirm-title">{pending === 'CORRECTION' ? text.confirmEdit : text.confirmCancel}</h2><p>{pending === 'CORRECTION' ? text.editText : text.cancelText}</p><label>{pending === 'CORRECTION' ? text.correctionReason : text.cancellationReason}<textarea ref={focus} value={reason} onChange={(event) => setReason(event.target.value)} /></label><footer><button type="button" onClick={() => setPending(null)} disabled={busy}>{text.back}</button><button type="button" className={pending === 'ANNULATION' ? 'danger' : ''} onClick={() => void submit()} disabled={busy}>{busy ? text.saving : text.confirm}</button></footer></section></div>}
      </>}
    </section>
  </main>
}
