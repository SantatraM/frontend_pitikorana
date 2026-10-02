/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AUTH_SESSION_EXPIRED_EVENT, ApiError } from '../api/apiClient'
import { getMe, login as loginRequest, logout as logoutRequest } from '../api/auth'
import type { AuthUser, LoginPayload } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function isExpectedUnauthenticatedError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuth = useCallback(async () => {
    try {
      const response = await getMe()
      setUser(response.data ?? null)
    } catch (error) {
      if (isExpectedUnauthenticatedError(error)) {
        setUser(null)
        return
      }
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void refreshAuth() }, [refreshAuth])
  useEffect(() => {
    const invalidateSession = () => {
      setUser(null)
      setIsLoading(false)
    }
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, invalidateSession)
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, invalidateSession)
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginRequest(payload)
    if (!response.data) throw new Error('Réponse de connexion incomplète.')
    setUser(response.data)
    return response.data
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, isAuthenticated: user !== null, isLoading, login, logout, refreshAuth }), [user, isLoading, login, logout, refreshAuth])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}