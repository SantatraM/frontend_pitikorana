import type { Translator } from '../i18n/types'

export type RelationCode = 'PARENT' | 'ENFANT' | 'FRATRIE' | 'CONJOINT'
export type RelationUxValue = 'PERE' | 'MERE' | 'FILS' | 'FILLE' | 'FRERE' | 'SOEUR' | 'CONJOINT'

type RelationChoice = { value: RelationUxValue; code: RelationCode; label: string }

export function getRelationChoices(t: Translator): RelationChoice[] {
  return [
    { value: 'PERE', code: 'PARENT', label: t('admin.personEdit.relationFather') },
    { value: 'MERE', code: 'PARENT', label: t('admin.personEdit.relationMother') },
    { value: 'FILS', code: 'ENFANT', label: t('admin.personEdit.relationSon') },
    { value: 'FILLE', code: 'ENFANT', label: t('admin.personEdit.relationDaughter') },
    { value: 'FRERE', code: 'FRATRIE', label: t('admin.personEdit.relationBrother') },
    { value: 'SOEUR', code: 'FRATRIE', label: t('admin.personEdit.relationSister') },
    { value: 'CONJOINT', code: 'CONJOINT', label: t('admin.personEdit.relationSpouse') },
  ]
}

export function getRelationTypeCode(value: string): RelationCode | null {
  return getRelationChoices((key) => key).find((choice) => choice.value === value)?.code ?? null
}

export function getRelationUxValue(code: string | null | undefined, sexe: string | null | undefined): RelationUxValue | '' {
  switch (code) {
    case 'PARENT': return sexe === 'MASCULIN' ? 'PERE' : sexe === 'FEMININ' ? 'MERE' : ''
    case 'ENFANT': return sexe === 'MASCULIN' ? 'FILS' : sexe === 'FEMININ' ? 'FILLE' : ''
    case 'FRATRIE': return sexe === 'MASCULIN' ? 'FRERE' : sexe === 'FEMININ' ? 'SOEUR' : ''
    case 'CONJOINT': return 'CONJOINT'
    default: return ''
  }
}

export function getRelationDisplayLabel(t: Translator, code: string | null | undefined, sexe: string | null | undefined): string {
  switch (code) {
    case 'PARENT': return sexe === 'MASCULIN' ? t('admin.personEdit.relationFather') : sexe === 'FEMININ' ? t('admin.personEdit.relationMother') : t('admin.personEdit.relationParent')
    case 'ENFANT': return sexe === 'MASCULIN' ? t('admin.personEdit.relationSon') : sexe === 'FEMININ' ? t('admin.personEdit.relationDaughter') : t('admin.personEdit.relationChild')
    case 'FRATRIE': return sexe === 'MASCULIN' ? t('admin.personEdit.relationBrother') : sexe === 'FEMININ' ? t('admin.personEdit.relationSister') : t('admin.personEdit.relationSibling')
    case 'CONJOINT': return t('admin.personEdit.relationSpouse')
    default: return '—'
  }
}