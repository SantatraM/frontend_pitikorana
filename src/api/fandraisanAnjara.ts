import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type { FandraisanAnjaraCreatePayload, FandraisanAnjaraFoyerSelectionResponse, FandraisanAnjaraHistoryResponse, FandraisanAnjaraListResponse, FandraisanAnjaraMutationResult, FandraisanAnjaraPeriodFilters, FandraisanAnjaraRazambeDetail, FandraisanAnjaraRazambeList, FandraisanAnjaraStatistics, FandraisanAnjaraStatus, FandraisanAnjaraUpdatePayload } from '../types/fandraisanAnjara'

function query(filters: FandraisanAnjaraPeriodFilters) { const params = new URLSearchParams(); if (filters.date_debut) params.set('date_debut', filters.date_debut); if (filters.date_fin) params.set('date_fin', filters.date_fin); const value = params.toString(); return value ? `?${value}` : '' }
export const getFandraisanAnjaraStatistiques = (filters: FandraisanAnjaraPeriodFilters = {}) => apiClient<ApiSuccess<FandraisanAnjaraStatistics>>(`/api/fandraisan-anjara/statistiques${query(filters)}`)
export const getFandraisanAnjaraParRazambe = (filters: FandraisanAnjaraPeriodFilters = {}) => apiClient<ApiSuccess<FandraisanAnjaraRazambeList>>(`/api/fandraisan-anjara/razambe${query(filters)}`)
export const getFandraisanAnjaraRazambeDetail = (id: string, filters: FandraisanAnjaraPeriodFilters = {}) => apiClient<ApiSuccess<FandraisanAnjaraRazambeDetail>>(`/api/fandraisan-anjara/razambe/${encodeURIComponent(id)}${query(filters)}`)
export const getFandraisanAnjaraNonDetermineDetail = (filters: FandraisanAnjaraPeriodFilters = {}) => apiClient<ApiSuccess<FandraisanAnjaraRazambeDetail>>(`/api/fandraisan-anjara/razambe/non-determine${query(filters)}`)
export function listFandraisanAnjara(filters: FandraisanAnjaraPeriodFilters & { id_razambe?: string; non_determine?: boolean; statut?: 'ACTIF' | 'ANNULE'; page?: number; limit?: number } = {}) { const params = new URLSearchParams(query(filters).slice(1)); if (filters.id_razambe) params.set('id_razambe', filters.id_razambe); if (filters.non_determine) params.set('non_determine', 'true'); if (filters.statut) params.set('statut', filters.statut); if (filters.page) params.set('page', String(filters.page)); if (filters.limit) params.set('limit', String(filters.limit)); const value = params.toString(); return apiClient<ApiSuccess<FandraisanAnjaraListResponse>>(`/api/fandraisan-anjara${value ? `?${value}` : ''}`) }
export function createFandraisanAnjara(payload: FandraisanAnjaraCreatePayload, idempotencyKey: string) { return apiClient<ApiSuccess<{ contribution: { id: string; statut: FandraisanAnjaraStatus; revision: number }; idempotent_replay: boolean }>>('/api/fandraisan-anjara', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: payload, retryAfterRefresh: false }) }
export const updateFandraisanAnjara = (id: string, payload: FandraisanAnjaraUpdatePayload) => apiClient<ApiSuccess<FandraisanAnjaraMutationResult>>(`/api/fandraisan-anjara/${encodeURIComponent(id)}`, { method: 'PUT', body: payload, retryAfterRefresh: false })
export const cancelFandraisanAnjara = (id: string, payload: { revision: number; motif_annulation: string }) => apiClient<ApiSuccess<FandraisanAnjaraMutationResult>>(`/api/fandraisan-anjara/${encodeURIComponent(id)}/annuler`, { method: 'POST', body: payload, retryAfterRefresh: false })
export const getFandraisanAnjaraHistorique = (id: string) => apiClient<ApiSuccess<FandraisanAnjaraHistoryResponse>>(`/api/fandraisan-anjara/${encodeURIComponent(id)}/historique`)
export function listFoyersSelection(filters: { recherche?: string; page?: number; limit?: number } = {}) {
  const params = new URLSearchParams()
  if (filters.recherche?.trim()) params.set('recherche', filters.recherche.trim())
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  const value = params.toString()
  return apiClient<ApiSuccess<FandraisanAnjaraFoyerSelectionResponse>>(`/api/foyers/selection${value ? `?${value}` : ''}`)
}
