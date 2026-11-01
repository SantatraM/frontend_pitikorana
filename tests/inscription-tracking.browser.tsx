import { createRoot } from 'react-dom/client'
import { AuthContext } from '../src/contexts/AuthContext'
import { LanguageProvider } from '../src/i18n/LanguageContext'
import { AppRouter } from '../src/routes/AppRouter'
import { normalizeTrackingCode } from '../src/utils/inscriptionTracking'
import '../src/index.css'

const delay=(ms=60)=>new Promise(resolve=>setTimeout(resolve,ms))
const assert=(value:unknown,message:string)=>{if(!value)throw new Error(message)}
async function until(check:()=>boolean,message:string){for(let n=0;n<250;n++){if(check())return;await delay()}throw new Error(message)}
const click=(selector:string)=>{const element=document.querySelector<HTMLElement>(selector);assert(element,selector);element!.click()}
const edit=(selector:string,value:string)=>{const element=document.querySelector<HTMLInputElement>(selector)!;assert(element,selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}))}
const noOverflow=(where:string)=>assert(document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,`${where}: horizontal overflow`)
const reference='PIT-2026-ABCDEFGH';const short='KRM-58329';const legacy='ABCD-EFGH-JKLM-NPQR'
const requests:{path:string,body:Record<string,unknown>}[]=[]
let status=200;let copied=''
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{copied=value}}})
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
window.fetch=async(input,options)=>{
 const path=new URL(String(input),location.href).pathname
 const body=typeof options?.body==='string'?JSON.parse(options.body):{}
 requests.push({path,body})
 if(path.endsWith('/recherche-personne'))return json({success:true,data:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',nom:'Rabe',prenom:'Test'}]})
 if(path.endsWith('/photo-temporaire'))return json({success:true,data:{chemin_photo_temporaire:'demandes-inscription/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp'}})
 if(path==='/api/demandes-inscription')return json({success:true,data:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',reference,code_suivi:short,statut:'EN_ATTENTE',date_demande:'2026-11-01T00:00:00Z'}})
 if(path.endsWith('/suivi')){
   if(status!==200)return json({success:false,code:status===429?'TRACKING_RATE_LIMIT':'SUIVI_INVALID',message:'generic backend error'},status)
   assert(body.reference===reference,'reference submitted separately');assert([short,legacy].includes(String(body.code_suivi)),'valid canonical code sent')
   return json({success:true,data:{reference,statut:'EN_ATTENTE',date_demande:'2026-11-01T00:00:00Z',date_traitement:null,commentaire_admin:null}})
 }
 return json({success:false},503)
}
history.replaceState(null,'','/inscription')
createRoot(document.getElementById('root')!).render(<LanguageProvider><AuthContext.Provider value={{user:null,isAuthenticated:false,isLoading:false,login:async()=>{throw new Error('not used')},logout:async()=>undefined,refreshAuth:async()=>undefined}}><AppRouter/></AuthContext.Provider></LanguageProvider>)
const summary:string[]=[]
async function run(){
 for(const value of ['krm58329','KRM-58329'])assert(normalizeTrackingCode(value)===short,'short frontend canonicalization')
 assert(normalizeTrackingCode(legacy.toLowerCase())===legacy,'legacy canonicalization');assert(normalizeTrackingCode('KRM-58320')===null,'ambiguous digit rejected')
 await until(()=>!!document.querySelector('#person-search'),'registration ready');edit('#person-search','Rabe');await delay();click('.registration-search-form button[type=submit]')
 await until(()=>!!document.querySelector('.registration-person-result'),'person search');click('.registration-person-result');await delay();click('.registration-results>.registration-primary-action')
 await until(()=>!!document.querySelector('.inscription-form input[name=email]'),'registration form');edit('input[name=email]','test@example.invalid')
 const file=document.querySelector<HTMLInputElement>('input[type=file]')!;const transfer=new DataTransfer();transfer.items.add(new File(['fixture'],'test.png',{type:'image/png'}));file.files=transfer.files;file.dispatchEvent(new Event('change',{bubbles:true}));await delay()
 click('.inscription-form button[type=submit]');await until(()=>!!document.querySelector('.registration-confirmation-values'),'confirmation')
 const codes=[...document.querySelectorAll('.registration-confirmation-values code')].map(node=>node.textContent);assert(codes[0]===reference&&codes[1]===short,'distinct unchanged reference and short code');noOverflow('confirmation FR')
 click('.registration-confirmation-values section:nth-child(2) button');await delay();assert(copied===short,'copy code')
 click('.registration-confirmation-page .language-switch button:nth-child(2)');await delay();assert(document.querySelector('.registration-confirmation-values section:nth-child(2) strong')?.textContent==='Kaody fanarahana','MG confirmation');noOverflow('confirmation MG')
 click('.registration-confirmation-page .language-switch button:first-child');await delay();click('.registration-follow-action')
 await until(()=>!!document.querySelector('.registration-tracking-form'),'tracking ready')
 assert(document.querySelector<HTMLInputElement>('.registration-tracking-form input')?.value===reference,'reference prefilled separately')
 for(const value of [short,short.replace('-',''),legacy.toLowerCase()]){
  edit('.registration-tracking-form input[autocomplete=one-time-code]',value);await delay();click('.registration-tracking-form button[type=submit]');await until(()=>!!document.querySelector('.registration-tracking-result')&&!document.querySelector('.registration-tracking-error'),'tracking result');await delay();assert(requests.filter(r=>r.path.endsWith('/suivi')).at(-1)?.body.code_suivi===normalizeTrackingCode(value),'canonical submission');noOverflow('tracking result')
 }
 const before=requests.length;edit('.registration-tracking-form input[autocomplete=one-time-code]','KRM-58320');await delay();click('.registration-tracking-form button[type=submit]');await until(()=>!!document.querySelector('.registration-tracking-error'),'invalid input');assert(requests.length===before,'bad format blocked locally')
 edit('.registration-tracking-form input[autocomplete=one-time-code]',short);await delay();status=401;click('.registration-tracking-form button[type=submit]');await until(()=>document.querySelector('.registration-tracking-error')?.textContent?.includes('Référence ou code')??false,'generic invalid credentials')
 status=429;click('.registration-tracking-form button[type=submit]');await until(()=>document.querySelector('.registration-tracking-error')?.textContent?.includes('15 minutes')??false,'FR rate limit')
 click('.registration-tracking-language button:nth-child(2)');await delay();click('.registration-tracking-form button[type=submit]');await until(()=>document.querySelector('.registration-tracking-error')?.textContent?.includes('15 minitra')??false,'MG rate limit');assert(document.querySelector('#tracking-code-help')?.textContent?.includes('kaody lava taloha'),'MG code help');noOverflow('tracking MG')
 summary.push('Confirmation FR/MG: unchanged reference, short code and copy; tracking with/without hyphen and legacy code; validations, generic errors, throttling messages; no horizontal overflow')
 document.getElementById('test-result')!.textContent=JSON.stringify({passed:true,width:innerWidth,tests:summary})
}
void run().catch(error=>{document.getElementById('test-result')!.textContent=JSON.stringify({passed:false,width:innerWidth,error:String(error),tests:summary})})
