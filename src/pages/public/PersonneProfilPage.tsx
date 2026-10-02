import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  ChartNoAxesColumnIncreasing,
  Eye,
  GitBranch,
  Heart,
  Link as LinkIcon,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Network,
  Pencil,
  Phone,
  UserRound,
  Users,
} from 'lucide-react'
import { getPreferencesConfidentialitePersonne } from '../../api/confidentialitePersonne'
import { getProfilPersonne } from '../../api/personnes'
import { PersonneProfileContent } from '../../components/personne/PersonneProfileContent'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import type { PreferencesConfidentialitePersonne } from '../../types/confidentialitePersonne'
import type { ProfilPersonne } from '../../types/profil'
import { getRelationDisplayLabel } from '../../utils/relationDisplay'

type DetailProps = { label: string; value: string | number | null | undefined; className?: string }

function Detail({ label, value, className }: DetailProps) {
  return (
    <div className={`person-profile-detail${className ? ` ${className}` : ''}`}>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  )
}

type SectionTitleProps = {
  number?: string
  title: string
  icon: typeof UserRound
}

function SectionTitle({ number, title, icon: Icon }: SectionTitleProps) {
  return (
    <div className="person-profile-section-title">
      <span className="person-profile-section-icon"><Icon size={19} aria-hidden="true" /></span>
      {number && <span className="person-profile-section-number">{number}</span>}
      <h2>{title}</h2>
    </div>
  )
}

export function PersonneProfilPage() {
  const { id = '' } = useParams()
  const { user, isLoading } = useAuth()
  const { t, language } = useLanguage()
  const [profile, setProfile] = useState<ProfilPersonne | null>(null)
  const [privacy, setPrivacy] = useState<PreferencesConfidentialitePersonne | null>(null)

  useEffect(() => {
    if (isLoading) return
    let active = true
    setProfile(null)
    setPrivacy(null)

    void getProfilPersonne(id, language)
      .then(async (profileResponse) => {
        if (!active) return

        const nextProfile = profileResponse.data ?? null
        setProfile(nextProfile)

        if (nextProfile?.can_manage !== true) return

        try {
          const privacyResponse = await getPreferencesConfidentialitePersonne(id)
          if (active) setPrivacy(privacyResponse.data ?? null)
        } catch {
          if (active) setPrivacy(null)
        }
      })
      .catch(() => {
        if (active) {
          setProfile(null)
          setPrivacy(null)
        }
      })

    return () => { active = false }
  }, [id, language, isLoading])

  if (!profile) return <p className="auth-loading">{t('registration.newForm.sending')}</p>
  if (typeof window !== 'undefined') {
    const isOwnMemberProfile = user?.compte.role === 'MEMBRE' && user.personne.id === profile.personne.id
    const canManage = profile.can_manage === true
    return <><Link className="person-profile-back" to="/personnes">← {t('admin.newPersonBack')}</Link><PersonneProfileContent profile={profile} privacy={privacy} showConfidentiality={canManage && privacy !== null} showEdit={canManage} editTo={isOwnMemberProfile ? '/membre/profil/modifier' : undefined} editLabel={isOwnMemberProfile ? t('member.editProfile') : undefined} /></>
  }

  const personne = profile.personne
  const contact = personne.contact
  const photo = personne.photo?.url_photo
  const location = [personne.ville?.nom, personne.ville?.region?.nom].filter(Boolean).join(', ') || '—'
  const initials = `${personne.nom[0] ?? ''}${personne.prenom?.[0] ?? ''}`
  const isDeceased = personne.statut?.libelle?.toUpperCase().includes('DECEDE')

  const visiblePrivacy = privacy && [
    { key: 'email', label: t('registration.newForm.email'), Icon: Mail },
    { key: 'telephone', label: t('registration.newForm.phone'), Icon: Phone },
    { key: 'adresse', label: t('registration.newForm.address'), Icon: MapPin },
    { key: 'facebook', label: t('registration.newForm.facebook'), Icon: UserRound },
    { key: 'whatsapp', label: t('registration.newForm.whatsapp'), Icon: MessageCircle },
    { key: 'photo', label: t('admin.photo'), Icon: Camera },
  ] as const

  return (
    <section className="person-profile-page">
      <Link className="person-profile-back" to="/personnes">← {t('admin.newPersonBack')}</Link>

      <header className="person-profile-hero">
        <div className="person-profile-avatar">
          {photo ? <img src={photo} alt="" /> : <span>{initials}</span>}
        </div>

        <div className="person-profile-hero-content">
          <div className="person-profile-hero-topline">
            <div className="person-profile-hero-title">
              <h1>{personne.nom} {personne.prenom ?? ''}</h1>
              <span className={`person-profile-status${isDeceased ? ' is-deceased' : ''}`}>{personne.statut?.libelle ?? '—'}</span>
            </div>
            <Link className="person-profile-edit" to={`/personnes/${personne.id}/modifier`}>
              <Pencil size={16} aria-hidden="true" />
              {t('admin.edit')}
            </Link>
          </div>

          <div className="person-profile-meta">
            <span><CalendarDays size={17} aria-hidden="true" />{personne.date_naissance ?? personne.annee_naissance ?? '—'}</span>
            <span><MapPin size={17} aria-hidden="true" />{location}</span>
            <span><Users size={17} aria-hidden="true" />{personne.lien?.libelle ?? '—'}</span>
          </div>

          <div className="person-profile-family-summary">
            <div><Network size={23} aria-hidden="true" /><span><small>{t('admin.razambe')}</small><strong>{personne.razambe?.nom ?? '—'}</strong></span></div>
            <div><Users size={23} aria-hidden="true" /><span><small>{t('admin.taranaka')}</small><strong>{personne.taranaka?.nom ?? '—'}</strong></span></div>
            <div><GitBranch size={23} aria-hidden="true" /><span><small>{t('admin.sampana')}</small><strong>{personne.sampana?.nom ?? '—'}</strong></span></div>
          </div>
        </div>
      </header>

      <div className="person-profile-layout">
        <section className="person-profile-card">
          <SectionTitle number="1" title={t('admin.guidedSituation')} icon={UserRound} />
          <div className="person-profile-field-grid">
            <Detail label={t('registration.newForm.name')} value={personne.nom} />
            <Detail label={t('registration.newForm.firstName')} value={personne.prenom} />
            <Detail label={t('registration.newForm.usageName')} value={personne.nom_usage} />
            <Detail label={t('registration.newForm.aliases')} value={personne.autres_appellations} />
            <Detail label={t('registration.newForm.sex')} value={personne.sexe?.libelle} />
            <div className="person-profile-detail"><span>{t('registration.newForm.status')}</span><strong><span className={`person-profile-status${isDeceased ? ' is-deceased' : ''}`}>{personne.statut?.libelle ?? '—'}</span></strong></div>
            <Detail label={t('registration.newForm.birthDate')} value={personne.date_naissance} />
            <Detail label={t('registration.newForm.birthYear')} value={personne.annee_naissance} />
            <Detail label={t('registration.newForm.birthPlace')} value={personne.lieu_naissance} />
            {isDeceased && <Detail label={t('registration.newForm.deathDate')} value={personne.date_deces} />}
            {isDeceased && <Detail label={t('registration.newForm.deathYear')} value={personne.annee_deces} />}
          </div>
        </section>

        <section className="person-profile-card">
          <SectionTitle number="2" title={t('admin.guidedCoordinates')} icon={MapPin} />
          <div className="person-profile-coordinates">
            <div className="person-profile-address-list">
              <Detail label={t('registration.newForm.address')} value={personne.adresse} />
              <Detail label={t('registration.newForm.city')} value={personne.ville?.nom} />
              <Detail label={t('registration.newForm.region')} value={personne.ville?.region?.nom} />
              <Detail label={t('registration.newForm.country')} value={personne.ville?.region?.pays?.nom} />
              <div className="person-profile-detail"><span>{t('registration.newForm.link')}</span><strong><span className="person-profile-link-badge">{personne.lien?.libelle ?? '—'}</span></strong></div>
            </div>
            <div className="person-profile-contact-list">
              <div><Phone size={17} aria-hidden="true" /><span>{t('registration.newForm.phone')}</span><strong>{contact?.telephone ?? '—'}</strong></div>
              <div><MessageCircle size={17} aria-hidden="true" /><span>{t('registration.newForm.whatsapp')}</span><strong>{contact?.whatsapp ?? '—'}</strong></div>
              <div><Mail size={17} aria-hidden="true" /><span>{t('registration.newForm.email')}</span><strong>{contact?.email ?? '—'}</strong></div>
              <div><UserRound size={17} aria-hidden="true" /><span>{t('registration.newForm.facebook')}</span><strong>{contact?.facebook ?? '—'}</strong></div>
              <div><LinkIcon size={17} aria-hidden="true" /><span>{t('registration.newForm.facebookLink')}</span>{contact?.lien_facebook ? <a href={contact.lien_facebook} target="_blank" rel="noreferrer">{contact.lien_facebook}</a> : <strong>—</strong>}</div>
            </div>
          </div>
        </section>

        <section className="person-profile-card">
          <SectionTitle number="3" title={t('admin.guidedFamily')} icon={Network} />
          <div className="person-profile-family-list">
            <Detail label={t('admin.razambe')} value={personne.razambe?.nom} />
            <Detail label={t('admin.taranaka')} value={personne.taranaka?.nom} />
            <Detail label={t('admin.sampana')} value={personne.sampana?.nom} />
          </div>
        </section>

        <section className="person-profile-card">
          <SectionTitle title={t('admin.relationTitle')} icon={Users} />
          {profile.relations.length === 0 ? (
            <div className="person-profile-empty-relations"><Users size={22} aria-hidden="true" /><span>{t('admin.noRelation')}</span></div>
          ) : (
            <div className="person-profile-table-wrap">
              <table className="person-profile-table person-profile-relations-table">
                <thead><tr><th>{t('admin.relationType')}</th><th>{t('admin.relationPerson')}</th><th aria-label="Actions" /></tr></thead>
                <tbody>{profile.relations.map((relation) => {
                  const linked = relation.personne_cible ?? relation.personne_source
                  return <tr key={relation.id}><td>{getRelationDisplayLabel(t, relation.type_relation?.code, linked?.sexe)}</td><td>{linked ? `${linked.nom} ${linked.prenom ?? ''}` : '—'}</td><td>{linked && <Link className="person-profile-eye" aria-label="Voir la fiche" to={`/personnes/${linked.id}`}><Eye size={16} aria-hidden="true" /></Link>}</td></tr>
                })}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="person-profile-card person-profile-wide">
          <SectionTitle number="4" title={t('registration.newForm.activities')} icon={BriefcaseBusiness} />
          {profile.activites.length === 0 ? <p className="person-profile-empty">—</p> : <>
            <div className="person-profile-table-wrap person-profile-activity-desktop">
              <table className="person-profile-table">
                <thead><tr><th>{t('registration.newForm.activities')}</th><th>{t('registration.newForm.workPlace')}</th><th>{t('registration.newForm.studies')}</th><th>{t('registration.newForm.training')}</th><th>{t('registration.newForm.experience')}</th><th>{t('registration.newForm.diploma')}</th></tr></thead>
                <tbody>{profile.activites.map((activity) => <tr key={activity.id}><td>{activity.activite ?? '—'}</td><td>{activity.lieu_travail ?? '—'}</td><td>{activity.etude_en_cours ?? '—'}</td><td>{activity.formations ?? '—'}</td><td>{activity.experience_anterieur ?? '—'}</td><td>{activity.diplome_ou_apprentissage ?? '—'}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="person-profile-activity-mobile">{profile.activites.map((activity) => <article key={activity.id}><strong>{activity.activite ?? '—'}</strong><Detail label={t('registration.newForm.workPlace')} value={activity.lieu_travail} /><Detail label={t('registration.newForm.studies')} value={activity.etude_en_cours} /><Detail label={t('registration.newForm.training')} value={activity.formations} /><Detail label={t('registration.newForm.experience')} value={activity.experience_anterieur} /><Detail label={t('registration.newForm.diploma')} value={activity.diplome_ou_apprentissage} /></article>)}</div>
          </>}
        </section>

        <section className="person-profile-card">
          <SectionTitle number="5" title={t('registration.newForm.competences')} icon={ChartNoAxesColumnIncreasing} />
          <div className="person-profile-table-wrap">
            <table className="person-profile-table person-profile-competence-table"><thead><tr><th>{t('registration.newForm.competences')}</th><th>{t('registration.newForm.shareable')}</th></tr></thead><tbody>{profile.competences.map((competence) => <tr key={competence.id}><td>{competence.competence ?? '—'}</td><td><span className={competence.partageable ? 'person-profile-yes' : 'person-profile-no'}>{competence.partageable ? (language === 'mg' ? 'Eny' : 'Oui') : (language === 'mg' ? 'Tsia' : 'Non')}</span></td></tr>)}</tbody></table>
          </div>
        </section>

        <section className="person-profile-card">
          <SectionTitle number="6" title={t('registration.newForm.interests')} icon={Heart} />
          <div className="person-profile-chips">{profile.centres_interet.map((interest) => <span key={interest.id}>{interest.centre_interet ?? '—'}</span>)}</div>
        </section>

        <section className="person-profile-card person-profile-wide">
          <SectionTitle number="7" title={t('admin.guidedPrivacyValidation')} icon={Lock} />
          {visiblePrivacy && <div className="person-profile-privacy-grid">{visiblePrivacy.map(({ key, label, Icon }) => {
            const visibility = privacy[key]
            const isPrivate = visibility === 'PRIVE'
            return <div className="person-profile-privacy-row" key={key}><Icon size={17} aria-hidden="true" /><span>{label}</span><strong className={isPrivate ? 'person-profile-private' : 'person-profile-members'}>{isPrivate ? <><Lock size={13} aria-hidden="true" />{t('registration.newForm.private')}</> : <><Users size={13} aria-hidden="true" />{t('registration.newForm.members')}</>}</strong></div>
          })}</div>}
        </section>
      </div>
    </section>
  )
}
