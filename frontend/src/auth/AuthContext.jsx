import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { guardarSesion, leerSesion } from '../api/client'

/**
 * Guarda quién está logueado y lo comparte con toda la aplicación.
 * Uso en cualquier componente:  const { usuario, login, logout, tieneRol } = useAuth()
 */
const AuthContext = createContext(null)

const claveFoto = (id) => `foto-perfil-${id}`

function leerFotoLocal(id) {
  if (!id) return null
  try {
    return localStorage.getItem(claveFoto(id))
  } catch {
    return null
  }
}

function guardarFotoLocal(id, valor) {
  if (!id) return
  try {
    if (valor) localStorage.setItem(claveFoto(id), valor)
    else localStorage.removeItem(claveFoto(id))
  } catch {
    // Sin espacio o almacenamiento bloqueado: la foto igual queda en memoria
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => leerSesion()?.usuario || null)
  // Foto de perfil (data URL). Se guarda en localStorage para mostrarla al instante al recargar.
  const [foto, setFotoEstado] = useState(() => leerFotoLocal(leerSesion()?.usuario?.id))

  const setFoto = useCallback(
    (valor) => {
      setFotoEstado(valor)
      guardarFotoLocal(usuario?.id, valor)
    },
    [usuario?.id],
  )

  // Al entrar (o recargar) se trae la foto del backend
  useEffect(() => {
    if (!usuario?.id) {
      setFotoEstado(null)
      return
    }
    let vigente = true
    setFotoEstado(leerFotoLocal(usuario.id))
    api
      .get('/api/auth/me/foto')
      .then(({ data }) => {
        if (!vigente) return
        setFotoEstado(data.foto || null)
        guardarFotoLocal(usuario.id, data.foto || null)
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [usuario?.id])

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
    <AuthContext.Provider value={{ usuario, login, logout, tieneRol, foto, setFoto }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
