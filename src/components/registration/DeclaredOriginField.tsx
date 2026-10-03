import { useState } from 'react'
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
type OriginKey = keyof DeclaredOrigin
type Props = { elements: ElementReference[]; value: DeclaredOrigin; onChange: (value: DeclaredOrigin) => void }

export function DeclaredOriginField({ elements, value, onChange }: Props) {
  const { t } = useLanguage()
  const [editing, setEditing] = useState<OriginKey | null>(null)
  const [name, setName] = useState('')
  const razambes = elements.filter((item) => item.type_element?.code === 'RAZAMBE')
  const taranakas = value.razambe.id ? elements.filter((item) => item.type_element?.code === 'TARANAKA' && item.parent?.id === value.razambe.id) : []
  const sampanas = value.taranaka.id ? elements.filter((item) => item.type_element?.code === 'SAMPANA' && item.parent?.id === value.taranaka.id) : []
  const getName = (level: DeclaredOriginLevel) => level.nom_propose ?? elements.find((item) => item.id === level.id)?.nom ?? ''
  const resetAfterRazambe = (razambe: DeclaredOriginLevel) => onChange({ razambe, taranaka: emptyLevel(), sampana: emptyLevel() })
  const resetAfterTaranaka = (taranaka: DeclaredOriginLevel) => onChange({ ...value, taranaka, sampana: emptyLevel() })
  const setLevel = (key: OriginKey, level: DeclaredOriginLevel) => key === 'razambe' ? resetAfterRazambe(level) : key === 'taranaka' ? resetAfterTaranaka(level) : onChange({ ...value, sampana: level })
  const openProposal = (key: OriginKey) => { setName(value[key].nom_propose ?? ''); setEditing(key) }
  const cancelProposal = () => { setName(''); setEditing(null) }
  const useProposal = (key: OriginKey) => { const proposed = name.trim(); if (!proposed) return; setLevel(key, { id: null, nom_propose: proposed }); cancelProposal() }
  const parentName = (key: OriginKey) => key === 'taranaka' ? getName(value.razambe) : key === 'sampana' ? getName(value.taranaka) : ''
  const disabledText = (key: OriginKey) => key === 'taranaka' ? t('registration.newForm.originSelectRazambeFirst') : t('registration.newForm.originSelectTaranakaFirst')

  const level = (key: OriginKey, number: number, label: string, options: ElementReference[], enabled: boolean, notListed: string) => {
    const current = value[key]
    const selectedName = getName(current)
    const isProposed = Boolean(current.nom_propose)
    const fieldId = `declared-origin-${key}`
    return <div className={`registration-origin-level ${enabled ? '' : 'is-disabled'}`}>
      <div className="registration-origin-step" aria-hidden="true"><span>{number}</span><i /></div>
      <div className="registration-origin-content">
        <label htmlFor={fieldId}>{label}</label>
        <select id={fieldId} value={current.id ?? ''} disabled={!enabled || isProposed} aria-describedby={`${fieldId}-help`} onChange={(event) => setLevel(key, { id: event.target.value || null, nom_propose: null })}>
          <option value="">{t('registration.newForm.select')}</option>
          {options.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}
        </select>
        {!enabled && <p id={`${fieldId}-help`} className="registration-origin-help">{disabledText(key)}</p>}
        {enabled && !selectedName && editing !== key && <button className="registration-origin-link" type="button" onClick={() => openProposal(key)} aria-expanded="false">+ {notListed}</button>}
        {editing === key && <div className="registration-origin-entry" aria-expanded="true"><p>{t('registration.newForm.originNotListedHelp')}</p><label>{t('registration.newForm.proposedName')}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label>{parentName(key) && <p className="registration-origin-parent">{t('registration.newForm.attachedTo')} <strong>{parentName(key)}</strong></p>}<div><button type="button" onClick={cancelProposal}>{t('registration.newForm.cancel')}</button><button type="button" disabled={!name.trim()} onClick={() => useProposal(key)}>{t('registration.newForm.useThisName')}</button></div></div>}
{selectedName && editing !== key && <div className={isProposed ? 'registration-origin-selected is-proposed' : 'registration-origin-selected'}><div><strong>{selectedName}</strong><span>{isProposed ? t('registration.newForm.newProposal') : t('registration.newForm.existing')}</span>{isProposed && <small>{t('registration.newForm.proposalVerification')}</small>}{parentName(key) && <small>{t('registration.newForm.attachedTo')} {parentName(key)}</small>}</div><button type="button" onClick={() => isProposed ? openProposal(key) : setLevel(key, emptyLevel())}>{isProposed ? t('registration.newForm.change') : t('registration.newForm.change')}</button></div>}
      </div>
    </div>
  }

  const summary = (Object.keys(value) as OriginKey[]).filter((key) => hasValue(value[key]))
  return (
    <fieldset className="registration-origin">
      <legend>{t('registration.newForm.familyOrigin')}</legend>
      <p className="registration-origin-intro">{t('registration.newForm.familyOriginHelp')}</p>
      <div className="registration-origin-grid">
        {level('razambe', 1, t('registration.newForm.razambe'), razambes, true, t('registration.newForm.notListedRazambe'))}
        {level('taranaka', 2, t('registration.newForm.taranaka'), taranakas, hasValue(value.razambe), t('registration.newForm.notListedTaranaka'))}
        {level('sampana', 3, t('registration.newForm.sampana'), sampanas, hasValue(value.taranaka), t('registration.newForm.notListedSampana'))}
      </div>
      {summary.length > 0 && (
        <aside className="registration-origin-summary" aria-label={t('registration.newForm.declaredOrigin')}>
          <strong>{t('registration.newForm.declaredOrigin')}</strong>
          <div>
            {summary.map((key, index) => (
              <div key={key}>
                <span>{getName(value[key])}</span>
                <small>{value[key].id ? t('registration.newForm.existing') : t('registration.newForm.newProposal')}</small>
                {index < summary.length - 1 && <i aria-hidden="true">↓</i>}
              </div>
            ))}
          </div>
        </aside>
      )}
    </fieldset>
  )
}