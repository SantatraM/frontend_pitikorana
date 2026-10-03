import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Home, Users } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { getFoyerPersonne, type FoyerPersonne, type GenealogyPerson } from '../../api/genealogy'
import { FoyerPersonCard } from '../../components/foyer/FoyerPersonCard'
import { useLanguage } from '../../hooks/useLanguage'
import './PersonneFoyerPage.css'

function Couple({ first, second, currentId }: { first: GenealogyPerson; second: GenealogyPerson; currentId: string }) {
  return <div className="foyer-couple"><FoyerPersonCard person={first} current={first.id === currentId} /><span className="foyer-couple-link" aria-hidden="true" /><FoyerPersonCard person={second} current={second.id === currentId} /></div>
}

function Children({ people, currentId }: { people: GenealogyPerson[]; currentId: string }) {
  const { t } = useLanguage()
  if (people.length === 0) return <p className="foyer-no-children">{t('admin.personEdit.foyerNoChildren')}</p>
  return <div className="foyer-children">{people.map((person) => <FoyerPersonCard key={person.id} person={person} current={person.id === currentId} />)}</div>
}

export function PersonneFoyerPage() {
  const { id = '' } = useParams()
  const { t } = useLanguage()
  const [foyer, setFoyer] = useState<FoyerPersonne | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setFoyer(null)
    void getFoyerPersonne(id)
      .then((response) => { if (active) setFoyer(response.data ?? null) })
      .catch((caught) => {
        if (!active) return
        setError(caught instanceof ApiError && caught.status === 404 ? t('admin.personEdit.foyerNotFound') : t('admin.personEdit.foyerUnavailable'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, t])

  if (loading) return <p className="auth-loading">{t('admin.personEdit.foyerLoading')}</p>
  if (error || !foyer) return <section className="foyer-page"><div className="foyer-state is-error"><AlertCircle size={24} aria-hidden="true" /><p>{error ?? t('admin.personEdit.foyerUnavailable')}</p></div></section>

  const origin = foyer.foyer_origine
  const formed = foyer.foyer_forme

  return <section className="foyer-page">
    <Link className="foyer-back" to={`/personnes/${foyer.personne.id}`}><ArrowLeft size={17} aria-hidden="true" />{t('admin.personEdit.foyerBackProfile')}</Link>
    <header className="foyer-heading">
      <span className="foyer-heading-icon"><Home size={27} aria-hidden="true" /></span>
      <div><h1>{t('admin.personEdit.foyerTitle')}</h1><p>{t('admin.personEdit.foyerSubtitle')}</p></div>
    </header>

    <section className="foyer-current-person"><span>{t('admin.personEdit.foyerCurrentPerson')}</span><FoyerPersonCard person={foyer.personne} current /></section>

    <div className="foyer-grid">
      <section className="foyer-section">
        <header><span><Users size={20} aria-hidden="true" /></span><div><h2>{t('admin.personEdit.foyerOriginTitle')}</h2><p>{t('admin.personEdit.foyerOriginSubtitle')}</p></div></header>
        {!origin ? <div className="foyer-empty"><strong>{t('admin.personEdit.foyerOriginAbsent')}</strong></div> : origin.statut === 'INCOMPLET' ? <div className="foyer-incomplete"><AlertCircle size={20} aria-hidden="true" /><div><strong>{t('admin.personEdit.foyerIncomplete')}</strong><div className="foyer-single-parent">{origin.parents.map((parent) => <FoyerPersonCard key={parent.id} person={parent} />)}</div></div></div> : <div className="foyer-structure"><Couple first={origin.parents[0]} second={origin.parents[1]} currentId={foyer.personne.id} /><span className="foyer-stem" aria-hidden="true" /><Children people={origin.enfants} currentId={foyer.personne.id} /></div>}
      </section>

      <section className="foyer-section">
        <header><span><Home size={20} aria-hidden="true" /></span><div><h2>{t('admin.personEdit.foyerFormedTitle')}</h2><p>{t('admin.personEdit.foyerFormedSubtitle')}</p></div></header>
        {!formed ? <div className="foyer-empty"><strong>{t('admin.personEdit.foyerFormedAbsent')}</strong><p>{t('admin.personEdit.foyerFormedAbsentHelp')}</p></div> : <div className="foyer-structure">{formed.type_foyer === 'COUPLE' && formed.conjoint ? <Couple first={formed.personne} second={formed.conjoint} currentId={foyer.personne.id} /> : <FoyerPersonCard person={formed.personne} current={formed.personne.id === foyer.personne.id} />}<span className="foyer-stem" aria-hidden="true" /><Children people={formed.enfants} currentId={foyer.personne.id} /></div>}
      </section>
    </div>
  </section>
}