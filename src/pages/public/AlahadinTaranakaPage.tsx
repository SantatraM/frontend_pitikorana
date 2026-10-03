import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { ApiError } from '../../api/apiClient'
import { alahadinErrorKey, createJournee, getJournees, journeeStatusKey, type Journee } from '../../api/alahadinTaranaka'
import { getElements, type ElementReference } from '../../api/referentielsInscription'
import { useAuth } from '../../hooks/useAuth'
import { isBusinessManagerRole } from '../../types/auth'
import { useLanguage } from '../../hooks/useLanguage'
import { useLatestRequest } from '../../hooks/useLatestRequest'
import './AlahadinTaranaka.css'

const formatDate = (value: string) => { const [a, m, j] = String(value).slice(0, 10).split('-'); return a && m && j ? `${j}/${m}/${a}` : value }

export function AlahadinTaranakaPage() {
  const { user } = useAuth(); const { t } = useLanguage()
  const [items, setItems] = useState<Journee[]>([]); const [elements, setElements] = useState<ElementReference[]>([])
  const [open, setOpen] = useState(false); const [date, setDate] = useState(''); const [obs, setObs] = useState(''); const [ids, setIds] = useState<string[]>([])
  const [err, setErr] = useState(''); const [modalErr, setModalErr] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)
  const { startRequest, isCurrentRequest } = useLatestRequest()
  const admin = isBusinessManagerRole(user?.compte.role)
  const errorMessage = (caught: unknown) => { const key = caught instanceof ApiError ? alahadinErrorKey(caught.response?.code) : undefined; return key ? t(key) : caught instanceof ApiError ? caught.message : t('alahadin.error') }
  const load = async () => { const request = startRequest(); if (isCurrentRequest(request)) { setLoading(true); setErr('') } try { const [journees, references] = await Promise.all([getJournees(), getElements()]); if (!isCurrentRequest(request)) return; setItems(journees.data ?? []); setElements(references.data ?? []) } catch (caught) { if (isCurrentRequest(request)) setErr(errorMessage(caught)) } finally { if (isCurrentRequest(request)) setLoading(false) } }
  const refreshJournees = async () => { const request = startRequest(); if (isCurrentRequest(request)) { setLoading(true); setErr('') } try { const response = await getJournees(); if (isCurrentRequest(request)) setItems(response.data ?? []) } catch (caught) { if (isCurrentRequest(request)) setErr(errorMessage(caught)) } finally { if (isCurrentRequest(request)) setLoading(false) } }
  useEffect(() => { void load() }, [])
  const tar = elements.filter(element => element.type_element?.code === 'TARANAKA')
  const save = async (event: React.FormEvent) => { event.preventDefault(); setModalErr(''); if (!date || !ids.length) { setModalErr(t('alahadin.required')); return } setSaving(true); try { await createJournee({ date_journee: date, observation: obs || null, id_taranaka: ids }); setOpen(false); setDate(''); setObs(''); setIds([]); await refreshJournees() } catch (caught) { setModalErr(errorMessage(caught)) } finally { setSaving(false) } }

  return <section className="alahadin-page alahadin-list-page">
    <header className="alahadin-head alahadin-list-head"><div><h1>{t('alahadin.title')}</h1><p>{t('alahadin.subtitle')}</p></div>{admin && <button className="primary" onClick={() => setOpen(true)}><CalendarPlus size={17}/>{t('alahadin.new')}</button>}</header>
    {err && <p className="form-error" role="alert">{err}</p>}
    {loading ? <p className="auth-loading">{t('alahadin.loading')}</p> : !items.length ? <section className="alahadin-card">{t('alahadin.empty')}</section> : <><div className="alahadin-table-wrap"><table className="alahadin-table"><thead><tr><th>{t('alahadin.date')}</th><th>{t('alahadin.status')}</th><th>{t('alahadin.taranaka')}</th><th /></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{formatDate(item.date_journee)}</td><td><b className={'alahadin-badge alahadin-status-' + item.statut.toLowerCase()}>{t(journeeStatusKey(item.statut))}</b></td><td>{item.taranaka.map(value => value.nom).join(', ')}</td><td><Link to={`/alahadin-taranaka/${item.id}`}>{t('alahadin.view')}</Link></td></tr>)}</tbody></table></div><div className="alahadin-mobile">{items.map(item => <article key={item.id}><strong>{formatDate(item.date_journee)}</strong><span className={'alahadin-badge alahadin-status-' + item.statut.toLowerCase()}>{t(journeeStatusKey(item.statut))}</span><p>{item.taranaka.map(value => value.nom).join(', ')}</p><Link to={`/alahadin-taranaka/${item.id}`}>{t('alahadin.view')}</Link></article>)}</div></>}
    {open && <div className="alahadin-modal"><form onSubmit={save}><h2>{t('alahadin.new')}</h2>{modalErr && <p className="form-error" role="alert">{modalErr}</p>}<label>{t('alahadin.date')}<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label><label>{t('alahadin.observation')}<textarea value={obs} onChange={event => setObs(event.target.value)}/></label><fieldset><legend>{t('alahadin.taranaka')}</legend><div className="alahadin-checkboxes">{tar.map(item => <label key={item.id}><input type="checkbox" checked={ids.includes(item.id)} onChange={() => setIds(values => values.includes(item.id) ? values.filter(value => value !== item.id) : [...values, item.id])}/>{item.nom}</label>)}</div></fieldset><div className="alahadin-actions"><button type="button" onClick={() => setOpen(false)}>{t('alahadin.back')}</button><button className="primary" disabled={saving}>{t('alahadin.save')}</button></div></form></div>}
  </section>
}
