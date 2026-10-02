import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type {
  PreferencesConfidentialitePersonne,
  UpdatePreferencesConfidentialitePayload,
} from '../types/confidentialitePersonne'

export function getPreferencesConfidentialitePersonne(idPersonne: string) {
  return apiClient<ApiSuccess<PreferencesConfidentialitePersonne>>(
    `/api/personnes/${encodeURIComponent(idPersonne)}/confidentialite`,
  )
}

export function updatePreferencesConfidentialitePersonne(
  idPersonne: string,
  payload: UpdatePreferencesConfidentialitePayload,
) {
  return apiClient<ApiSuccess<PreferencesConfidentialitePersonne>>(
    `/api/personnes/${encodeURIComponent(idPersonne)}/confidentialite`,
    { method: 'PUT', body: payload },
  )
}
