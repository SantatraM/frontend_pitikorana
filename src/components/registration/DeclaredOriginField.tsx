import type { ElementReference } from '../../api/referentielsInscription'
import { useLanguage } from '../../hooks/useLanguage'
import type { DeclaredOrigin, DeclaredOriginLevel } from '../../types/demandeInscription'

export const emptyDeclaredOrigin: DeclaredOrigin = {
  razambe: { id: null, nom_propose: null },
  taranaka: { id: null, nom_propose: null },
  sampana: { id: null, nom_propose: null },
}

const emptyLevel = (): DeclaredOriginLevel => ({ id: null, nom_propose: null })
const hasValue = (level: DeclaredOriginLevel) => Boolean(level.id || level.nom_propose)

type Props = { elements: ElementReference[]; value: DeclaredOrigin; onChange: (value: DeclaredOrigin) => void }

export function DeclaredOriginField({ elements, value, onChange }: Props) {
  const { t } = useLanguage()
  const razambes = elements.filter((item) => item.type_element?.code === 'RAZAMBE')
  const taranakas = value.razambe.id ? elements.filter((item) => item.type_element?.code === 'TARANAKA' && item.parent?.id === value.razambe.id) : []
  const sampanas = value.taranaka.id ? elements.filter((item) => item.type_element?.code === 'SAMPANA' && item.parent?.id === value.taranaka.id) : []
  const update = (key: keyof DeclaredOrigin, level: DeclaredOriginLevel) => onChange({ ...value, [key]: level })
  const resetAfterRazambe = (razambe: DeclaredOriginLevel) => onChange({ razambe, taranaka: emptyLevel(), sampana: emptyLevel() })
  const resetAfterTaranaka = (taranaka: DeclaredOriginLevel) => onChange({ ...value, taranaka, sampana: emptyLevel() })
  const field = (key: keyof DeclaredOrigin, label: string, options: ElementReference[], enabled: boolean, notListed: string, onSet: (level: DeclaredOriginLevel) => void) => {
    const level = value[key]
    return <div className="registration-origin-level"><label>{label}<select value={level.id ?? ''} disabled={!enabled || Boolean(level.nom_propose)} onChange={(event) => onSet({ id: event.target.value || null, nom_propose: null })}><option value="">{t('registration.newForm.select')}</option>{options.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</select></label>{level.nom_propose !== null ? <div className="registration-origin-proposal"><label>{t('registration.newForm.proposedName')}<input value={level.nom_propose} onChange={(event) => onSet({ id: null, nom_propose: event.target.value })}/></label><button type="button" onClick={() => onSet(emptyLevel())}>{t('registration.newForm.chooseExisting')}</button></div> : <button className="registration-origin-link" type="button" disabled={!enabled} onClick={() => onSet({ id: null, nom_propose: '' })}>+ {notListed}</button>}</div>
  }
  return <fieldset><legend>{t('registration.newForm.falimanjaka')}</legend><div className="registration-origin-grid">{field('razambe', t('registration.newForm.razambe'), razambes, true, t('registration.newForm.notListedRazambe'), resetAfterRazambe)}{field('taranaka', t('registration.newForm.taranaka'), taranakas, hasValue(value.razambe), t('registration.newForm.notListedTaranaka'), resetAfterTaranaka)}{field('sampana', t('registration.newForm.sampana'), sampanas, hasValue(value.taranaka), t('registration.newForm.notListedSampana'), (level) => update('sampana', level))}</div></fieldset>
}