import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type { TetikasaTransitionAction, TetikasaStatusCode } from '../types/tetikasa'
import type { TetikasaActionPayload, TetikasaBudgetPayload, TetikasaDetail, TetikasaListItem, TetikasaMainUpdatePayload, TetikasaResponsablePayload, TetikasaRessourcePayload } from '../types/tetikasa'

type TetikasaContentUpdateResponse = ApiSuccess<{ modified: boolean; tetikasa: { id: string; statut: string; revision: string } }>

export type TetikasaCreationPayload = TetikasaMainUpdatePayload & {
  action: 'BROUILLON' | 'SOUMETTRE'
  titre: string
  devise: 'MGA'
  responsables: TetikasaResponsablePayload[]
  actions: TetikasaActionPayload[]
  ressources: TetikasaRessourcePayload[]
  budget: TetikasaBudgetPayload[]
}

export async function createTetikasa(payload: TetikasaCreationPayload) {
  const response = await apiClient<ApiSuccess<{ tetikasa: { id: string; statut: TetikasaStatusCode; revision: string } }>>(
    '/api/tetikasa', { method: 'POST', body: payload, retryAfterRefresh: false, expectedStatus: 201 },
  )
  if (response?.success !== true || !response.data?.tetikasa || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(response.data.tetikasa.id ?? '')) {
    throw new Error('Réponse de création invalide')
  }
  return response.data.tetikasa
}

export function transitionTetikasa(id: string, action: TetikasaTransitionAction, revision: string, commentaire: string | null) {
  return apiClient<ApiSuccess<{ tetikasa: { id: string; statut: TetikasaStatusCode; revision: string }; action: TetikasaTransitionAction }>>(
    `/api/tetikasa/${encodeURIComponent(id)}/transition`,
    { method: 'POST', body: { action, revision, commentaire } },
  )
}

export function listTetikasa() {
  return apiClient<ApiSuccess<TetikasaListItem[]>>('/api/tetikasa')
}
export function getTetikasa(id: string) {
  return apiClient<ApiSuccess<TetikasaDetail>>(`/api/tetikasa/${encodeURIComponent(id)}`)
}

export function updateTetikasa(id: string, payload: TetikasaMainUpdatePayload) {
  return apiClient<ApiSuccess<{ modified: boolean; tetikasa: { id: string; statut: string } }>>(
    `/api/tetikasa/${encodeURIComponent(id)}`,
    { method: 'PUT', body: payload },
  )
}

function updateTetikasaContent(id: string, revision: string, collection: Record<string, unknown>) {
  return apiClient<TetikasaContentUpdateResponse>(
    `/api/tetikasa/${encodeURIComponent(id)}/contenu`,
    { method: 'PUT', body: { mode: 'SYNCHRONISATION_UUID_V1', revision, ...collection } },
  )
}

export function updateTetikasaResponsables(id: string, revision: string, responsables: TetikasaResponsablePayload[]) {
  return updateTetikasaContent(id, revision, { responsables })
}

export function updateTetikasaActions(id: string, revision: string, actions: TetikasaActionPayload[]) {
  return updateTetikasaContent(id, revision, { actions })
}

export function updateTetikasaRessources(id: string, revision: string, ressources: TetikasaRessourcePayload[]) {
  return updateTetikasaContent(id, revision, { ressources })
}

export function updateTetikasaBudget(id: string, revision: string, budget: TetikasaBudgetPayload[]) {
  return updateTetikasaContent(id, revision, { budget })
}
