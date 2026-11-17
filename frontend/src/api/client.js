import axios from 'axios'

/**
 * Cliente HTTP para hablar con el backend.
 * - Agrega el header "Authorization: Bearer <token>" en cada petición.
 * - Si el backend responde 401 (token vencido), pide uno nuevo con el refreshToken
 *   y repite la petición automáticamente. Si eso también falla, cierra la sesión.
 */

const CLAVE_SESION = 'sesion'

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION)) || null
  } catch {
    return null
  }
}

export function guardarSesion(sesion) {
  if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
  else localStorage.removeItem(CLAVE_SESION)
}

// VITE_API_URL solo hace falta si el backend está en otro dominio (en desarrollo se usa el proxy de Vite)
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })

api.interceptors.request.use((config) => {
  const sesion = leerSesion()
  if (sesion?.accessToken) {
    config.headers.Authorization = `Bearer ${sesion.accessToken}`
  }
  return config
})

// Si varias peticiones fallan a la vez, todas esperan la misma renovación del token
let renovando = null

async function renovarToken() {
  const sesion = leerSesion()
  if (!sesion?.refreshToken) throw new Error('Sin sesión')
  const { data } = await axios.post(`${api.defaults.baseURL}/api/auth/refresh`, {
    refreshToken: sesion.refreshToken,
  })
  guardarSesion(data)
  return data
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const esAuth = original?.url?.includes('/api/auth/')
    if (error.response?.status === 401 && !original._reintento && !esAuth) {
      original._reintento = true
      try {
        renovando = renovando || renovarToken()
        await renovando
        return api(original)
      } catch {
        guardarSesion(null)
        window.dispatchEvent(new Event('sesion-expirada'))
      } finally {
        renovando = null
      }
    }
    return Promise.reject(error)
  },
)

/** Convierte cualquier error del backend en un texto para mostrar al usuario. */
export function mensajeError(error) {
  const data = error?.response?.data
  if (data?.errores && Object.keys(data.errores).length) {
    return Object.entries(data.errores)
      .map(([campo, msg]) => `${campo}: ${msg}`)
      .join(' · ')
  }
  if (data?.mensaje) return data.mensaje
  if (error?.response?.status === 403) return 'No tienes permiso para realizar esta acción'
  if (!error?.response) return 'No se pudo conectar con el servidor. ¿Está encendido el backend?'
  return 'Ocurrió un error inesperado'
}

export default api
