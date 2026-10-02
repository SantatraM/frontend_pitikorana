import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type {
  Activite,
  ActivitePayload,
  CentreInteret,
  Competence,
  DomaineActivite,
  Langue,
  TraductionReferentiel,
  TraductionsReferentielPayload,
} from '../types/adminReferentiels'

type RawRecord = Record<string, unknown>

function record(value: unknown): RawRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RawRecord : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optionalText(value: unknown): string | undefined {
  const result = text(value)
  return result || undefined
}

function normalizeLangue(value: unknown): Langue {
  const raw = record(value)
  return { id: text(raw.id ?? raw._id), code: text(raw.code ?? raw._code), nom: text(raw.nom ?? raw._nom) }
}

function normalizeTraduction(value: unknown): TraductionReferentiel {
  const raw = record(value)
  return {
    id: optionalText(raw.id ?? raw._id),
    id_langue: text(raw.id_langue ?? raw._id_langue),
    code_langue: optionalText(raw.code_langue ?? raw._code_langue),
    libelle: text(raw.libelle ?? raw._libelle),
  }
}

function normalizeTraductions(value: unknown): TraductionReferentiel[] {
  return Array.isArray(value) ? value.map(normalizeTraduction) : []
}

function normalizeDomaine(value: unknown): DomaineActivite {
  const raw = record(value)
  return { id: text(raw.id ?? raw._id), traductions: normalizeTraductions(raw.traductions ?? raw._traductions) }
}

function normalizeActivite(value: unknown): Activite {
  const raw = record(value)
  const domaine = text(raw.id_domaine_activite ?? raw._id_domaine_activite)
  return { id: text(raw.id ?? raw._id), id_domaine_activite: domaine || null, traductions: normalizeTraductions(raw.traductions ?? raw._traductions) }
}

function normalizeCompetence(value: unknown): Competence {
  return normalizeDomaine(value)
}

function normalizeCentre(value: unknown): CentreInteret {
  return normalizeDomaine(value)
}

function list<T>(path: string, normalize: (value: unknown) => T) {
  return apiClient<ApiSuccess<unknown[]>>(path).then((response) => ({ success: true as const, data: (response.data ?? []).map(normalize) }))
}

export const getLangues = () => list('/api/langues', normalizeLangue)
export const getDomainesActivite = () => list('/api/domaines-activite', normalizeDomaine)
export const getActivites = () => list('/api/activites', normalizeActivite)
export const getCompetences = () => list('/api/competences', normalizeCompetence)
export const getCentresInteret = () => list('/api/centres-interet', normalizeCentre)

export const createDomaineActivite = (payload: TraductionsReferentielPayload) => apiClient<ApiSuccess<DomaineActivite>>('/api/domaines-activite', { method: 'POST', body: payload })
export const updateDomaineActivite = (id: string, payload: TraductionsReferentielPayload) => apiClient<ApiSuccess<DomaineActivite>>(`/api/domaines-activite/${id}`, { method: 'PUT', body: payload })
export const deleteDomaineActivite = (id: string) => apiClient<ApiSuccess<DomaineActivite>>(`/api/domaines-activite/${id}`, { method: 'DELETE' })

export const createActivite = (payload: ActivitePayload) => apiClient<ApiSuccess<Activite>>('/api/activites', { method: 'POST', body: payload })
export const updateActivite = (id: string, payload: ActivitePayload) => apiClient<ApiSuccess<Activite>>(`/api/activites/${id}`, { method: 'PUT', body: payload })
export const deleteActivite = (id: string) => apiClient<ApiSuccess<Activite>>(`/api/activites/${id}`, { method: 'DELETE' })

export const createCompetence = (payload: TraductionsReferentielPayload) => apiClient<ApiSuccess<Competence>>('/api/competences', { method: 'POST', body: payload })
export const updateCompetence = (id: string, payload: TraductionsReferentielPayload) => apiClient<ApiSuccess<Competence>>(`/api/competences/${id}`, { method: 'PUT', body: payload })
export const deleteCompetence = (id: string) => apiClient<ApiSuccess<Competence>>(`/api/competences/${id}`, { method: 'DELETE' })

export const createCentreInteret = (payload: TraductionsReferentielPayload) => apiClient<ApiSuccess<CentreInteret>>('/api/centres-interet', { method: 'POST', body: payload })
export const updateCentreInteret = (id: string, payload: TraductionsReferentielPayload) => apiClient<ApiSuccess<CentreInteret>>(`/api/centres-interet/${id}`, { method: 'PUT', body: payload })
export const deleteCentreInteret = (id: string) => apiClient<ApiSuccess<CentreInteret>>(`/api/centres-interet/${id}`, { method: 'DELETE' })
