import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import type { GenealogyPerson } from '../../api/genealogy'
import { useLanguage } from '../../hooks/useLanguage'

type Props = {
  person: GenealogyPerson
  current?: boolean
}

export function FoyerPersonCard({ person, current = false }: Props) {
  const { t } = useLanguage()
  const initials = `${person.nom?.[0] ?? ''}${person.prenom?.[0] ?? ''}`.toUpperCase() || '—'
  const sexLabel = person.sexe === 'MASCULIN'
    ? t('admin.personEdit.genealogyMale')
    : person.sexe === 'FEMININ'
      ? t('admin.personEdit.genealogyFemale')
      : t('admin.personEdit.genealogyUnknown')

  return (
    <Link className={`foyer-person-card${current ? ' is-current' : ''}`} to={`/personnes/${person.id}`}>
      <span className={`foyer-person-avatar ${person.sexe === 'MASCULIN' ? 'is-male' : person.sexe === 'FEMININ' ? 'is-female' : 'is-unknown'}`}>{initials}</span>
      <span className="foyer-person-copy">
        <strong>{person.nom}</strong>
        <span>{person.prenom ?? '—'}</span>
        <small><UserRound size={12} aria-hidden="true" />{sexLabel}</small>
        {current && <em>{t('admin.personEdit.foyerCurrentPerson')}</em>}
      </span>
    </Link>
  )
}