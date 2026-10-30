import type { FandraisanAnjaraCreatePayload } from '../types/fandraisanAnjara'

const STORAGE_KEY = 'pitikorana:fandraisan-anjara:creation-incertaine:v1'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export interface PendingFandraisanAnjaraCreation {
  idempotencyKey: string
  payload: FandraisanAnjaraCreatePayload
  savedAt: number
}

export function readPendingFandraisanAnjaraCreation(): PendingFandraisanAnjaraCreation | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as PendingFandraisanAnjaraCreation
    if (!value || typeof value.idempotencyKey !== 'string' || !value.payload || typeof value.savedAt !== 'number' || Date.now() - value.savedAt > MAX_AGE_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return value
  } catch {
    return null
  }
}

export function savePendingFandraisanAnjaraCreation(value: PendingFandraisanAnjaraCreation) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function clearPendingFandraisanAnjaraCreation() {
  window.sessionStorage.removeItem(STORAGE_KEY)
}
