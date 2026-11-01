import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from '../src/contexts/AuthContext'
import { LanguageProvider } from '../src/i18n/LanguageContext'
import { AppRouter } from '../src/routes/AppRouter'
import type { AuthRole, AuthUser } from '../src/types/auth'
import '../src/index.css'

const delay = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms))
const requests: { url: URL; body?: Record<string, unknown>; method: string; headers: Headers; credentials?: RequestCredentials }[] = []
const personId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const rows = Array.from({ length: 43 }, (_, n) => ({ id: `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`, nom: 'Rabe', prenom: `José ${n}`, contact: `personne${n}@exemple.mg`, message: 'Une demande confidentielle.\n<img src=x onerror="window.informationXss=true">\n' + 'Message long à consulter. '.repeat(30), origine: n % 2 ? 'VISITEUR' : 'MEMBRE', statut: n % 3 ? 'TRAITEE' : 'NOUVELLE', date_creation: '2026-11-01T08:00:00.000Z', date_modification: '2026-11-01T08:00:00.000Z', revision: 1 }))
const accepted = new Map<string, string>()
let failSubmission = false; let rateLimitNextRetry = false; let expireNextRetry = false; let conflictNext = false; let ticketNumber = 0
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
window.fetch = async (url, options) => {
  const target = new URL(String(url), location.href); const method = options?.method ?? 'GET';const headers=new Headers(options?.headers)
  const body = typeof options?.body === 'string' ? JSON.parse(options.body) : undefined
  requests.push({ url: target, method, body, headers, credentials: options?.credentials })
  if (target.pathname === '/api/demandes-information/preparation') return json({success:true,data:{key:`ticket-${++ticketNumber}`,token:'test-signed-token',expires_at:'2099-01-01T00:00:00Z'}})
  if (target.pathname === `/api/personnes/${personId}`) { await delay(500);return json({success:true,data:{id:personId,nom:'Profil',prenom:'Fiable',contact:{email:'profil@example.mg',telephone:'0341234567'}}}) }
  if (target.pathname === '/api/demandes-information' && method === 'POST') {
    await delay(120)
    if(expireNextRetry){expireNextRetry=false;return json({success:false},401)}
    if(rateLimitNextRetry){rateLimitNextRetry=false;return json({success:false,code:'INFORMATION_RATE_LIMIT'},429)}
    const key=headers.get('Idempotency-Key')!;const canonical=JSON.stringify(body)
    if(accepted.has(key)&&accepted.get(key)!==canonical)return json({success:false,code:'INFORMATION_IDEMPOTENCY_CONFLICT'},409)
    accepted.set(key,canonical)
    if(failSubmission){failSubmission=false;throw new Error('simulated lost response')}
    return json({success:true,data:{accepted:true}},201)
  }
  if(target.pathname === '/api/demandes-information/statistiques')return json({success:true,data:{nouvelles:rows.filter(r=>r.statut==='NOUVELLE').length}})
  if(target.pathname === '/api/demandes-information'){
    const words=normalize(target.searchParams.get('recherche')??'').split(/\s+/).filter(Boolean);const status=target.searchParams.get('statut');const page=Number(target.searchParams.get('page')??1)
    const filtered=rows.filter(r=>(!status||r.statut===status)&&words.every(w=>normalize(`${r.nom} ${r.prenom} ${r.contact}`).includes(w)))
    return json({success:true,data:{demandes:filtered.slice((page-1)*20,page*20).map(({message,...r})=>{void message;return r}),pagination:{page,limit:20,total:filtered.length,total_pages:Math.ceil(filtered.length/20)}}})
  }
  const match=target.pathname.match(/^\/api\/demandes-information\/([^/]+)(\/statut)?$/)
  if(match){const row=rows.find(r=>r.id===match[1]);if(!row)return json({success:false,code:'INFORMATION_NOT_FOUND'},404)
    if(method==='PATCH'){if(conflictNext){conflictNext=false;row.revision++;return json({success:false,code:'INFORMATION_REVISION_CONFLICT'},409)}row.statut=String(body?.statut);row.revision++}
    return json({success:true,data:row})
  }
  // Every request remains simulated, including dashboards reached by guards.
  return json({success:false,code:'TEST_UNUSED_API'},503)
}
const adminCapture = new URLSearchParams(location.search).has('capture')
history.replaceState(null,'','/demande-information')
export function InformationBrowserHarness(){
  const [user,setUser]=useState<AuthUser|null>(null)
  const [authLoading,setAuthLoading]=useState(true)
  const role=(value:AuthRole|null)=>{history.replaceState(null,'','/demande-information');setUser(value?{compte:{id:'11111111-1111-4111-8111-111111111111',role:value,statut:'ACTIF'},personne:{id:personId,nom:'Profil',prenom:'Fiable',nom_usage:null}}:null)}
  return <LanguageProvider><AuthContext.Provider value={{user,isAuthenticated:!!user,isLoading:authLoading,login:async()=>user!,logout:async()=>setUser(null),refreshAuth:async()=>undefined}}>
    <div hidden><button data-auth="confirmed" onClick={()=>setAuthLoading(false)}>Confirm auth</button>{(['ADMIN','PASTEUR','MEMBRE','BUREAU_ZANAKA_AMPIELEZANA'] as const).map(r=><button key={r} data-role={r} onClick={()=>role(r)}>{r}</button>)}<button data-role="VISITEUR" onClick={()=>role(null)}>VISITEUR</button></div>
    <AppRouter key={user?.compte.role??'VISITEUR'} />
  </AuthContext.Provider></LanguageProvider>
}
createRoot(document.getElementById('root')!).render(<InformationBrowserHarness />)
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)}
async function until(check:()=>boolean,message:string){for(let n=0;n<300;n++){if(check())return;await delay()}throw new Error(message)}
const input=(field:string)=>document.getElementById(`information-${field}`) as HTMLInputElement|HTMLTextAreaElement
const edit=(element:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement,value:string)=>{const prototype=element instanceof HTMLSelectElement?HTMLSelectElement.prototype:element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(element,value);element.dispatchEvent(new Event(element instanceof HTMLSelectElement?'change':'input',{bubbles:true}))}
const click=(selector:string)=>document.querySelector<HTMLButtonElement>(selector)!.click()
const go=(path:string)=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'))}
const noOverflow=(where:string)=>assert(document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,`${where}: no horizontal overflow (${document.documentElement.scrollWidth}/${innerWidth})`)
function checkConnectedInformation(){
  assert(location.pathname==='/demande-information','connected user remains on information page')
  assert(!!document.querySelector('.admin-sidebar')&&!!document.querySelector('.admin-language-switch'),'usual connected navigation and language selector')
  assert(!document.querySelector('.information-page-tools')&&!document.querySelector('.information-back-login')&&!document.querySelector('.information-language-switch')&&!document.querySelector('.information-eyebrow'),'no public return, branding or duplicate language switch for connected user')
}
const summary:string[]=[]
async function run(){
  await until(()=>!!document.querySelector('.information-form'),'form while auth resolves')
  assert(!document.querySelector('.information-page-tools')&&!document.querySelector('.information-eyebrow'),'no public header before auth confirmation')
  assert(location.pathname==='/demande-information','no redirect during auth confirmation')
  click('[data-auth=confirmed]');await until(()=>!!document.querySelector('.information-back-login'),'confirmed visitor public controls')
  go('/connexion');await until(()=>!!document.querySelector('.login-help-links a'),'login help ready');await delay(250)
  assert(!document.querySelector('.information-public-nav'),'no shared header on login')
  assert(!!document.querySelector('.login-hero-image')&&!!document.querySelector('.login-card .login-wordmark')&&!!document.querySelector('.forgot-password'),'login design and shortcuts preserved')
  assert(document.querySelector('.login-help-links a')?.textContent==='Besoin d’aide ?','French login help')
  noOverflow('login FR')
  ;[...document.querySelectorAll<HTMLButtonElement>('.language-switch button')].find(b=>b.textContent==='MG')!.click();await delay()
  assert(document.querySelector('.login-help-links a')?.textContent==='Mila fanampiana ve?','Malagasy login help');noOverflow('login MG')
  ;[...document.querySelectorAll<HTMLButtonElement>('.language-switch button')].find(b=>b.textContent==='FR')!.click();await delay()
  click('.login-help-links a')
  await until(()=>!!document.querySelector('.information-back-login'),'public return link ready')
  assert(!document.querySelector('.information-public-nav'),'no shared header on information form')
  assert(document.querySelector('.information-back-login')?.textContent?.includes('Retour à la connexion'),'French return link')
  click('.information-language-switch button:nth-child(2)');await delay()
  assert(document.querySelector('#information-title')?.textContent==='Fangataham-panazavana','public Malagasy form')
  assert(document.querySelector('.information-back-login')?.textContent?.includes('Hiverina amin’ny fidirana'),'Malagasy return link');noOverflow('public MG')
  edit(input('nom'),'Saisie conservée');await delay();click('.information-language-switch button:first-child');await delay();assert(input('nom').value==='Saisie conservée','language switch preserves draft')
  click('.information-back-login');await until(()=>!!document.querySelector('.login-help-links'),'return to login')
  assert(location.pathname==='/connexion','return path');noOverflow('returned login')
  for(const path of ['/inscription','/suivi-inscription']){go(path);await until(()=>!!document.querySelector('.information-public-nav'),'other public header preserved');assert(document.querySelector('.information-public-nav a[href="/demande-information"]'),'other public page retains navigation')}
  go('/connexion');await until(()=>!!document.querySelector('.login-help-links'),'login after other public pages');click('.login-help-links a')
  summary.push('Simplified login/information pages, both directions, FR/MG and other public headers preserved')
  await until(()=>!!document.querySelector('.information-form button[type=submit]:not(:disabled)'),'public form ready')
  assert(document.querySelectorAll('input[type=password]').length===0,'no password requested')
  assert(!document.querySelector('.information-public-nav'),'public information header removed')
  noOverflow('public')
  assert(getComputedStyle(document.body).backgroundColor==='rgb(255, 255, 255)','white page background')
  assert(getComputedStyle(input('nom')).backgroundColor==='rgb(255, 255, 255)','white input background')
  const nameBox=input('nom').getBoundingClientRect();const firstBox=input('prenom').getBoundingClientRect();const contactBox=input('contact').getBoundingClientRect();const messageBox=input('message').getBoundingClientRect()
  if(innerWidth>600){assert(Math.abs(nameBox.top-firstBox.top)<2&&firstBox.left>nameBox.right,'desktop names in two columns')}else{assert(firstBox.top>nameBox.bottom&&Math.abs(nameBox.left-firstBox.left)<2,'mobile names stacked')}
  assert(contactBox.width>=nameBox.width&&Math.abs(contactBox.width-messageBox.width)<2,'contact and message span form width')
  assert(messageBox.height>=190,'comfortable message area')
  assert(Math.abs(document.querySelector('.information-form button[type=submit]')!.getBoundingClientRect().width-contactBox.width)<2,'full width submit button')
  summary.push('White Contributions palette, responsive field grid and full width blue submit button')
  click('.information-form button[type=submit]');await delay()
  assert(document.querySelectorAll('[aria-invalid=true]').length===4,'required fields validated')
  edit(input('nom'),'Rabe');edit(input('prenom'),'José');edit(input('contact'),'bad');edit(input('message'),'Court');await delay();click('.information-form button[type=submit]');await delay();assert(input('contact').getAttribute('aria-invalid')==='true','invalid contact rejected')
  edit(input('contact'),'rabe@example.mg');edit(input('message'),'Bonjour, je souhaite des informations sur la paroisse.');await delay()
  const before=requests.filter(r=>r.method==='POST').length;click('.information-form button[type=submit]');click('.information-form button[type=submit]')
  await until(()=>!!document.querySelector('.information-success'),'visitor success')
  assert(requests.filter(r=>r.method==='POST').length===before+1,'double click creates one POST')
  const sent=requests.filter(r=>r.method==='POST').at(-1)!;assert(!('origine' in sent.body!)&&!('id_compte_membre' in sent.body!),'server-owned origin/account omitted')
  summary.push('Visitor: required fields, contact/message validation, success and double-click OK')
  click('.information-success button');await until(()=>!!document.querySelector('.information-form button[type=submit]:not(:disabled)'),'another form')
  edit(input('nom'),'Rabe');edit(input('prenom'),'José');edit(input('contact'),'rabe@example.mg');edit(input('message'),'Une demande après une coupure de réseau.');await delay();failSubmission=true
  click('.information-form button[type=submit]');await until(()=>!!document.querySelector('.information-error'),'lost response shown');assert(input('message').disabled,'uncertain payload locked')
  const uncertain=requests.filter(r=>r.method==='POST').at(-1)!;rateLimitNextRetry=true;click('.information-form button[type=submit]');await until(()=>document.querySelector('.information-error')?.textContent?.includes('Trop de demandes')??false,'retry temporarily limited');assert(input('message').disabled,'rate limit preserves uncertain payload');expireNextRetry=true;click('.information-form button[type=submit]');await until(()=>!!document.querySelector('.information-error a[target="_blank"]'),'expired session retains original identity');assert(input('message').disabled,'expired session preserves uncertain payload');assert(!document.querySelector('.information-error button'),'no switch to visitor while original send is uncertain');click('.information-form button[type=submit]');await until(()=>!!document.querySelector('.information-success'),'same request retry')
  const retried=requests.filter(r=>r.method==='POST').at(-1)!;assert(uncertain.headers.get('Idempotency-Key')===retried.headers.get('Idempotency-Key')&&JSON.stringify(uncertain.body)===JSON.stringify(retried.body),'same key and payload on retry')
  summary.push('Lost response: preserved fields and idempotent retry OK')
  click('[data-role=MEMBRE]');await until(()=>!!input('nom'),'member form');checkConnectedInformation()
  edit(input('nom'),'Nom modifié');edit(input('contact'),'modifie@example.mg');await delay(750)
  assert(input('nom').value==='Nom modifié'&&input('contact').value==='modifie@example.mg','late prefill preserves edits');assert(input('prenom').value==='Fiable','reliable first name prefilled')
  assert(document.querySelector('.information-public-nav')===null,'member reuses sidebar')
  assert(document.querySelectorAll('a[href="/demande-information"]').length===1,'one sidebar link')
  const mg=[...document.querySelectorAll<HTMLButtonElement>('.admin-language-switch button')].find(b=>b.textContent==='MG')!;mg.click();await delay();assert(document.querySelector('#information-title')?.textContent==='Fangataham-panazavana','Malagasy translation')
  ;[...document.querySelectorAll<HTMLButtonElement>('.admin-language-switch button')].find(b=>b.textContent==='FR')!.click();await delay();noOverflow('member form')
  if(innerWidth<=768){click('.membre-menu-trigger');await until(()=>!!document.querySelector('.admin-mobile-drawer'),'mobile drawer');assert(document.querySelectorAll('.admin-mobile-drawer a[href="/demande-information"]').length===1,'one mobile link');document.querySelector<HTMLButtonElement>('.admin-mobile-close')!.click();await delay()}
  summary.push('Member: editable prefill without overwrite, shared navigation and Malagasy OK')
  for(const role of ['VISITEUR','MEMBRE','BUREAU_ZANAKA_AMPIELEZANA']){
    click(`[data-role=${role}]`);await delay();if(role!=='VISITEUR')checkConnectedInformation();assert(!document.querySelector('a[href="/admin/demandes-information"]'),'no management navigation for '+role);const start=requests.length;go('/admin/demandes-information');await delay(500)
    assert(!document.querySelector('.information-admin'),'unauthorized admin page blocked');assert(!requests.slice(start).some(r=>r.url.pathname==='/api/demandes-information'&&r.method==='GET'),'unauthorized list not requested')
  }
  summary.push('Visitor, member and BUREAU excluded from management')
  for(const role of ['ADMIN','PASTEUR']){
    click(`[data-role=${role}]`);await delay();
    checkConnectedInformation()
    const checkGroup=(root:Element)=>{const group=root.querySelector('.information-navigation-group')!;assert(!!group,'single information group');assert(group.querySelectorAll('a').length===2,'two information sublinks');assert(group.querySelector('a[href="/demande-information"]')?.textContent==='Nouvelle demande','new request sublink');assert(group.querySelector('a[href="/admin/demandes-information"]')?.textContent==='Liste des demandes','list sublink')}
    checkGroup(document.querySelector('.admin-sidebar')!)
    ;[...document.querySelectorAll<HTMLButtonElement>('.admin-language-switch button')].find(b=>b.textContent==='MG')!.click();await delay();assert(document.querySelector('.information-navigation-heading')?.textContent==='Fangataham-panazavana','MG group title');assert(document.querySelector('.information-navigation-children a')?.textContent==='Fangatahana vaovao','MG new request')
    ;[...document.querySelectorAll<HTMLButtonElement>('.admin-language-switch button')].find(b=>b.textContent==='FR')!.click();await delay()
    if(innerWidth<=768){click('.admin-menu-trigger');await until(()=>!!document.querySelector('.admin-mobile-drawer'),'admin mobile drawer');checkGroup(document.querySelector('.admin-mobile-drawer')!);click('.admin-mobile-drawer a[href="/admin/demandes-information"]')}else click('.information-navigation-children a[href="/admin/demandes-information"]');await until(()=>document.querySelectorAll('.information-table-wrap tbody tr').length===20,`${role} server list`);noOverflow(`${role} list`)
    const next=[...document.querySelectorAll<HTMLButtonElement>('.information-pagination button')].find(b=>b.textContent==='Page suivante')!;next.click();await until(()=>document.querySelector('.information-pagination')?.textContent?.includes('Page 2')??false,'server next page')
    assert(requests.some(r=>r.url.searchParams.get('page')==='2'),'page 2 requested')
    edit(document.querySelector<HTMLInputElement>('.information-admin-search input')!,role==='ADMIN'?'JOSÉ 21':'JOSÉ 24');await until(()=>document.querySelectorAll('.information-table-wrap tbody tr').length===1,'search result')
    edit(document.querySelector<HTMLSelectElement>('.information-admin-filters select')!,'NOUVELLE');await until(()=>requests.at(-2)?.url.searchParams.get('statut')==='NOUVELLE'||requests.at(-1)?.url.searchParams.get('statut')==='NOUVELLE','status filter sent');await delay(300)
    document.querySelector<HTMLAnchorElement>('.information-view')!.click();await until(()=>!!document.querySelector('.information-message'),'message detail');noOverflow(`${role} detail`)
    assert(document.querySelector('.information-message p')?.textContent?.includes('<img'),'message rendered as plain text');assert(!document.querySelector('.information-message img'),'no HTML execution')
    const select=document.querySelector<HTMLSelectElement>('#information-status')!;edit(select,select.value==='EN_COURS'?'TRAITEE':'EN_COURS');await delay();click('.information-status-form button');await until(()=>!!document.querySelector('.information-saved'),'status saved')
    conflictNext=true;edit(select,select.value==='TRAITEE'?'EN_COURS':'TRAITEE');await delay();click('.information-status-form button');await until(()=>!!document.querySelector('.information-error'),'revision conflict');assert(document.querySelector<HTMLButtonElement>('.information-status-form button')!.disabled,'conflict requires reload');click('.information-error button');await until(()=>!!document.querySelector('#information-status')&&!document.querySelector('.information-error'),'detail reloaded')
    summary.push(`${role}: paginated list, search/filter, detail, safe text and status conflict OK`)
  }
  click('[data-role=VISITEUR]');await until(()=>!!document.querySelector('.information-form'),'final public form');await delay(200);noOverflow('final public')
  window.scrollTo(0,0);window.parent.scrollTo(0,0)
  document.getElementById('test-result')!.textContent=JSON.stringify({passed:true,width:innerWidth,tests:summary})
}
async function captureAdmin(){
  await until(()=>!!document.querySelector('[data-role=ADMIN]'),'harness ready');click('[data-auth=confirmed]');click('[data-role=ADMIN]');await delay();go('/admin/demandes-information');await until(()=>document.querySelectorAll('.information-table-wrap tbody tr').length===20,'admin list ready');noOverflow('admin capture');window.scrollTo(0,0);window.parent.scrollTo(0,0);document.getElementById('test-result')!.textContent=JSON.stringify({passed:true,width:innerWidth,tests:['admin visual capture']});
}
void (adminCapture?captureAdmin():run()).catch(error=>{document.getElementById('test-result')!.textContent=JSON.stringify({passed:false,width:innerWidth,error:String(error),tests:summary})})
