import { useEffect, useMemo, useState } from 'react'
import { Ban, Pencil, Search, ShieldCheck, UserRoundCheck, X } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { getUtilisateurs, updateUtilisateurRole, updateUtilisateurStatut, type Utilisateur } from '../../api/utilisateurs'
import { useAuth } from '../../hooks/useAuth'
import { useLatestRequest } from '../../hooks/useLatestRequest'
import './UtilisateursPage.css'

const roles: Utilisateur['role']['code'][] = ['MEMBRE', 'PASTEUR', 'BUREAU_ZANAKA_AMPIELEZANA', 'ADMIN']
const roleLabel = (code: Utilisateur['role']['code']) => code === 'BUREAU_ZANAKA_AMPIELEZANA' ? 'Bureau Zanaka Ampielezana' : code === 'PASTEUR' ? 'Pasteur' : code
const label = (utilisateur: Utilisateur) => [utilisateur.personne.prenom, utilisateur.personne.nom].filter(Boolean).join(' ')

export function UtilisateursPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Utilisateur[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState<Utilisateur | null>(null)
  const [selectedStatut, setSelectedStatut] = useState<Utilisateur | null>(null)
  const [role, setRole] = useState<Utilisateur['role']['code']>('MEMBRE')
  const [busy, setBusy] = useState(false)
  const { startRequest, isCurrentRequest } = useLatestRequest()

  const load = async () => {
    const request = startRequest()
    if (isCurrentRequest(request)) { setLoading(true); setError('') }
    try { const response = await getUtilisateurs(); if (isCurrentRequest(request)) setItems(response.data ?? []) }
    catch (caught) { if (isCurrentRequest(request)) setError(caught instanceof ApiError ? caught.message : 'Impossible de charger les utilisateurs.') }
    finally { if (isCurrentRequest(request)) setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return items
    return items.filter((item) => [item.personne.nom, item.personne.prenom, item.contact.email, item.contact.telephone].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(needle)))
  }, [items, query])

  const saveRole = async () => {
    if (!selectedRole) return
    setBusy(true); setError('')
    try { const response = await updateUtilisateurRole(selectedRole.id, role); const request = startRequest(); if (isCurrentRequest(request) && response.data) setItems((current) => current.map((item) => item.id === response.data.id ? response.data : item)); setSelectedRole(null) }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Impossible de modifier le rôle.') }
    finally { setBusy(false) }
  }
  const saveStatut = async () => {
    if (!selectedStatut) return
    setBusy(true); setError('')
    const next = selectedStatut.statut.code === 'ACTIF' ? 'SUSPENDU' : 'ACTIF'
    try { const response = await updateUtilisateurStatut(selectedStatut.id, next); const request = startRequest(); if (isCurrentRequest(request) && response.data) setItems((current) => current.map((item) => item.id === response.data.id ? response.data : item)); setSelectedStatut(null) }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Impossible de modifier le statut.') }
    finally { setBusy(false) }
  }

  return <section className="utilisateurs-page">
    <header className="admin-page-heading"><div><h2>Gestion des utilisateurs</h2><span>Gérez les accès et les rôles des utilisateurs.</span></div></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="utilisateurs-card">
      <label className="utilisateurs-search"><Search size={17}/><span className="sr-only">Rechercher un utilisateur</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par nom ou prénom..." /></label>
      {loading ? <p className="admin-state">Chargement…</p> : <div className="utilisateurs-table-wrap"><table><thead><tr><th>Utilisateur</th><th>Contact</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{visible.map((item) => {
        const self = item.id === user?.compte.id
        const contact = [item.contact.email, item.contact.telephone].filter(Boolean).join(' · ') || '—'
        return <tr key={item.id}><td><strong>{label(item)}</strong>{item.personne.nom_usage && <small>{item.personne.nom_usage}</small>}</td><td>{contact}</td><td><span className={'utilisateur-badge role-' + item.role.code.toLowerCase()}>{roleLabel(item.role.code)}</span></td><td><span className={'utilisateur-badge statut-' + item.statut.code.toLowerCase()}>{item.statut.code}</span></td><td><div className="utilisateurs-actions"><button type="button" disabled={self} title={self ? 'Votre compte ne peut pas être modifié ici.' : 'Modifier le rôle'} onClick={() => { setRole(item.role.code); setSelectedRole(item) }}><Pencil size={15}/></button><button type="button" disabled={self} className={item.statut.code === 'ACTIF' ? 'danger' : 'success'} title={item.statut.code === 'ACTIF' ? 'Désactiver' : 'Activer'} onClick={() => setSelectedStatut(item)}>{item.statut.code === 'ACTIF' ? <Ban size={15}/> : <UserRoundCheck size={15}/>}</button></div></td></tr>
      })}</tbody></table>{!visible.length && <p className="admin-state">Aucun utilisateur trouvé.</p>}</div>}
    </section>
    {selectedRole && <div className="utilisateurs-modal"><section><button className="utilisateurs-close" type="button" onClick={() => setSelectedRole(null)}><X size={18}/></button><h3>Modifier le rôle</h3><p><strong>Utilisateur</strong><br/>{label(selectedRole)}</p><p><strong>Rôle actuel</strong><br/>{roleLabel(selectedRole.role.code)}</p><label>Nouveau rôle<select value={role} onChange={(event) => setRole(event.target.value as Utilisateur['role']['code'])}>{roles.map((code) => <option key={code} value={code}>{roleLabel(code)}</option>)}</select></label><footer><button type="button" onClick={() => setSelectedRole(null)}>Annuler</button><button type="button" className="primary" disabled={busy} onClick={() => void saveRole()}>Enregistrer</button></footer></section></div>}
    {selectedStatut && <div className="utilisateurs-modal"><section className="utilisateurs-confirm"><div className={selectedStatut.statut.code === 'ACTIF' ? 'confirm-icon danger' : 'confirm-icon success'}>{selectedStatut.statut.code === 'ACTIF' ? <Ban size={24}/> : <ShieldCheck size={24}/>}</div><h3>{selectedStatut.statut.code === 'ACTIF' ? 'Désactiver ce compte ?' : 'Activer ce compte ?'}</h3><p>{selectedStatut.statut.code === 'ACTIF' ? 'Cet utilisateur ne pourra plus accéder à l’application.' : 'Cet utilisateur pourra à nouveau accéder à l’application.'}</p><footer><button type="button" onClick={() => setSelectedStatut(null)}>Annuler</button><button type="button" className={selectedStatut.statut.code === 'ACTIF' ? 'danger-primary' : 'primary'} disabled={busy} onClick={() => void saveStatut()}>{selectedStatut.statut.code === 'ACTIF' ? 'Désactiver' : 'Activer'}</button></footer></section></div>}
  </section>
}
