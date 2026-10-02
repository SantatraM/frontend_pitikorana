import { apiClient } from './apiClient'
import type { ApiSuccess } from '../types/api'

function photoFormData(file: File): FormData {
  const formData = new FormData()
  formData.append('photo', file)
  return formData
}

export function uploadPhotoPersonne(idPersonne: string, file: File) {
  return apiClient<ApiSuccess<unknown>>(
    `/api/photos-personne/upload/${encodeURIComponent(idPersonne)}`,
    { method: 'POST', body: photoFormData(file) },
  )
}

export function replacePhotoPersonne(idPersonne: string, file: File) {
  return apiClient<ApiSuccess<unknown>>(
    `/api/photos-personne/upload/${encodeURIComponent(idPersonne)}`,
    { method: 'PUT', body: photoFormData(file) },
  )
}
