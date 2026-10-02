import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Expand, Maximize2, Minus, Plus, RotateCcw, TreeDeciduous, UserRound, X } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { getAscendantsPersonne, getDescendantsPersonne, getFamillePersonne, type GenealogyAscendantNode, type GenealogyDescendantNode, type GenealogyFamily, type GenealogyPerson } from '../../api/genealogy'
import { GenealogyPersonCard } from '../../components/genealogy/GenealogyPersonCard'
import { useLanguage } from '../../hooks/useLanguage'
import './PersonneArbrePage.css'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function flattenAscendants(node: GenealogyAscendantNode, limit: number, result: Map<number, GenealogyPerson[]> = new Map()) {
  for (const parent of node.parents ?? []) {
    if (Math.abs(parent.generation) <= limit) {
      const row = result.get(parent.generation) ?? []
      if (!row.some((item) => item.id === parent.id)) row.push(parent)
      result.set(parent.generation, row)
      flattenAscendants(parent, limit, result)
    }
  }
  return result
}

function flattenDescendants(node: GenealogyDescendantNode, limit: number, result: Map<number, GenealogyPerson[]> = new Map()) {
  for (const child of node.enfants ?? []) {
    if (child.generation <= limit) {
      const row = result.get(child.generation) ?? []
      if (!row.some((item) => item.id === child.id)) row.push(child)
      result.set(child.generation, row)
      flattenDescendants(child, limit, result)
    }
  }
  return result
}

export function PersonneArbrePage() {
  const { id = '' } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const treeRef = useRef<HTMLDivElement>(null)
  const [family, setFamily] = useState<GenealogyFamily | null>(null)
  const [ascendants, setAscendants] = useState<GenealogyAscendantNode | null>(null)
  const [descendants, setDescendants] = useState<GenealogyDescendantNode | null>(null)
  const [selected, setSelected] = useState<GenealogyPerson | null>(null)
  const [zoom, setZoom] = useState(1)
  const [generations, setGenerations] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true); setError(null); setFamily(null); setAscendants(null); setDescendants(null)
    void Promise.all([getFamillePersonne(id), getAscendantsPersonne(id), getDescendantsPersonne(id)])
      .then(([familyResponse, ascendantsResponse, descendantsResponse]) => {
        if (!active) return
        const nextFamily = familyResponse.data
        const nextAscendants = ascendantsResponse.data
        const nextDescendants = descendantsResponse.data
        if (!nextFamily || !nextAscendants || !nextDescendants) throw new Error('Genealogy data unavailable')
        setFamily(nextFamily); setAscendants(nextAscendants); setDescendants(nextDescendants); setSelected(nextFamily.personne)
      })
      .catch((caught) => {
        if (!active) return
        setError(caught instanceof ApiError && caught.status === 404 ? t('admin.personEdit.genealogyNotFound') : t('admin.personEdit.genealogyUnavailable'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, t])

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === treeRef.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  const upperRows = useMemo(() => ascendants ? [...flattenAscendants(ascendants, generations).entries()].filter(([generation]) => generation < -1).sort(([a], [b]) => a - b) : [], [ascendants, generations])
  const lowerRows = useMemo(() => descendants ? [...flattenDescendants(descendants, generations).entries()].sort(([a], [b]) => a - b) : [], [descendants, generations])
  const select = (person: GenealogyPerson) => setSelected(person)
  const recenter = () => { setZoom(1); setGenerations(3); treeRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' }) }
  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await treeRef.current?.requestFullscreen() } catch { /* Browser permission is optional. */ }
  }

  if (loading) return <main className="genealogy-page"><div className="genealogy-state">{t('admin.personEdit.genealogyLoading')}</div></main>
  if (error || !family) return <main className="genealogy-page"><div className="genealogy-state is-error">{error ?? t('admin.personEdit.genealogyUnavailable')}</div></main>

  const immediateParents = family.parents
  const siblingCards = family.fratrie.filter((person) => person.id !== family.personne.id)
  const spouseCards = family.conjoints.filter((person) => person.id !== family.personne.id)

  const selectedSexClass = selected?.sexe === 'MASCULIN' ? 'is-male' : selected?.sexe === 'FEMININ' ? 'is-female' : 'is-unknown'
  const selectedInitials = `${selected?.nom?.[0] ?? ''}${selected?.prenom?.[0] ?? ''}`.toUpperCase()

  return (
    <main className="genealogy-page">
      <header className="genealogy-heading">
        <div><span className="genealogy-heading-icon"><TreeDeciduous size={28} aria-hidden="true" /></span><div><h1>{t('admin.personEdit.genealogyTitle')}</h1><p>{t('admin.personEdit.genealogySubtitle')}</p></div></div>
      </header>
      <section className="genealogy-workspace">
        <div className="genealogy-toolbar" aria-label={t('admin.personEdit.genealogyToolbar')}>
          <div className="genealogy-control-group"><button type="button" aria-label={t('admin.personEdit.genealogyZoomOut')} onClick={() => setZoom((value) => clamp(value - .1, .6, 1.5))}><Minus size={18} /></button><output>{Math.round(zoom * 100)} %</output><button type="button" aria-label={t('admin.personEdit.genealogyZoomIn')} onClick={() => setZoom((value) => clamp(value + .1, .6, 1.5))}><Plus size={18} /></button></div>
          <button type="button" className="genealogy-toolbar-action" onClick={() => void toggleFullscreen()}><Expand size={18} />{t('admin.personEdit.genealogyFullscreen')}</button>
          <button type="button" className="genealogy-toolbar-action" onClick={recenter}><RotateCcw size={18} />{t('admin.personEdit.genealogyRecenter')}</button>
          <div className="genealogy-generation-control"><span>{t('admin.personEdit.genealogyGenerations')}</span><div className="genealogy-control-group"><button type="button" aria-label={t('admin.personEdit.genealogyDecreaseGenerations')} onClick={() => setGenerations((value) => clamp(value - 1, 1, 5))}><Minus size={17} /></button><output>{generations}</output><button type="button" aria-label={t('admin.personEdit.genealogyIncreaseGenerations')} onClick={() => setGenerations((value) => clamp(value + 1, 1, 5))}><Plus size={17} /></button></div></div>
        </div>
        <div className="genealogy-main-layout">
          <div ref={treeRef} className={`genealogy-canvas-shell ${fullscreen ? 'is-fullscreen' : ''}`}>
            <div className="genealogy-canvas" style={{ transform: `scale(${zoom})` }}>
              {upperRows.map(([generation, people]) => <div key={generation} className="genealogy-generation-row genealogy-ancestor-row"><span className="genealogy-vertical-link" />{people.map((person) => <GenealogyPersonCard key={person.id} person={person} compact onSelect={select} selected={selected?.id === person.id} />)}</div>)}
              <div className="genealogy-parents-block">
                <div className={`genealogy-parent-row ${immediateParents.length > 1 ? 'has-several-parents' : ''}`}>{immediateParents.map((person) => <GenealogyPersonCard key={person.id} person={person} onSelect={select} selected={selected?.id === person.id} />)}</div>
                {immediateParents.length === 0 && <p className="genealogy-empty-note">{t('admin.personEdit.genealogyNoParents')}</p>}
                {immediateParents.length > 0 && <span className="genealogy-parent-connector" aria-hidden="true" />}
              </div>
              <div className="genealogy-central-row">
                <div className="genealogy-siblings">{siblingCards.map((person) => <GenealogyPersonCard key={person.id} person={person} compact onSelect={select} selected={selected?.id === person.id} />)}</div>
                <div className={`genealogy-central-family ${spouseCards.length > 0 ? 'has-spouse' : ''}`}>
                  <GenealogyPersonCard person={family.personne} selected={selected?.id === family.personne.id} onSelect={select} />
                  {spouseCards.map((person) => <div className="genealogy-spouse-pair" key={person.id}><span aria-hidden="true" /><GenealogyPersonCard person={person} onSelect={select} selected={selected?.id === person.id} /></div>)}
                  {spouseCards.length === 0 && <p className="genealogy-empty-note">{t('admin.personEdit.genealogyNoSpouse')}</p>}
                </div>
                <div className="genealogy-central-balance" aria-hidden="true" />
              </div>
              <div className="genealogy-descendants-block">{lowerRows.map(([generation, people]) => <div key={generation} className={`genealogy-generation-row genealogy-descendant-row ${generation === 1 ? 'is-direct-children' : ''}`}><span className="genealogy-vertical-link" aria-hidden="true" />{people.map((person) => <div className="genealogy-child-branch" key={person.id}><span aria-hidden="true" /><GenealogyPersonCard person={person} compact={generation > 1} onSelect={select} selected={selected?.id === person.id} /></div>)}</div>)}{family.enfants.length === 0 && <p className="genealogy-empty-note">{t('admin.personEdit.genealogyNoChildren')}</p>}</div>
            </div>
          </div>
          <aside className="genealogy-details" aria-label={t('admin.personEdit.genealogyDetails')}>
            {selected && <>
              <button type="button" className="genealogy-close-details" onClick={() => setSelected(null)} aria-label={t('admin.personEdit.close')}><X size={19} /></button>
              <span className={`genealogy-detail-avatar ${selectedSexClass}`}>{selectedInitials}</span>
              <h2>{selected.nom}<br />{selected.prenom ?? ''}</h2>
              <p className="genealogy-detail-sex"><UserRound size={16} />{selected.sexe === 'MASCULIN' ? t('admin.personEdit.genealogyMale') : selected.sexe === 'FEMININ' ? t('admin.personEdit.genealogyFemale') : t('admin.personEdit.genealogyUnknown')}</p>
              <dl><div><dt>ID</dt><dd>{selected.id}</dd></div><div><dt>{t('registration.newForm.name')}</dt><dd>{selected.nom}</dd></div><div><dt>{t('registration.newForm.firstName')}</dt><dd>{selected.prenom ?? '—'}</dd></div></dl>
              <Link className="genealogy-detail-action" to={`/personnes/${selected.id}`}><UserRound size={17} />{t('admin.personEdit.genealogyViewProfile')}</Link>
              <button type="button" className="genealogy-detail-action is-primary" onClick={() => navigate(`/personnes/${selected.id}/arbre`)}><Maximize2 size={17} />{t('admin.personEdit.genealogyCenterHere')}</button>
            </>}
          </aside>
        </div>
      </section>
    </main>
  )
}