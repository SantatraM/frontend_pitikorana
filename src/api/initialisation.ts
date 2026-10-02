import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type {
  InitialisationStatut,
  PremierAdminCree,
  PremierAdminPayload,
} from '../types/initialisation'

export function getInitialisationStatut() {
  return apiClient<ApiSuccess<InitialisationStatut>>('/api/initialisation/statut')
}

export function creerPremierAdmin(secret: string, payload: PremierAdminPayload) {
  return apiClient<ApiSuccess<PremierAdminCree>>('/api/initialisation/premier-admin', {
    method: 'POST',
    headers: { 'X-Bootstrap-Secret': secret },
    body: payload,
  })
}
