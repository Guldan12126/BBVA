import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { guardarSesion, leerSesion } from '../api/client'

/**
 * Guarda quién está logueado y lo comparte con toda la aplicación.
 * Uso en cualquier componente:  const { usuario, login, logout, tieneRol } = useAuth()
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => leerSesion()?.usuario || null)

  const logout = useCallback(async () => {
    const sesion = leerSesion()
    if (sesion?.refreshToken) {
      api.post('/api/auth/logout', { refreshToken: sesion.refreshToken }).catch(() => {})
    }
    guardarSesion(null)
    setUsuario(null)
  }, [])

  // Si el token ya no se puede renovar, el cliente HTTP lanza este evento
  useEffect(() => {
    const alExpirar = () => setUsuario(null)
    window.addEventListener('sesion-expirada', alExpirar)
    return () => window.removeEventListener('sesion-expirada', alExpirar)
  }, [])

  async function login(correo, password) {
    const { data } = await api.post('/api/auth/login', { correo, password })
    guardarSesion(data)
    setUsuario(data.usuario)
    return data.usuario
  }

  /** tieneRol('ADMIN', 'SUPERVISOR') -> true si el usuario tiene alguno de esos roles */
  const tieneRol = useCallback((...roles) => !!usuario && roles.includes(usuario.rol), [usuario])

  return (
    <AuthContext.Provider value={{ usuario, login, logout, tieneRol }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
