import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setUser(await authApi.me()) }
    catch { setUser(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = useCallback(async (credentials) => {
    const investigator = await authApi.login(credentials)
    setUser(investigator)
    return investigator
  }, [])

  const register = useCallback((details) => authApi.register(details), [])

  const logout = useCallback(async () => {
    try { await authApi.logout() }
    finally { setUser(null) }
  }, [])

  const updateUser = useCallback((investigator) => setUser(investigator), [])
  const clearSession = useCallback(() => setUser(null), [])

  const value = useMemo(() => ({ user, loading, login, register, logout, refresh, updateUser, clearSession }),
    [user, loading, login, register, logout, refresh, updateUser, clearSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}
