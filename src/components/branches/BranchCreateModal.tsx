import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, GitBranch, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/apiClient'
import { createElement, type ElementReference, type TypeElementReference } from '../../api/referentielsInscription'
import { useLanguage } from '../../hooks/useLanguage'

export type BranchType = 'RAZAMBE' | 'TARANAKA' | 'SAMPANA'

interface BranchCreateModalProps {
  open: boolean
  elements: ElementReference[]
  typesElement: TypeElementReference[]
  initialType: BranchType
  initialRazambeId?: string
  initialTaranakaId?: string
  onClose: () => void
  onCreated: (element: ElementReference) => Promise<void> | void
}

const branchTypes: BranchType[] = ['RAZAMBE', 'TARANAKA', 'SAMPANA']
const typeOf = (element: ElementReference) => element.type_element?.code as BranchType | undefined
const translationKeyFor = (type: BranchType) => `admin.${type.toLowerCase()}` as 'admin.razambe' | 'admin.taranaka' | 'admin.sampana'
const normalize = (value: string) => value.trim().toLocaleUpperCase()
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const rawId = (value: Record<string, unknown>) => typeof (value.id ?? value._id) === 'string' ? String(value.id ?? value._id) : ''
const rawName = (value: Record<string, unknown>) => typeof (value.nom ?? value._nom) === 'string' ? String(value.nom ?? value._nom) : ''

export function BranchCreateModal({ open, elements, typesElement, initialType, initialRazambeId = '', initialTaranakaId = '', onClose, onCreated }: BranchCreateModalProps) {
  const { t } = useLanguage()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [createType, setCreateType] = useState<BranchType>(initialType)
  const [createRazambe, setCreateRazambe] = useState(initialRazambeId)
  const [createTaranaka, setCreateTaranaka] = useState(initialTaranakaId)
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const grouped = useMemo(() => Object.fromEntries(branchTypes.map((type) => [type, elements.filter((element) => typeOf(element) === type)])) as Record<BranchType, ElementReference[]>, [elements])
  const canonicalType = useMemo(() => typesElement.find((type) => type.code === createType) ?? null, [createType, typesElement])
  const sortedRazambe = useMemo(() => grouped.RAZAMBE.slice().sort((a, b) => a.nom.localeCompare(b.nom)), [grouped.RAZAMBE])
  const createTaranakaOptions = useMemo(() => grouped.TARANAKA.filter((item) => !createRazambe || item.parent?.id === createRazambe).sort((a, b) => a.nom.localeCompare(b.nom)), [grouped.TARANAKA, createRazambe])
  const duplicate = useMemo(() => {
    const name = normalize(createName)
    if (!name) return null
    const candidates = createType === 'RAZAMBE' ? grouped.RAZAMBE : createType === 'TARANAKA' ? grouped.TARANAKA.filter((item) => item.parent?.id === createRazambe) : grouped.SAMPANA.filter((item) => item.parent?.id === createTaranaka)
    return candidates.find((item) => normalize(item.nom) === name) ?? null
  }, [createName, createRazambe, createTaranaka, createType, grouped])
  const parentReady = createType === 'RAZAMBE' || (createType === 'TARANAKA' ? Boolean(createRazambe) : Boolean(createRazambe && createTaranaka))
  const createDisabled = creating || !canonicalType || !createName.trim() || !parentReady || Boolean(duplicate)

  useEffect(() => {
    if (!open) return
    setCreateType(initialType)
    setCreateRazambe(initialRazambeId)
    setCreateTaranaka(initialTaranakaId)
    setCreateName('')
    setCreateError(null)
  }, [open, initialRazambeId, initialTaranakaId, initialType])
  useEffect(() => { if (createTaranaka && !createTaranakaOptions.some((item) => item.id === createTaranaka)) setCreateTaranaka('') }, [createTaranaka, createTaranakaOptions])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !creating) onClose() }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => nameInputRef.current?.focus(), 0)
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKeyDown) }
  }, [creating, onClose, open])

  function changeCreateType(type: BranchType) { setCreateType(type); setCreateRazambe(''); setCreateTaranaka(''); setCreateError(null) }
  function normalizeCreatedElement(value: unknown, type: TypeElementReference, parentId: string | null): ElementReference {
    const created = record(value)
    const id = rawId(created)
    if (!id) throw new Error(t('admin.branchCreateFailure'))
    const parent = parentId ? elements.find((item) => item.id === parentId) : null
    return { id, nom: rawName(created) || createName.trim(), id_type_element: type.id, type_element: { id: type.id, code: type.code, libelle: type.libelle }, parent: parent ? { id: parent.id, nom: parent.nom } : null }
  }

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (createDisabled || !canonicalType) return
    const rattachementSup = createType === 'RAZAMBE' ? null : createType === 'TARANAKA' ? createRazambe : createTaranaka
    if (!rattachementSup && createType !== 'RAZAMBE') return
    setCreating(true)
    setCreateError(null)
    try {
      const response = await createElement({ id_type_element: canonicalType.id, nom: createName.trim(), autres_appellations: null, id_sexe: null, nom_conjoint: null, ville_origine_conjoint: null, rattachement_sup: rattachementSup, etat: 0 })
      if (response.data) await onCreated(normalizeCreatedElement(response.data, canonicalType, rattachementSup))
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 409) setCreateError(t('admin.branchDuplicate'))
        else if (caught.status === 401) setCreateError(t('admin.branchCreateAuth'))
        else if (caught.status === 403) setCreateError(t('admin.branchCreateForbidden'))
        else if (caught.status === 400) setCreateError(caught.message || t('admin.branchCreateParentInvalid'))
        else setCreateError(t('admin.branchCreateFailure'))
      } else setCreateError(caught instanceof Error ? caught.message : t('admin.branchCreateFailure'))
    } finally { setCreating(false) }
  }

  if (!open) return null
  return <div className="branch-create-layer"><button className="branch-create-backdrop" type="button" aria-label={t('admin.closeBranchCreate')} onClick={() => { if (!creating) onClose() }} /><section className="branch-create-modal" role="dialog" aria-modal="true" aria-labelledby="branch-create-title">
    <header><div><span><GitBranch size={18} aria-hidden="true" />{t('admin.addBranch')}</span><h2 id="branch-create-title">{t('admin.addBranchTitle')}</h2><p>{t('admin.addBranchPrompt')}</p></div><button type="button" aria-label={t('admin.closeBranchCreate')} onClick={onClose} disabled={creating}><X aria-hidden="true" /></button></header>
    <form onSubmit={submitCreate}>
      <fieldset className="branch-create-types"><legend>{t('admin.addBranchPrompt')}</legend>{branchTypes.map((type) => <label key={type} className={createType === type ? 'active' : ''}><input type="radio" name="branch-type" checked={createType === type} onChange={() => changeCreateType(type)} /><strong>{t(translationKeyFor(type))}</strong><span>{type === 'RAZAMBE' ? t('admin.razambeCreateDescription') : type === 'TARANAKA' ? t('admin.taranakaCreateDescription') : t('admin.sampanaCreateDescription')}</span></label>)}</fieldset>
      {createType === 'TARANAKA' && <label className="branch-create-field"><span>{t('admin.parentRazambe')} *</span><select value={createRazambe} onChange={(event) => setCreateRazambe(event.target.value)}><option value="">{t('admin.selectRazambe')}</option>{sortedRazambe.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</select></label>}
      {createType === 'SAMPANA' && <><label className="branch-create-field"><span>{t('admin.parentRazambe')} *</span><select value={createRazambe} onChange={(event) => { setCreateRazambe(event.target.value); setCreateTaranaka('') }}><option value="">{t('admin.selectRazambe')}</option>{sortedRazambe.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</select></label><label className="branch-create-field"><span>{t('admin.parentTaranaka')} *</span><select value={createTaranaka} disabled={!createRazambe} onChange={(event) => setCreateTaranaka(event.target.value)}><option value="">{t('admin.selectTaranaka')}</option>{createTaranakaOptions.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</select></label></>}
      <label className="branch-create-field"><span>{createType === 'RAZAMBE' ? t('admin.razambeName') : createType === 'TARANAKA' ? t('admin.taranakaName') : t('admin.sampanaName')} *</span><input ref={nameInputRef} value={createName} onChange={(event) => setCreateName(event.target.value)} /></label>
      {!canonicalType && <p className="form-error" role="alert">{t('admin.branchTypeNotFound')}</p>}
      {duplicate && <p className="branch-create-duplicate" role="alert">{createType === 'RAZAMBE' ? t('admin.duplicateRazambe') : createType === 'TARANAKA' ? t('admin.duplicateTaranaka') : t('admin.duplicateSampana')} <Link to={`/branches/${duplicate.id}`} onClick={onClose}>{t('admin.viewBranch')}<ArrowRight size={14} aria-hidden="true" /></Link></p>}
      {createError && <p className="form-error" role="alert">{createError}</p>}
      <footer><button type="button" onClick={onClose} disabled={creating}>{t('admin.branchCancel')}</button><button type="submit" disabled={createDisabled}>{creating ? t('admin.creatingBranch') : t('admin.createBranch')}</button></footer>
    </form>
  </section></div>
}