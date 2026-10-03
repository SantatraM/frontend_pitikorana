import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, Check, Heart, Lock, MapPin, Network, ShieldCheck, User, Users, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { getActivites, getCentresInteret, getCompetences } from '../../api/adminReferentiels'
import { getDemandeInscription, refuserDemandeInscription, validerDemandeInscription } from '../../api/demandesInscription'
import { getProfilPersonne } from '../../api/personnes'
import { getElements, getLiensFalimanjaka, getSexes, getStatuts, getVilles, type ElementReference, type LienReference, type SexeReference, type StatutReference, type VilleReference } from '../../api/referentielsInscription'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import type { Activite, CentreInteret, Competence } from '../../types/adminReferentiels'
import type { AdminDemandeInscription, StatutDemandeInscription } from '../../types/demandeInscription'
import type { ProfilPersonne } from '../../types/profil'

type ConfirmationAction = 'valider' | 'refuser' | null
type References = { sexes: SexeReference[]; statuts: StatutReference[]; liens: LienReference[]; elements: ElementReference[]; villes: VilleReference[]; activites: Activite[]; competences: Competence[]; centres: CentreInteret[] }
const emptyReferences: References = { sexes: [], statuts: [], liens: [], elements: [], villes: [], activites: [], competences: [], centres: [] }

function statusText(status: StatutDemandeInscription, t: ReturnType<typeof useLanguage>['t']) { return status === 'EN_ATTENTE' ? t('admin.statusPending') : status === 'VALIDEE' ? t('admin.statusApproved') : status === 'REFUSEE' ? t('admin.statusRejected') : t('admin.statusCancelled') }
function refLabel(value: { traductions?: Array<{ libelle: string; langue?: { code: string } | null }>; nom?: string } | undefined, language: string) { return value?.traductions?.find((item) => item.langue?.code === language)?.libelle ?? value?.traductions?.[0]?.libelle ?? value?.nom ?? null }
function blank(value: string | number | null | undefined) { return value === null || value === undefined || value === '' ? null : String(value) }
function Section({ number, title, icon, children }: { number: string; title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="request-detail-section"><h3><span className="request-detail-icon">{icon}</span><b>{number}</b>{title}</h3>{children}</section> }
function DetailLine({ label, value }: { label: string; value: string | number | null | undefined }) { const shown = blank(value); return shown ? <div className="request-detail-line"><span>{label}</span><strong>{shown}</strong></div> : null }
function DeclaredOriginLine({ label, level, elements, t }: { label: string; level: { id: string | null; nom_propose: string | null }; elements: ElementReference[]; t: ReturnType<typeof useLanguage>['t'] }) { const value = level.nom_propose ?? elements.find((item) => item.id === level.id)?.nom; return value ? <div className="request-detail-line"><span>{label} · {level.id ? t('registration.newForm.existing') : t('registration.newForm.new')}</span><strong>{value}</strong></div> : null }
export function DemandeInscriptionDetailPage() {
  const { id = '' } = useParams()
  const { language, t } = useLanguage()
  const { user } = useAuth()
  const isAdmin = user?.compte.role === 'ADMIN'
  const [demande, setDemande] = useState<AdminDemandeInscription | null>(null)
  const [profile, setProfile] = useState<ProfilPersonne | null>(null)
  const [references, setReferences] = useState<References>(emptyReferences)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [referencesLoading, setReferencesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [referencesError, setReferencesError] = useState<string | null>(null)
  const [role, setRole] = useState<'MEMBRE' | 'ADMIN' | 'PASTEUR' | 'BUREAU_ZANAKA_AMPIELEZANA'>('MEMBRE')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationAction>(null)

  const load = async () => {
    setLoading(true); setError(null); setProfile(null); setProfileError(null); setReferences(emptyReferences); setReferencesError(null)
    try {
      const response = await getDemandeInscription(id)
      const request = response.data ?? null
      setDemande(request)
      if (!request) return
      if (request.id_personne) {
        setProfileLoading(true)
        try { const result = await getProfilPersonne(request.id_personne, language); setProfile(result.data ?? null) } catch (caught) { setProfileError(caught instanceof ApiError ? caught.message : t('admin.detailProfileError')) } finally { setProfileLoading(false) }
      } else {
        setReferencesLoading(true)
        try {
          const [sexes, statuts, liens, elements, villes, activites, competences, centres] = await Promise.all([getSexes(), getStatuts(), getLiensFalimanjaka(), getElements(), getVilles(), getActivites(), getCompetences(), getCentresInteret()])
          setReferences({ sexes: sexes.data ?? [], statuts: statuts.data ?? [], liens: liens.data ?? [], elements: elements.data ?? [], villes: villes.data ?? [], activites: activites.data ?? [], competences: competences.data ?? [], centres: centres.data ?? [] })
        } catch (caught) { setReferencesError(caught instanceof ApiError ? caught.message : t('admin.referencesLoadError')) } finally { setReferencesLoading(false) }
      }
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('admin.requestLoadError')) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [id, language])

  async function treat(action: Exclude<ConfirmationAction, null>) {
    if (!demande || busy) return
    setBusy(true); setError(null)
    try {
      if (action === 'valider') await validerDemandeInscription(id, { role, commentaire_admin: comment || null })
      else await refuserDemandeInscription(id, { commentaire_admin: comment || null })
      setConfirmation(null)
      await load()
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : t('admin.treatmentUnavailable')); await load() } finally { setBusy(false) }
  }

  const family = useMemo(() => {
    const elementId = demande?.donnees.personne?.id_element
    const selected = references.elements.find((item) => item.id === elementId)
    if (!selected) return []
    const lineage: ElementReference[] = [selected]
    let current = selected
    while (current.parent?.id) { const parent = references.elements.find((item) => item.id === current.parent?.id); if (!parent || lineage.some((item) => item.id === parent.id)) break; lineage.unshift(parent); current = parent }
    return lineage
  }, [demande?.donnees.personne?.id_element, references.elements])

  if (loading) return <p className="admin-state">{t('admin.loadingRequest')}</p>
  if (!demande) return <section className="admin-empty"><h2>{t('admin.requestNotFound')}</h2><Link to="/admin/demandes-inscription">{t('admin.backToRequests')}</Link></section>

  const isExisting = Boolean(demande.id_personne)
  const personDraft = demande.donnees.personne
  const declaredOrigin = demande.donnees.origine_declaree
  const current = profile?.personne
  const contact = isExisting ? current?.contact : demande.donnees.contact
  const city = isExisting ? current?.ville : references.villes.find((item) => item.id === personDraft?.id_ville) ?? null
  const sex = isExisting ? current?.sexe?.libelle : refLabel(references.sexes.find((item) => item.id === personDraft?.id_sexe), language)
  const statut = isExisting ? current?.statut?.libelle : refLabel(references.statuts.find((item) => item.id === personDraft?.id_statut), language)
  const lien = isExisting ? current?.lien?.libelle : refLabel(references.liens.find((item) => item.id === personDraft?.id_lien), language)
  const name = isExisting ? [current?.nom, current?.prenom].filter(Boolean).join(' ') : [personDraft?.nom, personDraft?.prenom].filter(Boolean).join(' ')
  const pending = demande.statut.code === 'EN_ATTENTE'
  const format = (value: string) => new Intl.DateTimeFormat(language === 'mg' ? 'mg-MG' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  const privacyLabels: Record<string, string> = { EMAIL: t('registration.newForm.email'), FACEBOOK: t('registration.newForm.facebook'), TELEPHONE: t('registration.newForm.phone'), WHATSAPP: t('registration.newForm.whatsapp'), ADRESSE: t('registration.newForm.address'), PHOTO: t('admin.photo') }
  const activities = isExisting ? profile?.activites ?? [] : (demande.donnees.activites ?? []) as Array<{ id_activite: string; lieu_travail: string | null; etude_en_cours: string | null; formations: string | null; experience_anterieur: string | null; diplome_ou_apprentissage: string | null }>
  const skills = isExisting ? profile?.competences ?? [] : (demande.donnees.competences ?? []) as Array<{ id_competence: string; partageable: boolean }>
  const interests = isExisting ? profile?.centres_interet ?? [] : (demande.donnees.centres_interet ?? []) as Array<{ id_centre_interet: string }>
  const privacy = (demande.donnees as { confidentialite?: Record<string, 'PRIVE' | 'MEMBRES'> }).confidentialite ?? {}

  return <section className="admin-detail-page request-detail-v2">
    <Link className="admin-back-link request-detail-back" to="/admin/demandes-inscription"><ArrowLeft size={17} aria-hidden="true"/>{t('admin.backToRequests')}</Link>
    <header className="request-detail-header"><div><p>{t('admin.detailRequestTitle')}</p><h2>{demande.reference}</h2><span>{format(demande.date_demande)} · {isExisting ? t('admin.existingSheet') : t('admin.newSheet')}</span></div>{demande.photo_temporaire_url && <img className="request-detail-photo" src={demande.photo_temporaire_url} alt="Photo de la demande" />}<span className={`admin-status-badge admin-status-${demande.statut.code}`}>{statusText(demande.statut.code, t)}</span></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    {profileError && <p className="form-error" role="alert">{profileError}</p>}
    {referencesError && <p className="form-error" role="alert">{referencesError}</p>}
    {(profileLoading || referencesLoading) && <p className="request-detail-loading">{profileLoading ? t('admin.detailLoadingProfile') : t('admin.loadingReferences')}</p>}
    <section className="request-detail-hero"><div className="request-detail-avatar"><User size={28} aria-hidden="true"/></div><div><h1>{name || t('admin.requesterUnavailable')}</h1><span className="request-detail-kind">{isExisting ? t('admin.detailExistingProfile') : t('admin.newSheet')}</span><p>{demande.email || t('admin.contactUnavailable')}{demande.telephone ? ` · ${demande.telephone}` : ''}</p></div><code>{demande.reference}</code></section>
    <div className="request-detail-grid">
      <Section number="1" title={t('admin.guidedSituation')} icon={<User size={17} aria-hidden="true"/>}><div className="request-detail-lines"><DetailLine label={t('registration.newForm.name')} value={isExisting ? current?.nom : personDraft?.nom}/><DetailLine label={t('registration.newForm.firstName')} value={isExisting ? current?.prenom : personDraft?.prenom}/><DetailLine label={t('admin.nameUsage')} value={isExisting ? current?.nom_usage : personDraft?.nom_usage}/><DetailLine label={t('registration.newForm.aliases')} value={isExisting ? current?.autres_appellations : personDraft?.autres_appellations}/><DetailLine label={t('registration.newForm.sex')} value={sex}/><DetailLine label={t('registration.newForm.status')} value={statut}/><DetailLine label={t('registration.newForm.birthDate')} value={isExisting ? current?.date_naissance : personDraft?.date_naissance}/><DetailLine label={t('registration.newForm.birthYear')} value={isExisting ? current?.annee_naissance : personDraft?.annee_naissance}/><DetailLine label={t('registration.newForm.birthPlace')} value={isExisting ? current?.lieu_naissance : personDraft?.lieu_naissance}/>{(isExisting ? current?.date_deces : personDraft?.date_deces) && <DetailLine label={t('registration.newForm.deathDate')} value={isExisting ? current?.date_deces : personDraft?.date_deces}/>} {(isExisting ? current?.annee_deces : personDraft?.annee_deces) && <DetailLine label={t('registration.newForm.deathYear')} value={isExisting ? current?.annee_deces : personDraft?.annee_deces}/>}</div></Section>
      <Section number="2" title={t('admin.guidedCoordinates')} icon={<MapPin size={17} aria-hidden="true"/>}><div className="request-detail-lines"><DetailLine label={t('registration.newForm.address')} value={isExisting ? current?.adresse : personDraft?.adresse}/><DetailLine label={t('registration.newForm.city')} value={city?.nom}/><DetailLine label={t('registration.newForm.region')} value={city?.region?.nom}/><DetailLine label={t('registration.newForm.country')} value={city?.region?.pays?.nom}/><DetailLine label={t('registration.newForm.email')} value={isExisting ? current?.contact?.email ?? demande.email : demande.email}/><DetailLine label={t('registration.newForm.phone')} value={isExisting ? current?.contact?.telephone ?? demande.telephone : demande.telephone}/><DetailLine label={t('registration.newForm.whatsapp')} value={contact?.whatsapp}/><DetailLine label={t('registration.newForm.facebook')} value={contact?.facebook}/><DetailLine label={t('registration.newForm.facebookLink')} value={contact?.lien_facebook}/></div></Section>
      <Section number="3" title={declaredOrigin ? t('registration.newForm.declaredOrigin') : t('admin.detailFamily')} icon={<Network size={17} aria-hidden="true"/>}><div className="request-detail-family"><DetailLine label={t('registration.newForm.link')} value={lien}/>{declaredOrigin ? <><DeclaredOriginLine label={t('registration.newForm.razambe')} level={declaredOrigin.razambe} elements={references.elements} t={t}/><DeclaredOriginLine label={t('registration.newForm.taranaka')} level={declaredOrigin.taranaka} elements={references.elements} t={t}/><DeclaredOriginLine label={t('registration.newForm.sampana')} level={declaredOrigin.sampana} elements={references.elements} t={t}/></> : isExisting ? <><DetailLine label={t('registration.newForm.razambe')} value={current?.razambe?.nom}/><DetailLine label={t('registration.newForm.taranaka')} value={current?.taranaka?.nom}/><DetailLine label={t('registration.newForm.sampana')} value={current?.sampana?.nom}/></> : family.length ? family.map((item) => <DetailLine key={item.id} label={item.type_element?.libelle ?? t('admin.attachment')} value={item.nom}/>) : <DetailLine label={t('admin.attachment')} value={references.elements.find((item) => item.id === personDraft?.id_element)?.nom}/>}</div></Section>
      <Section number="4" title={t('admin.activities')} icon={<BriefcaseBusiness size={17} aria-hidden="true"/>}>{activities.length ? <><div className="request-detail-activities-table"><table><thead><tr><th>{t('admin.activities')}</th><th>{t('admin.personEdit.workplace')}</th><th>{t('admin.personEdit.studies')}</th><th>{t('admin.personEdit.training')}</th><th>{t('admin.personEdit.experience')}</th><th>{t('admin.personEdit.diploma')}</th></tr></thead><tbody>{activities.map((item) => { const activity = 'activite' in item && typeof item.activite === 'string' ? item.activite : refLabel(references.activites.find((reference) => reference.id === item.id_activite), language); return <tr key={item.id_activite}><td>{activity ?? '-'}</td><td>{item.lieu_travail ?? '-'}</td><td>{item.etude_en_cours ?? '-'}</td><td>{item.formations ?? '-'}</td><td>{item.experience_anterieur ?? '-'}</td><td>{item.diplome_ou_apprentissage ?? '-'}</td></tr> })}</tbody></table></div><div className="request-detail-activity-cards">{activities.map((item) => { const activity = 'activite' in item && typeof item.activite === 'string' ? item.activite : refLabel(references.activites.find((reference) => reference.id === item.id_activite), language); return <article key={item.id_activite}><strong>{activity ?? '-'}</strong><DetailLine label={t('admin.personEdit.workplace')} value={item.lieu_travail}/><DetailLine label={t('admin.personEdit.studies')} value={item.etude_en_cours}/><DetailLine label={t('admin.personEdit.training')} value={item.formations}/><DetailLine label={t('admin.personEdit.experience')} value={item.experience_anterieur}/><DetailLine label={t('admin.personEdit.diploma')} value={item.diplome_ou_apprentissage}/></article> })}</div></> : <p className="request-detail-empty">{t('admin.detailNoData')}</p>}</Section>
      <Section number="5" title={t('admin.skills')} icon={<ShieldCheck size={17} aria-hidden="true"/>}>{skills.length ? <div className="request-detail-skills">{skills.map((item) => { const label = 'competence' in item && typeof item.competence === 'string' ? item.competence : refLabel(references.competences.find((reference) => reference.id === item.id_competence), language); return <div key={item.id_competence}><strong>{label ?? '-'}</strong><span className={item.partageable ? 'request-detail-shareable yes' : 'request-detail-shareable'}>{item.partageable ? t('admin.personEdit.yes') : t('admin.personEdit.no')}</span></div> })}</div> : <p className="request-detail-empty">{t('admin.detailNoData')}</p>}</Section>
      <Section number="6" title={t('admin.interests')} icon={<Heart size={17} aria-hidden="true"/>}>{interests.length ? <div className="request-detail-interests">{interests.map((item) => { const label = 'centre_interet' in item && typeof item.centre_interet === 'string' ? item.centre_interet : refLabel(references.centres.find((reference) => reference.id === item.id_centre_interet), language); return <span key={item.id_centre_interet}>{label ?? '-'}</span> })}</div> : <p className="request-detail-empty">{t('admin.detailNoData')}</p>}</Section>
      <Section number="7" title={t('admin.detailPrivacy')} icon={<Lock size={17} aria-hidden="true"/>}>{Object.entries(privacy).length ? <div className="request-detail-privacy">{Object.entries(privacy).map(([key, value]) => <div key={key}><span>{privacyLabels[key] ?? key}</span><strong>{value === 'PRIVE' ? t('registration.newForm.private') : t('registration.newForm.members')}</strong></div>)}</div> : <p className="request-detail-empty">{t('admin.detailNoData')}</p>}</Section>
      <section className="request-detail-treatment"><h3><Users size={17} aria-hidden="true"/>{t('admin.processing')}</h3>{pending ? <><label>{t('admin.accountRole')}<select value={role} onChange={(event) => setRole(event.target.value as 'MEMBRE' | 'ADMIN')}><option value="MEMBRE">{t('admin.member')}</option>{isAdmin && <><option value="ADMIN">{t('admin.adminRole')}</option><option value="PASTEUR">Pasteur</option><option value="BUREAU_ZANAKA_AMPIELEZANA">Bureau Zanaka Ampielezana</option></>}</select></label><label>{t('admin.optionalComment')}<textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label><div><button type="button" className="request-detail-reject" disabled={busy} onClick={() => setConfirmation('refuser')}><X size={16} aria-hidden="true"/>{busy && confirmation === 'refuser' ? t('admin.detailProcessing') : t('admin.reject')}</button><button type="button" disabled={busy} onClick={() => setConfirmation('valider')}><Check size={16} aria-hidden="true"/>{busy && confirmation === 'valider' ? t('admin.detailProcessing') : t('admin.validate')}</button></div></> : <div className="request-detail-treatment-read"><DetailLine label={t('admin.status')} value={statusText(demande.statut.code, t)}/>{demande.date_traitement && <DetailLine label={t('admin.processedOn')} value={format(demande.date_traitement)}/>} {demande.role_attribue && <DetailLine label={t('admin.assignedRole')} value={demande.role_attribue.code === 'ADMIN' ? t('admin.adminRole') : demande.role_attribue.code === 'PASTEUR' ? 'Pasteur' : demande.role_attribue.code === 'BUREAU_ZANAKA_AMPIELEZANA' ? 'Bureau Zanaka Ampielezana' : t('admin.member')}/>} {demande.commentaire_admin && <DetailLine label={t('admin.comment')} value={demande.commentaire_admin}/>}</div>}</section>
    </div>
    {confirmation && <div className="request-detail-confirm" role="dialog" aria-modal="true" aria-labelledby="request-confirm-title"><div><button type="button" aria-label={t('admin.cancel')} onClick={() => setConfirmation(null)}><X size={18} aria-hidden="true"/></button><h2 id="request-confirm-title">{confirmation === 'valider' ? t('admin.detailConfirmValidate') : t('admin.detailConfirmReject')}</h2><p>{confirmation === 'valider' ? t('admin.confirmValidateMember') : t('admin.confirmReject')}</p><footer><button type="button" onClick={() => setConfirmation(null)} disabled={busy}>{t('admin.cancel')}</button><button type="button" onClick={() => void treat(confirmation)} disabled={busy}>{confirmation === 'valider' ? t('admin.validate') : t('admin.reject')}</button></footer></div></div>}
  </section>
}