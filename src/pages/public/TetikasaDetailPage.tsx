import { useEffect, useState } from 'react'
import { CalendarDays, ClipboardList, FileText, MapPin, Package, Pencil, Target, Users, WalletCards, Wrench } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getTetikasa } from '../../api/tetikasa'
import { ApiError } from '../../api/apiClient'
import { useAuth } from '../../hooks/useAuth'
import type { TetikasaDetail, TetikasaPerson } from '../../types/tetikasa'
import './Tetikasa.css'

const personName = (person: TetikasaPerson) => [person.nom, person.prenom].filter(Boolean).join(' ') || '—'
const civilDate = (value: string | null) => value || 'Non renseignée'
const dateTime = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const number = (value: string | number | null) => Number(String(value ?? 0).replace(',', '.'))
const money = (value: string | number, devise: string) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(number(value)).replace(/[\u00a0\u202f]/g, ' ')} ${devise === 'MGA' ? 'Ar' : devise}`
const quantity = (value: string | number | null) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(number(value)).replace(/[\u00a0\u202f]/g, ' ')
const resourceType: Record<TetikasaDetail['ressources'][number]['type_ressource'], string> = {
  OLONA: 'Personnes', FAHAIZA_MANAO: 'Compétences', FITAOVANA_ZAVATRA: 'Matériel / objets',
  FITATERANA: 'Transport', TOERANA: 'Lieu', HAFA: 'Autres',
}

function TextCard({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return <section className="tetikasa-text-card"><Icon aria-hidden="true" size={20} /><div><h2>{title}</h2><p>{children}</p></div></section>
}

export function TetikasaDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const [item, setItem] = useState<TetikasaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void getTetikasa(id).then((response) => {
      if (active) setItem(response.data ?? null)
    }).catch((reason: unknown) => {
      if (!active) return
      setError(reason instanceof ApiError ? reason.message : 'Impossible de charger le Drafitra.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, location.key])

  if (loading) return <p className="auth-loading">Chargement du Drafitra…</p>
  if (!item) return <section className="tetikasa-page"><Link to="/soso-kevitra">← Retour aux suggestions</Link><p className="form-error">{error || 'Drafitra introuvable.'}</p></section>

  const canEdit = user?.compte.role === 'ADMIN' || user?.compte.role === 'PASTEUR'
  const responsables = item.responsables.filter((row) => row.type_responsabilite === 'ASSOCIE')
  const principal = item.responsables.find((row) => row.type_responsabilite === 'PRINCIPAL')
  const personsById = new Map(item.responsables.map((row) => [row.personne.id, row.personne]))
  const groupedResources = item.ressources.reduce<Record<string, TetikasaDetail['ressources']>>((groups, resource) => {
    ;(groups[resource.type_ressource] ??= []).push(resource)
    return groups
  }, {})

  const displayLocation = item.lieu?.trim() || (item.lieu_non_defini ? 'Lieu à définir' : 'Non renseigné')
  return <main className="tetikasa-page">
    <Link className="tetikasa-back" to="/soso-kevitra">← Retour aux suggestions</Link>
    <header className="tetikasa-head">
      <div><span className="tetikasa-status">{item.statut.code}</span><h1>{item.titre || 'Drafitra sans titre'}</h1><p>Créé par {personName(item.created_by)} · {dateTime(item.date_creation)}</p></div>
      {canEdit && item.statut.code === 'DRAFITRA' && <Link className="primary" to={`/tetikasa/${id}/modifier`}><Pencil size={17} />Modifier le Drafitra</Link>}
    </header>

    {typeof location.state === 'object' && location.state !== null && 'message' in location.state && typeof location.state.message === 'string' && <p className="tetikasa-confirmation" role="status">{location.state.message}</p>}
    <section className="tetikasa-overview">
      <TextCard icon={FileText} title="Description">{item.description || 'Non renseignée'}</TextCard>
      <TextCard icon={Target} title="Objectif">{item.objectif || 'Non renseigné'}</TextCard>
      <TextCard icon={Users} title="Bénéficiaires">{item.beneficiaires || 'Non renseignés'}</TextCard>
      <TextCard icon={MapPin} title="Lieu">{displayLocation}</TextCard>
      <TextCard icon={CalendarDays} title="Période prévisionnelle">{civilDate(item.date_debut_prevue)} — {civilDate(item.date_fin_prevue)}</TextCard>
      <TextCard icon={ClipboardList} title="Raison">{item.raison || 'Non renseignée'}</TextCard>
    </section>

    <section className="tetikasa-panel"><h2><Users size={20} />Responsables</h2>
      {principal ? <div className="tetikasa-principal"><strong>Responsable principal</strong><span>{personName(principal.personne)}</span></div> : <p className="tetikasa-empty">Aucun responsable principal défini.</p>}
      {responsables.length > 0 && <ul className="tetikasa-people">{responsables.map((row) => <li key={row.id}>{personName(row.personne)}</li>)}</ul>}
    </section>

    <section className="tetikasa-panel"><h2><ClipboardList size={20} />Actions prévues</h2>
      {item.actions.length ? <ol className="tetikasa-actions">{item.actions.map((action) => <li key={action.id}><span>{String(action.ordre).padStart(2, '0')}</span><div><strong>{action.titre}</strong>{action.description && <p>{action.description}</p>}{action.id_responsable && <small>Responsable : {personsById.get(action.id_responsable) ? personName(personsById.get(action.id_responsable)!) : 'Non renseigné'}</small>}{(action.date_debut_prevue || action.date_fin_prevue) && <small>Dates : {civilDate(action.date_debut_prevue)} — {civilDate(action.date_fin_prevue)}</small>}</div></li>)}</ol> : <p className="tetikasa-empty">Aucune action prévue.</p>}
    </section>

    <section className="tetikasa-panel"><h2><Package size={20} />Ressources</h2>
      {item.ressources.length ? <div className="tetikasa-resources">{Object.entries(groupedResources).map(([type, resources]) => <section key={type}><h3>{resourceType[type as keyof typeof resourceType]}</h3><ul>{resources.map((resource) => <li key={resource.id}><strong>{resource.description}</strong>{resource.quantite !== null && <span>{quantity(resource.quantite)}{resource.unite ? ` ${resource.unite}` : ''}</span>}{resource.observation && <small>{resource.observation}</small>}</li>)}</ul></section>)}</div> : <p className="tetikasa-empty">Aucune ressource structurée. {item.ressources_source_soso ? 'Les ressources source restent consultables dans la suggestion.' : ''}</p>}
    </section>

    <section className="tetikasa-panel"><h2><WalletCards size={20} />Budget prévisionnel</h2>
      {item.budget.length ? <><div className="tetikasa-budget-wrap"><table><thead><tr><th>Désignation</th><th>Quantité</th><th>Prix unitaire</th><th>Sous-total</th></tr></thead><tbody>{item.budget.map((line) => <tr key={line.id}><td>{line.designation}</td><td>{quantity(line.quantite)}</td><td>{money(line.prix_unitaire_estime, item.devise)}</td><td>{money(number(line.quantite) * number(line.prix_unitaire_estime), item.devise)}</td></tr>)}</tbody></table></div><footer className="tetikasa-budget-total"><span>Total prévisionnel</span><strong>{money(item.total_budget_calcule, item.devise)}</strong></footer></> : <p className="tetikasa-empty">Aucune ligne budgétaire.</p>}
    </section>

    <section className="tetikasa-panel"><h2><Wrench size={20} />Historique</h2>
      {item.historique.length ? <ol className="tetikasa-history">{item.historique.map((event) => <li key={event.id}><strong>{event.action === 'CREATION_DRAFT' ? 'Création du Drafitra' : event.action === 'MODIFICATION_DRAFT' ? 'Modification du Drafitra' : event.action}</strong>{event.commentaire && <p>{event.commentaire}</p>}<small>{personName(event.acteur)} · {dateTime(event.date_creation)}</small></li>)}</ol> : <p className="tetikasa-empty">Aucun événement.</p>}
    </section>

    {item.id_soso_kevitra_source && <Link className="tetikasa-source" to={`/soso-kevitra/${item.id_soso_kevitra_source}`}>Voir le Soso-kevitra source</Link>}
  </main>
}
