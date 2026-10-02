export interface ApiSuccess<T> {
  success: true
  message?: string
  code?: string
  data?: T
}

export interface ApiErrorResponse {
  success: false
  message?: string
  code?: string
  errors?: unknown
}