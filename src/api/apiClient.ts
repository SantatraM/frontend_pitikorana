import type { ApiErrorResponse } from '../types/api'

type JsonBody = object

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | JsonBody | null
}

export class ApiError extends Error {
  readonly status: number
  readonly response: ApiErrorResponse | undefined

  constructor(status: number, response?: ApiErrorResponse) {
    super(response?.message ?? 'Une erreur est survenue lors de l’appel API.')
    this.name = 'ApiError'
    this.status = status
    this.response = response
  }
}

export const AUTH_SESSION_EXPIRED_EVENT = 'pitikorana:auth-expired'

const apiUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const refreshExcludedPaths = new Set(['/api/auth/connexion', '/api/auth/deconnexion', '/api/auth/refresh'])
let refreshPromise: Promise<void> | null = null

function isJsonBody(value: ApiRequestOptions['body']): value is JsonBody {
  if (Array.isArray(value)) return true
  if (value === null || typeof value !== 'object') return false
  if (value instanceof FormData || value instanceof Blob || value instanceof URLSearchParams || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try { return JSON.parse(text) as unknown } catch { return text }
}

function notifySessionExpired() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT))
}

function shouldRefresh(path: string) {
  return !refreshExcludedPaths.has(path)
}

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then(async (response) => {
      if (!response.ok) {
        const body = await parseResponseBody(response)
        const errorResponse = body !== null && typeof body === 'object' ? body as ApiErrorResponse : undefined
        throw new ApiError(response.status, errorResponse)
      }
    }).finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

async function performRequest(path: string, options: ApiRequestOptions): Promise<{ response: Response; body: unknown }> {
  const { body, headers, ...requestOptions } = options
  const requestHeaders = new Headers(headers)
  let requestBody: BodyInit | null | undefined = body as BodyInit | null | undefined
  if (isJsonBody(body)) {
    requestBody = JSON.stringify(body)
    if (!requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...requestOptions,
    body: requestBody,
    credentials: requestOptions.credentials ?? 'include',
    headers: requestHeaders,
  })
  return { response, body: await parseResponseBody(response) }
}

export async function apiClient<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let result = await performRequest(path, options)

  if (result.response.status === 401 && shouldRefresh(path)) {
    try {
      await refreshSession()
    } catch {
      notifySessionExpired()
      throw new ApiError(result.response.status, result.body !== null && typeof result.body === 'object' ? result.body as ApiErrorResponse : undefined)
    }

    result = await performRequest(path, options)
    if (result.response.status === 401) notifySessionExpired()
  }

  if (!result.response.ok) {
    const errorResponse = result.body !== null && typeof result.body === 'object' ? result.body as ApiErrorResponse : undefined
    throw new ApiError(result.response.status, errorResponse)
  }
  return result.body as T
}