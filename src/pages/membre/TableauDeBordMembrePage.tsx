import { useEffect, useState } from 'react'
import { ChevronRight, GitBranch, MapPin, Network, Pencil, User, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getPersonnes, getProfilPersonne } from '../../api/personnes'
import { getElements, type ElementReference } from '../../api/referentielsInscription'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import type { ProfilPersonne } from '../../types/profil'

type Overview = { people: number | null; razambe: number | null; taranaka: number | null; sampana: number | null }

const emptyOverview: Overview = { people: null, razambe: null, taranaka: null, sampana: null }
const initialsFor = (prenom: string | null | undefined, nom: string | undefined) => [prenom, nom].filter(Boolean).map((value) => value?.slice(0, 1)).join('').toUpperCase() || 'M'
const isType = (element: ElementReference, type: string) => element.type_element?.libelle?.trim().toUpperCase() === type

export function TableauDeBordMembrePage() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [profile, setProfile] = useState<ProfilPersonne | null>(null)
  const [overview, setOverview] = useState<Overview>(emptyOverview)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(false)
  const [overviewError, setOverviewError] = useState(false)
  const personId = user?.personne.id

  useEffect(() => {
    if (!personId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let active = true
    setProfileLoading(true)
    setProfileError(false)
    setOverviewError(false)
    setOverview(emptyOverview)

    void Promise.allSettled([
      getProfilPersonne(personId, language),
      getPersonnes(language),
      getElements(),
    ]).then(([profileResult, peopleResult, elementsResult]) => {
      if (!active) return

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value.data ?? null)
        setProfileError(!profileResult.value.data)
      } else {
        setProfile(null)
        setProfileError(true)
      }

      const nextOverview: Overview = { ...emptyOverview }
      let secondaryFailure = false
      if (peopleResult.status === 'fulfilled') nextOverview.people = peopleResult.value.data?.length ?? 0
      else secondaryFailure = true
      if (elementsResult.status === 'fulfilled') {
        const elements = elementsResult.value.data ?? []
        nextOverview.razambe = elements.filter((element) => isType(element, 'RAZAMBE')).length
        nextOverview.taranaka = elements.filter((element) => isType(element, 'TARANAKA')).length
        nextOverview.sampana = elements.filter((element) => isType(element, 'SAMPANA')).length
      } else {
        secondaryFailure = true
      }
      setOverview(nextOverview)
      setOverviewError(secondaryFailure)
      setProfileLoading(false)
    })

    return () => { active = false }
  }, [personId, language])

  const person = profile?.personne
  const firstName = person?.prenom || person?.nom || user?.personne.prenom || user?.personne.nom || t('member.member')
  const fullName = [person?.prenom ?? user?.personne.prenom, person?.nom ?? user?.personne.nom].filter(Boolean).join(' ') || t('member.member')
  const family = [
    { label: t('admin.razambe'), item: person?.razambe, Icon: Network },
    { label: t('admin.taranaka'), item: person?.taranaka, Icon: Users },
    { label: t('admin.sampana'), item: person?.sampana, Icon: GitBranch },
  ]
  const stats = [
    { label: t('member.people'), value: overview.people, Icon: Users, to: '/personnes' },
    { label: t('admin.razambe'), value: overview.razambe, Icon: Network, to: '/branches' },
    { label: t('admin.taranaka'), value: overview.taranaka, Icon: Users, to: '/branches' },
    { label: t('admin.sampana'), value: overview.sampana, Icon: GitBranch, to: '/branches' },
  ]
  const shortcuts = [
    { to: '/personnes/nouvelle', Icon: UserRound, title: t('admin.addPerson'), text: t('member.profileDescription') },
    { to: '/personnes', Icon: Users, title: t('member.people'), text: t('member.peopleDescription') },
    { to: '/branches', Icon: GitBranch, title: t('admin.familyBranch'), text: t('member.welcomeDescription') },
    { to: '/membre/profil', Icon: User, title: t('member.myProfile'), text: t('member.profileDescription') },
  ]

  if (profileLoading) return <section className="membre-dashboard-v2"><p className="auth-loading">{t('member.loadingProfile')}</p></section>

  return <section className="admin-dashboard membre-dashboard membre-dashboard-v2">
    <header className="admin-page-heading membre-page-heading"><h2>{t('member.dashboard')}</h2><span>{t('member.dashboardSubtitle')}</span></header>
    {profileError || !person ? <section className="membre-dashboard-state" role="alert"><p>{t('member.profileLoadError')}</p><Link to="/membre/profil">{t('member.viewProfile')}</Link></section> : <>
      <section className="membre-dashboard-profile-card">
        <div className="membre-dashboard-avatar">{person.photo?.url_photo ? <img src={person.photo.url_photo} alt="" /> : <span>{initialsFor(person.prenom, person.nom)}</span>}</div>
        <div className="membre-dashboard-profile-content"><p>{t('member.hello')}, {firstName}</p><h1>{fullName}</h1><div className="membre-dashboard-profile-meta"><span>{person.statut?.libelle ?? t('member.notProvided')}</span>{person.ville?.nom && <span><MapPin size={14} aria-hidden="true" />{person.ville.nom}</span>}</div></div>
        <div className="membre-dashboard-profile-actions"><Link className="admin-entry-mode-outline" to="/membre/profil">{t('member.viewProfile')}</Link><Link className="admin-button" to="/membre/profil/modifier"><Pencil size={15} aria-hidden="true" />{t('member.editProfile')}</Link></div>
      </section>
      <section className="membre-dashboard-section">
        <header><h2><Network size={19} aria-hidden="true" />{t('member.familyAttachment')}</h2></header>
        <div className="membre-dashboard-family-grid">{family.map(({ label, item, Icon }) => item?.id ? <Link key={label} to={`/branches/${item.id}`} className="membre-dashboard-family-card"><Icon size={19} aria-hidden="true" /><span><small>{label}</small><strong>{item.nom}</strong></span><ChevronRight size={16} aria-hidden="true" /></Link> : <div key={label} className="membre-dashboard-family-card is-empty"><Icon size={19} aria-hidden="true" /><span><small>{label}</small><strong>{t('member.notProvided')}</strong></span></div>)}</div>
      </section>
    </>}
    <section className="membre-dashboard-section">
      <header><h2><Users size={19} aria-hidden="true" />{t('member.overview')}</h2></header>
      {overviewError && <p className="membre-dashboard-note" role="status">{t('member.dashboardDataError')}</p>}
      <div className="membre-dashboard-stats">{stats.map(({ label, value, Icon, to }) => <Link className="membre-dashboard-stat" key={label} to={to}><Icon size={19} aria-hidden="true" /><span><small>{label}</small><strong>{value === null ? '—' : value}</strong></span><ChevronRight size={16} aria-hidden="true" /></Link>)}</div>
    </section>
    <section className="membre-dashboard-section">
      <header><h2><ChevronRight size={19} aria-hidden="true" />{t('member.quickActions')}</h2></header>
      <div className="admin-action-grid membre-action-grid">{shortcuts.map(({ to, Icon, title, text }) => <Link className="admin-action-card" to={to} key={to}><span className="admin-action-icon" aria-hidden="true"><Icon size={18} /></span><strong>{title}</strong><p>{text}</p><small>{t('admin.view')} <ChevronRight size={15} aria-hidden="true" /></small></Link>)}</div>
    </section>
  </section>
}