import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'
import type { AuthUser, LoginPayload } from '../types/auth'

export function login(payload: LoginPayload): Promise<ApiSuccess<AuthUser>> {
  return apiClient<ApiSuccess<AuthUser>>('/api/auth/connexion', { method: 'POST', body: payload })
}

export function getMe(): Promise<ApiSuccess<AuthUser>> {
  return apiClient<ApiSuccess<AuthUser>>('/api/auth/me')
}

export function logout(): Promise<ApiSuccess<never>> {
  return apiClient<ApiSuccess<never>>('/api/auth/deconnexion', { method: 'POST', body: {} })
}
