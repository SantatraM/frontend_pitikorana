import { apiClient, ApiError } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type { InformationDraft, InformationTicket, InformationItem, InformationList, InformationStatus } from '../types/demandeInformation'
import type { TranslationKey, Translator } from '../i18n/types'
const base = '/api/demandes-information'
export const prepareInformation = (signal?: AbortSignal) => apiClient<ApiSuccess<InformationTicket>>(`${base}/preparation`, { signal, retryAfterRefresh: false, cache: 'no-store' })
export const sendInformation = (draft: InformationDraft, ticket: InformationTicket, guest = false, website = '') => apiClient<ApiSuccess<{ accepted: boolean }>>(base, {
  method: 'POST', headers: { 'Idempotency-Key': ticket.key }, body: { ...draft, token: ticket.token, website },
  retryAfterRefresh: false, ...(guest ? { credentials: 'omit' as const } : {}),
})
export const listInformation = (filters: { recherche: string; statut: InformationStatus | ''; page: number }, signal?: AbortSignal) => {
  const params = new URLSearchParams({ page: String(filters.page), limit: '20' })
  if (filters.recherche.trim()) params.set('recherche', filters.recherche.trim())
  if (filters.statut) params.set('statut', filters.statut)
  return apiClient<ApiSuccess<InformationList>>(`${base}?${params}`, { signal, cache: 'no-store' })
}
export const getInformation = (id: string, signal?: AbortSignal) => apiClient<ApiSuccess<InformationItem>>(`${base}/${encodeURIComponent(id)}`, { signal, cache: 'no-store' })
export const informationStats = (signal?: AbortSignal) => apiClient<ApiSuccess<{ nouvelles: number }>>(`${base}/statistiques`, { signal, cache: 'no-store' })
export const changeInformationStatus = (id: string, statut: InformationStatus, revision: number) => apiClient<ApiSuccess<InformationItem>>(`${base}/${encodeURIComponent(id)}/statut`, { method: 'PATCH', body: { statut, revision }, retryAfterRefresh: false })
const errors: Record<string, TranslationKey> = {
  INFORMATION_INVALID: 'information.errors.invalid', INFORMATION_CONTACT_INVALID: 'information.invalidContact', INFORMATION_TOO_LARGE: 'information.errors.invalid',
  INFORMATION_SCHEMA_REQUIRED: 'information.errors.notReady',
  INFORMATION_UNAVAILABLE: 'information.errors.unavailable', INFORMATION_RATE_LIMIT: 'information.errors.limit', INFORMATION_TOKEN_INVALID: 'information.errors.token',
  INFORMATION_ORIGIN_FORBIDDEN: 'information.errors.origin', INFORMATION_FORBIDDEN: 'information.errors.forbidden', INFORMATION_NOT_FOUND: 'information.errors.notFound',
  INFORMATION_REVISION_CONFLICT: 'information.errors.conflict', INFORMATION_IDEMPOTENCY_CONFLICT: 'information.errors.duplicate',
}
export const informationErrorMessage = (error: unknown, t: Translator) => t(error instanceof ApiError ? errors[error.response?.code ?? ''] ?? (error.status === 401 ? 'information.session' : error.status === 403 ? 'information.errors.forbidden' : 'information.errors.unavailable') : 'information.errors.unavailable')
