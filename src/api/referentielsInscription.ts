import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
export interface Traduction { libelle:string; langue?:{code:string}|null }
export interface SexeReference { id:string; code:string; traductions:Traduction[] }
export interface LienReference { id:string; traductions:Traduction[] }
export interface StatutReference { id:string; code?:string; traductions:Traduction[] }
export interface TypeElementReference { id:string; code:string; libelle:string }
export interface ElementReference { id:string; nom:string; id_type_element:string|null; type_element:TypeElementReference|null; parent:{id:string;nom:string}|null }
export interface PaysReference { id:string; nom:string }
export interface RegionReference { id:string; nom:string; id_pays:string; pays:PaysReference|null }
export interface VilleReference { id:string; nom:string; id_region:string; region:RegionReference|null }
type Raw=Record<string,unknown>;const record=(v:unknown):Raw=>v&&typeof v==='object'&&!Array.isArray(v)?v as Raw:{};const str=(v:unknown)=>typeof v==='string'?v:'';const rawId=(x:Raw)=>str(x.id??x._id);const translations=(x:Raw):Traduction[]=>{const list=x.traductions??x._traductions;return Array.isArray(list)?list.map(item=>{const r=record(item);const l=record(r.langue??r._langue);return {libelle:str(r.libelle??r._libelle),langue:l?{code:str(l.code??l._code)}:null}}):[]};const success=<T>(data:T):ApiSuccess<T>=>({success:true,data});
export async function getSexes(){const r=await apiClient<ApiSuccess<unknown[]>>('/api/sexes');return success((r.data??[]).map(v=>{const x=record(v);return{id:rawId(x),code:str(x.code??x._code),traductions:translations(x)}}))}
export async function getStatuts(){const r=await apiClient<ApiSuccess<unknown[]>>('/api/statuts');return success((r.data??[]).map(v=>{const x=record(v);return{id:rawId(x),code:str(x.code??x._code),traductions:translations(x)}}))}
export async function getLiensFalimanjaka(){const r=await apiClient<ApiSuccess<unknown[]>>('/api/liens-falimanjaka');return success((r.data??[]).map(v=>{const x=record(v);return{id:rawId(x),traductions:translations(x)}}))}
export async function getElements(){const r=await apiClient<ApiSuccess<unknown[]>>('/api/elements');return success((r.data??[]).map(v=>{const x=record(v);const t=record(x.type_element??x._type_element);const parent=record(x.parent??x._parent);return{id:rawId(x),nom:str(x.nom??x._nom),id_type_element:str(x.id_type_element??x._id_type_element)||null,type_element:rawId(t)?{id:rawId(t),code:str(t.code??t._code),libelle:str(t.libelle??t._libelle)}:null,parent:rawId(parent)?{id:rawId(parent),nom:str(parent.nom??parent._nom)}:null}}))}
export async function getTypesElement(){const r=await apiClient<ApiSuccess<unknown[]>>('/api/types-element');return success((r.data??[]).map(v=>{const x=record(v);return{id:rawId(x),code:str(x.code??x._code),libelle:str(x.libelle??x._libelle)}}).filter(type=>type.id&&type.libelle))}
export async function getPays(){const r=await apiClient<ApiSuccess<unknown[]>>('/api/pays');return success((r.data??[]).map(v=>{const x=record(v);return{id:rawId(x),nom:str(x.nom??x._nom)}}))}
export async function getRegions(){const r=await apiClient<ApiSuccess<unknown[]>>('/api/regions');return success((r.data??[]).map(v=>{const x=record(v);const p=record(x.pays??x._pays);return{id:rawId(x),nom:str(x.nom??x._nom),id_pays:str(x.id_pays??x._id_pays),pays:rawId(p)?{id:rawId(p),nom:str(p.nom??p._nom)}:null}}))}
export async function getVilles(){const r=await apiClient<ApiSuccess<unknown[]>>('/api/villes');return success((r.data??[]).map(v=>{const x=record(v);const re=record(x.region??x._region);const pa=record(re.pays??re._pays);return{id:rawId(x),nom:str(x.nom??x._nom),id_region:str(x.id_region??x._id_region),region:rawId(re)?{id:rawId(re),nom:str(re.nom??re._nom),id_pays:str(re.id_pays??re._id_pays),pays:rawId(pa)?{id:rawId(pa),nom:str(pa.nom??pa._nom)}:null}:null}}))}
export interface CreateElementPayload {
  id_type_element: string
  nom: string
  autres_appellations: null
  id_sexe: null
  nom_conjoint: null
  ville_origine_conjoint: null
  rattachement_sup: string | null
  etat: 0
}

export function createElement(payload: CreateElementPayload) {
  return apiClient<ApiSuccess<ElementReference>>('/api/elements', { method: 'POST', body: payload })
}
