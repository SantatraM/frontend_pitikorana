import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageProvider } from '../src/i18n/LanguageContext'
import { useLanguage } from '../src/hooks/useLanguage'
import { FandraisanAnjaraContributorSelector } from '../src/components/fandraisanAnjara/FandraisanAnjaraContributorSelector'
import type { FandraisanAnjaraContributorType } from '../src/types/fandraisanAnjara'
import '../src/index.css'
import '../src/pages/public/FandraisanAnjara.css'

const types: FandraisanAnjaraContributorType[] = ['RAZAMBE', 'TARANAKA', 'SAMPANA', 'FOYER', 'PERSONNE']
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const calls: URL[] = []
let failOnce = true
window.fetch = async (url, options) => {
  const parsed = new URL(String(url), location.href)
  if (!parsed.pathname.endsWith('/contributeurs/selection')) throw new Error(`Unexpected network request: ${url}`)
  calls.push(parsed)
  const type = parsed.searchParams.get('type')!
  const query = normalize(parsed.searchParams.get('recherche') ?? '')
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (query === 'erreur' && failOnce) { failOnce = false; return new Response('{}', { status: 503 }) }
  const data = [{ id: `${type}-jose`, libelle: 'Rakoto José' }, { id: `${type}-josette`, libelle: 'Rakoto Josette' }, ...Array.from({ length: 500 }, (_, n) => ({ id: `${type}-${n}`, libelle: `Famille ${n}` }))]
  if (query === 'famille') await new Promise(resolve => setTimeout(resolve, 900))
  const id = parsed.searchParams.get('id')
  const filtered = data.filter(item => id ? item.id === id : query.split(/\s+/).every(word => normalize(item.libelle).includes(word)))
  const page = Number(parsed.searchParams.get('page') ?? 1)
  const offset = (page - 1) * 20
  return new Response(JSON.stringify({ success: true, data: { contributeurs: filtered.slice(offset, offset + 20), pagination: { page, limit: 20, has_more: filtered.length > offset + 20 } } }), { headers: { 'Content-Type': 'application/json' } })
}
export function Harness() {
  const { setLanguage } = useLanguage()
  const [type, setType] = useState<FandraisanAnjaraContributorType>('PERSONNE')
  const [id, setId] = useState('')
  const [disabled, setDisabled] = useState(false)
  return <main className="fandraisan-page"><section className="fandraisan-card fandraisan-form"><div className="fandraisan-form-grid">
    <label>Type<select data-testid="type" value={type} onChange={e => { setType(e.target.value as FandraisanAnjaraContributorType); setId('') }}>{types.map(t => <option key={t}>{t}</option>)}</select></label>
    <FandraisanAnjaraContributorSelector key={type} type={type} value={id} onChange={setId} disabled={disabled} />
  </div><output data-testid="id">{id}</output><button data-testid="outside">Outside</button><button data-testid="restore" onClick={() => { setId(`${type}-jose`); setDisabled(true) }}>Restore</button><button data-testid="mg" onClick={() => setLanguage('mg')}>MG</button></section></main>
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Harness /></LanguageProvider>)
const pause = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms))
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
async function until(check: () => boolean, message: string) {
  for (let n = 0; n < 120; n++) { if (check()) return; await pause() }
  throw new Error(message)
}
const combo = () => document.querySelector<HTMLInputElement>('[role=combobox]')!
const results = () => [...document.querySelectorAll('[role=option]')]
const key = (value: string) => combo().dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }))
const change = (element: HTMLInputElement | HTMLSelectElement, value: string) => {
  Object.getOwnPropertyDescriptor(element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLSelectElement.prototype, 'value')!.set!.call(element, value)
  element.dispatchEvent(new Event(element instanceof HTMLInputElement ? 'input' : 'change', { bubbles: true }))
}
async function search(query: string, count: number) {
  change(combo(), query)
  await pause(350)
  await until(() => document.querySelector('[role=listbox]')?.getAttribute('aria-busy') === 'false' && results().length === count, `search ${query}: ${count} results`)
}
const summaries: string[] = []
async function run() {
  await until(() => !!combo(), 'mounted')
  assert(calls.length === 0, 'no full list loaded on mount')
  for (const type of types) {
    change(document.querySelector<HTMLSelectElement>('[data-testid=type]')!, type)
    await pause()
    combo().focus()
    await until(() => results().length === 20, `${type}: bounded first page`)
    await search('JOSÉ', 2)
    key('ArrowDown'); await pause(); key('ArrowDown'); await pause()
    assert(!!document.getElementById(combo().getAttribute('aria-activedescendant')!), 'active descendant exists')
    key('Enter'); await pause()
    assert(document.querySelector('[data-testid=id]')?.textContent === `${type}-josette`, `${type}: exact ID preserved`)
    assert(combo().value === 'Rakoto Josette', 'selected label remains visible')
    combo().click()
    await until(() => results().length === 20, 'reopen')
    const next = document.querySelector<HTMLButtonElement>('[aria-label="Résultats suivants"]')!
    next.click()
    await until(() => calls.some(u => u.searchParams.get('type') === type && u.searchParams.get('page') === '2') && results().some(e => e.textContent?.includes('Famille 18')), 'next page')
    assert(document.querySelector('.fandraisan-contributor-selected')?.textContent?.includes('Josette'), 'selection retained across pages')
    await search('aucun-introuvable', 0)
    assert(document.querySelector('.fandraisan-contributor-panel')?.textContent?.includes('Aucun résultat'), 'empty state')
    await search('jose', 2)
    key('End'); await pause(); key('Home'); await pause(); key('Enter'); await pause()
    assert(combo().value === 'Rakoto José', 'case and accents ignored')
    combo().click(); await pause(); key('Escape'); await pause()
    assert(combo().getAttribute('aria-expanded') === 'false', 'escape closes')
    combo().click(); await pause(); document.querySelector<HTMLButtonElement>('[data-testid=outside]')!.focus(); await pause()
    assert(combo().getAttribute('aria-expanded') === 'false', 'focus leaving closes')
    const field = document.querySelector<HTMLElement>('.fandraisan-contributor')!
    assert(field.scrollWidth <= field.clientWidth + 1, 'no horizontal field overflow')
    summaries.push(`${type}: accents, similar names, exact ID, 502 items paged, no result, keyboard, focus, responsive OK`)
  }
  combo().click(); await pause(); change(combo(), 'famille'); await pause(400); await search('jose', 2); await pause(1000)
  assert(results().length === 2 && results().every(e => e.textContent?.includes('Rakoto')), 'stale response ignored')
  change(combo(), 'erreur'); await pause(350)
  await until(() => !!document.querySelector('.fandraisan-contributor-panel [role=alert]'), 'network error shown')
  document.querySelector<HTMLButtonElement>('.fandraisan-contributor-panel [role=alert] button')!.click()
  await until(() => !document.querySelector('.fandraisan-contributor-panel [role=alert]') && document.querySelector('[role=listbox]')?.getAttribute('aria-busy') === 'false', 'retry completes')
  document.querySelector<HTMLButtonElement>('[data-testid=restore]')!.click()
  await until(() => combo().disabled && combo().value === 'Rakoto José', 'saved ID restored and locked')
  document.querySelector<HTMLButtonElement>('[data-testid=mg]')!.click(); await pause()
  assert(document.querySelector('.fandraisan-contributor-selected')?.textContent?.includes('Mpandray anjara voafidy'), 'Malagasy translation')
  assert(calls.every(u => !u.pathname.includes('/personnes') && !u.pathname.endsWith('/elements')), 'no complete reference list requested')
  document.getElementById('test-result')!.textContent = JSON.stringify({ passed: true, width: innerWidth, tests: summaries, extra: 'stale responses, error/retry, restored disabled ID, Malagasy OK', requests: calls.length })
}
void run().catch(error => { document.getElementById('test-result')!.textContent = JSON.stringify({ passed: false, error: String(error), tests: summaries }) })
