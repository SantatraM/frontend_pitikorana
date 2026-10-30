import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type { TetikasaActionPayload, TetikasaBudgetPayload, TetikasaDetail, TetikasaMainUpdatePayload, TetikasaResponsablePayload, TetikasaRessourcePayload } from '../types/tetikasa'

type TetikasaContentUpdateResponse = ApiSuccess<{ modified: boolean; tetikasa: { id: string; statut: string; revision: string } }>

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