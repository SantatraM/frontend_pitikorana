import { UserRound } from 'lucide-react'
import type { GenealogyPerson } from '../../api/genealogy'
import { useLanguage } from '../../hooks/useLanguage'

type Props = {
  person: GenealogyPerson
  selected?: boolean
  compact?: boolean
  onSelect: (person: GenealogyPerson) => void
}

const initialsOf = (person: GenealogyPerson) => `${person.nom?.[0] ?? ''}${person.prenom?.[0] ?? ''}`.toUpperCase() || '—'

export function GenealogyPersonCard({ person, selected = false, compact = false, onSelect }: Props) {
  const { t } = useLanguage()
  const sexLabel = person.sexe === 'MASCULIN'
    ? t('admin.personEdit.genealogyMale')
    : person.sexe === 'FEMININ'
      ? t('admin.personEdit.genealogyFemale')
      : t('admin.personEdit.genealogyUnknown')

  return (
    <button type="button" className={`genealogy-person-card ${selected ? 'is-selected' : ''} ${compact ? 'is-compact' : ''}`} onClick={() => onSelect(person)}>
      <span className={`genealogy-avatar ${person.sexe === 'MASCULIN' ? 'is-male' : person.sexe === 'FEMININ' ? 'is-female' : 'is-unknown'}`}>{initialsOf(person)}</span>
      <span className="genealogy-person-card-copy"><strong>{person.nom}</strong><span>{person.prenom ?? '—'}</span><small><UserRound size={13} aria-hidden="true" />{sexLabel}</small></span>
    </button>
  )
}