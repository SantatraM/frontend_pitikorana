import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ClipboardList, FileText, MapPin, Package, Pencil, Target, Users, WalletCards, Wrench } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getTetikasa, transitionTetikasa } from '../../api/tetikasa'
import { ApiError } from '../../api/apiClient'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import type { TetikasaDetail, TetikasaPerson, TetikasaTransitionAction } from '../../types/tetikasa'
import './Tetikasa.css'
import './TetikasaWorkflow.css'

const number = (value: string | number | null) => Number(String(value ?? 0).replace(',', '.'))

function TextCard({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return <section className="tetikasa-text-card"><Icon aria-hidden="true" size={20} /><div><h2>{title}</h2><p>{children}</p></div></section>
}

export function TetikasaDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const location = useLocation()
  const [item, setItem] = useState<TetikasaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState<TetikasaTransitionAction | null>(null)
  const [comment, setComment] = useState('')
  const [workflowError, setWorkflowError] = useState('')
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [needsReload, setNeedsReload] = useState(false)
  const [workflowSuccess, setWorkflowSuccess] = useState('')
  const [working, setWorking] = useState(false)
  const busy = useRef(false)
  const locale = language === 'mg' ? 'mg-MG' : 'fr-FR'
  const format = (value: string | number | null, digits: number) => {
    try { return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(number(value)).replace(/[\u00a0\u202f]/g, ' ') }
    catch { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(number(value)).replace(/[\u00a0\u202f]/g, ' ') }
  }
  const money = (value: string | number, devise: string) => `${format(value, 2)} ${devise === 'MGA' ? 'Ar' : devise}`
  const personName = (person: TetikasaPerson) => [person.nom, person.prenom].filter(Boolean).join(' ') || t('tetikasa.noPerson')
  const civilDate = (value: string | null) => value || t('tetikasa.notProvidedF')
  const dateTime = (value: string) => {
    try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
    catch { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
  }
  const resourceType: Record<TetikasaDetail['ressources'][number]['type_ressource'], string> = {
    OLONA: t('tetikasa.people'), FAHAIZA_MANAO: t('tetikasa.skills'), FITAOVANA_ZAVATRA: t('tetikasa.equipment'),
    FITATERANA: t('tetikasa.transport'), TOERANA: t('tetikasa.place'), HAFA: t('tetikasa.other'),
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void getTetikasa(id).then((response) => {
      if (active) setItem(response.data ?? null)
    }).catch((reason: unknown) => {
      if (!active) return
      console.error(reason)
      setError(reason instanceof ApiError && reason.status === 404 ? t('tetikasa.notFound') : t('tetikasa.loadError'))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, location.key, language, t])

  const actionLabels: Record<TetikasaTransitionAction, string> = {
    SOUMISSION_VALIDATION: t('tetikasaWorkflow.submit'), VALIDATION: t('tetikasaWorkflow.validate'),
    REFUS: t('tetikasaWorkflow.refuse'), RETOUR_CORRECTION: t('tetikasaWorkflow.returnCorrection'),
  }
  const actionConfirmations: Record<TetikasaTransitionAction, string> = {
    SOUMISSION_VALIDATION: t('tetikasaWorkflow.submitConfirm'), VALIDATION: t('tetikasaWorkflow.validateConfirm'),
    REFUS: t('tetikasaWorkflow.refuseConfirm'), RETOUR_CORRECTION: t('tetikasaWorkflow.returnConfirm'),
  }
  const actionSuccess: Record<TetikasaTransitionAction, string> = {
    SOUMISSION_VALIDATION: t('tetikasaWorkflow.submitSuccess'), VALIDATION: t('tetikasaWorkflow.validateSuccess'),
    REFUS: t('tetikasaWorkflow.refuseSuccess'), RETOUR_CORRECTION: t('tetikasaWorkflow.returnSuccess'),
  }
  const missingLabels: Record<string, string> = {
    titre: t('tetikasaWorkflow.fieldTitle'), description: t('tetikasaWorkflow.fieldDescription'), objectif: t('tetikasaWorkflow.fieldObjective'),
    beneficiaires: t('tetikasaWorkflow.fieldBeneficiaries'), lieu: t('tetikasaWorkflow.fieldLocation'),
    date_debut_prevue: t('tetikasaWorkflow.fieldStart'), date_fin_prevue: t('tetikasaWorkflow.fieldEnd'),
    responsables: t('tetikasaWorkflow.fieldResponsible'), actions: t('tetikasaWorkflow.fieldActions'),
  }
  const reloadWorkflow = async () => {
    if (busy.current) return
    busy.current = true
    setWorking(true)
    try {
      const response = await getTetikasa(id)
      if (!response.data) throw new Error('Missing project')
      setItem(response.data)
      setNeedsReload(false)
      setWorkflowError('')
      setMissingFields([])
      setPendingAction(null)
    } catch (reason) {
      console.error(reason)
      setWorkflowError(t('tetikasaWorkflow.reloadError'))
      setNeedsReload(true)
    } finally {
      busy.current = false
      setWorking(false)
    }
  }
  const performTransition = async () => {
    if (!item || !pendingAction || busy.current || needsReload) return
    const required = pendingAction === 'REFUS' || pendingAction === 'RETOUR_CORRECTION'
    if (required && !comment.trim()) {
      setWorkflowError(t('tetikasaWorkflow.reasonRequired'))
      return
    }
    busy.current = true
    setWorking(true)
    setWorkflowError('')
    setWorkflowSuccess('')
    setMissingFields([])
    try {
      await transitionTetikasa(id, pendingAction, item.revision, required ? comment.trim() : null)
      setWorkflowSuccess(actionSuccess[pendingAction])
      setPendingAction(null)
      setComment('')
      try {
        const response = await getTetikasa(id)
        if (!response.data) throw new Error('Missing project')
        setItem(response.data)
      } catch (reason) {
        console.error(reason)
        setNeedsReload(true)
        setWorkflowError(t('tetikasaWorkflow.reloadError'))
      }
    } catch (reason) {
      if (reason instanceof ApiError) {
        const response = reason.response as (typeof reason.response & { fields?: unknown })
        if (reason.status === 409 && response?.code === 'TETIKASA_INCOMPLETE') {
          setWorkflowError(t('tetikasaWorkflow.incomplete'))
          setMissingFields(Array.isArray(response.fields) ? response.fields.filter((field): field is string => typeof field === 'string') : [])
        } else if (reason.status === 409 && response?.code === 'TETIKASA_REVISION_CONFLICT') {
          setWorkflowError(t('tetikasaWorkflow.conflict'))
          setNeedsReload(true)
        } else if (reason.status === 409 && response?.code === 'TETIKASA_STATE_INVALID') {
          setWorkflowError(t('tetikasaWorkflow.invalidState'))
          setNeedsReload(true)
        } else if (reason.status === 403) setWorkflowError(t('tetikasaWorkflow.forbidden'))
        else setWorkflowError(t('tetikasaWorkflow.error'))
      } else setWorkflowError(t('tetikasaWorkflow.error'))
      console.error(reason)
    } finally {
      busy.current = false
      setWorking(false)
    }
  }

  if (loading) return <p className="auth-loading">{t('tetikasa.loading')}</p>
  if (!item) return <section className="tetikasa-page"><Link to="/soso-kevitra">← {t('tetikasa.backSuggestions')}</Link><p className="form-error">{error || t('tetikasa.notFound')}</p></section>

  const canEdit = user?.compte.role === 'ADMIN' || user?.compte.role === 'PASTEUR' || user?.compte.role === 'BUREAU_ZANAKA_AMPIELEZANA'
  const canDecide = user?.compte.role === 'ADMIN' || user?.compte.role === 'PASTEUR'
  const statusLabels: Record<string, string> = {
    DRAFITRA: t('tetikasa.statusDraft'), EN_ATTENTE_VALIDATION: t('tetikasaWorkflow.pending'),
    VALIDE: t('tetikasaWorkflow.valid'), REFUSE: t('tetikasaWorkflow.refused'),
  }
  const availableActions: TetikasaTransitionAction[] = item.statut.code === 'DRAFITRA' && canEdit
    ? ['SOUMISSION_VALIDATION']
    : item.statut.code === 'EN_ATTENTE_VALIDATION' && canDecide ? ['VALIDATION', 'REFUS', 'RETOUR_CORRECTION'] : []
  const responsables = item.responsables.filter((row) => row.type_responsabilite === 'ASSOCIE')
  const principal = item.responsables.find((row) => row.type_responsabilite === 'PRINCIPAL')
  const personsById = new Map(item.responsables.map((row) => [row.personne.id, row.personne]))
  const groupedResources = item.ressources.reduce<Record<string, TetikasaDetail['ressources']>>((groups, resource) => {
    ;(groups[resource.type_ressource] ??= []).push(resource)
    return groups
  }, {})
  const displayLocation = item.lieu?.trim() || (item.lieu_non_defini ? t('tetikasa.locationUnknown') : t('tetikasa.notProvidedF'))

  return <main className="tetikasa-page">
    <Link className="tetikasa-back" to="/soso-kevitra">← {t('tetikasa.backSuggestions')}</Link>
    <header className="tetikasa-head">
      <div><span className="tetikasa-status">{statusLabels[item.statut.code] ?? item.statut.code}</span><h1>{item.titre || t('tetikasa.untitled')}</h1><p>{t('tetikasa.createdBy')} {personName(item.created_by)} · {dateTime(item.date_creation)}</p></div>
      {canEdit && item.statut.code === 'DRAFITRA' && !needsReload && !working && <Link className="primary" to={`/tetikasa/${id}/modifier`}><Pencil size={17} />{t('tetikasa.edit')}</Link>}
    </header>

    {typeof location.state === 'object' && location.state !== null && 'message' in location.state && typeof location.state.message === 'string' && <p className="tetikasa-confirmation" role="status">{location.state.message}</p>}
    {workflowSuccess && <p className="tetikasa-confirmation" role="status">{workflowSuccess}</p>}
    {(availableActions.length > 0 || workflowError || needsReload) && <section className="tetikasa-workflow">
      <div className="tetikasa-workflow-actions">{availableActions.map((action) => <button key={action} type="button" disabled={working || needsReload} className={action === 'REFUS' ? 'tetikasa-workflow-danger' : ''} onClick={() => { setPendingAction(action); setComment(''); setWorkflowError(''); setMissingFields([]) }}>{actionLabels[action]}</button>)}</div>
      {pendingAction && <div className="tetikasa-workflow-confirm" role="region" aria-label={actionLabels[pendingAction]}>
        <strong>{actionLabels[pendingAction]}</strong><p>{actionConfirmations[pendingAction]}</p>
        {(pendingAction === 'REFUS' || pendingAction === 'RETOUR_CORRECTION') && <label>{t('tetikasaWorkflow.reason')}<textarea value={comment} disabled={working} onChange={(event) => setComment(event.target.value)} /></label>}
        <div className="tetikasa-workflow-actions"><button type="button" disabled={working || needsReload} onClick={() => void performTransition()}>{working ? t('tetikasaWorkflow.sending') : t('tetikasaWorkflow.confirm')}</button><button type="button" disabled={working} onClick={() => { setPendingAction(null); setWorkflowError(''); setMissingFields([]) }}>{t('tetikasaWorkflow.cancel')}</button></div>
      </div>}
      {workflowError && <div className="tetikasa-workflow-error" role="alert"><p>{workflowError}</p>{missingFields.length > 0 && <ul>{missingFields.map((field) => <li key={field}>{missingLabels[field] ?? field}</li>)}</ul>}</div>}
      {needsReload && <button type="button" disabled={working} onClick={() => void reloadWorkflow()}>{t('tetikasaWorkflow.reload')}</button>}
    </section>}
    <section className="tetikasa-overview">
      <TextCard icon={FileText} title={t('tetikasa.description')}>{item.description || t('tetikasa.notProvidedF')}</TextCard>
      <TextCard icon={Target} title={t('tetikasa.objective')}>{item.objectif || t('tetikasa.notProvided')}</TextCard>
      <TextCard icon={Users} title={t('tetikasa.beneficiaries')}>{item.beneficiaires || t('tetikasa.notProvidedPlural')}</TextCard>
      <TextCard icon={MapPin} title={t('tetikasa.location')}>{displayLocation}</TextCard>
      <TextCard icon={CalendarDays} title={t('tetikasa.plannedPeriod')}>{civilDate(item.date_debut_prevue)} — {civilDate(item.date_fin_prevue)}</TextCard>
      <TextCard icon={ClipboardList} title={t('tetikasa.reason')}>{item.raison || t('tetikasa.notProvidedF')}</TextCard>
    </section>

    <section className="tetikasa-panel"><h2><Users size={20} />{t('tetikasa.responsables')}</h2>
      {principal ? <div className="tetikasa-principal"><strong>{t('tetikasa.principal')}</strong><span>{personName(principal.personne)}</span></div> : <p className="tetikasa-empty">{t('tetikasa.noPrincipal')}</p>}
      {responsables.length > 0 && <ul className="tetikasa-people">{responsables.map((row) => <li key={row.id}>{personName(row.personne)}</li>)}</ul>}
    </section>

    <section className="tetikasa-panel"><h2><ClipboardList size={20} />{t('tetikasa.actions')}</h2>
      {item.actions.length ? <ol className="tetikasa-actions">{item.actions.map((action) => <li key={action.id}><span>{String(action.ordre).padStart(2, '0')}</span><div><strong>{action.titre}</strong>{action.description && <p>{action.description}</p>}{action.id_responsable && <small>{t('tetikasa.actionResponsible')} : {personsById.get(action.id_responsable) ? personName(personsById.get(action.id_responsable)!) : t('tetikasa.noResponsibleProvided')}</small>}{(action.date_debut_prevue || action.date_fin_prevue) && <small>{t('tetikasa.dates')} : {civilDate(action.date_debut_prevue)} — {civilDate(action.date_fin_prevue)}</small>}</div></li>)}</ol> : <p className="tetikasa-empty">{t('tetikasa.noAction')}</p>}
    </section>

    <section className="tetikasa-panel"><h2><Package size={20} />{t('tetikasa.resources')}</h2>
      {item.ressources.length ? <div className="tetikasa-resources">{Object.entries(groupedResources).map(([type, resources]) => <section key={type}><h3>{resourceType[type as keyof typeof resourceType]}</h3><ul>{resources.map((resource) => <li key={resource.id}><strong>{resource.description}</strong>{resource.quantite !== null && <span>{format(resource.quantite, 3)}{resource.unite ? ` ${resource.unite}` : ''}</span>}{resource.observation && <small>{resource.observation}</small>}</li>)}</ul></section>)}</div> : <p className="tetikasa-empty">{t('tetikasa.noResource')} {item.ressources_source_soso ? t('tetikasa.sourceResources') : ''}</p>}
    </section>

    <section className="tetikasa-panel"><h2><WalletCards size={20} />{t('tetikasa.budget')}</h2>
      {item.budget.length ? <><div className="tetikasa-budget-wrap"><table><thead><tr><th>{t('tetikasa.designation')}</th><th>{t('tetikasa.quantity')}</th><th>{t('tetikasa.unitPrice')}</th><th>{t('tetikasa.subtotal')}</th></tr></thead><tbody>{item.budget.map((line) => <tr key={line.id}><td>{line.designation}</td><td>{format(line.quantite, 3)}</td><td>{money(line.prix_unitaire_estime, item.devise)}</td><td>{money(number(line.quantite) * number(line.prix_unitaire_estime), item.devise)}</td></tr>)}</tbody></table></div><footer className="tetikasa-budget-total"><span>{t('tetikasa.total')}</span><strong>{money(item.total_budget_calcule, item.devise)}</strong></footer></> : <p className="tetikasa-empty">{t('tetikasa.noBudget')}</p>}
    </section>

    <section className="tetikasa-panel"><h2><Wrench size={20} />{t('tetikasa.history')}</h2>
      {item.historique.length ? <ol className="tetikasa-history">{item.historique.map((event) => <li key={event.id}><strong>{event.action === 'CREATION_DRAFT' ? t('tetikasa.historyCreated') : event.action === 'MODIFICATION_DRAFT' ? t('tetikasa.historyModified') : event.action}</strong>{event.commentaire && <p>{event.commentaire}</p>}<small>{personName(event.acteur)} · {dateTime(event.date_creation)}</small></li>)}</ol> : <p className="tetikasa-empty">{t('tetikasa.noHistory')}</p>}
    </section>

    {item.id_soso_kevitra_source && <Link className="tetikasa-source" to={`/soso-kevitra/${item.id_soso_kevitra_source}`}>{t('tetikasa.sourceSuggestion')}</Link>}
  </main>
}
