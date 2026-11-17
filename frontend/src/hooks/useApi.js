import { useCallback, useEffect, useRef, useState } from 'react'
import api, { mensajeError } from '../api/client'

/**
 * Carga datos de un endpoint GET y maneja "cargando" y "error".
 *
 *   const { datos, cargando, error, recargar } = useApi('/api/alertas/cola', { page: 0 })
 *
 * Se vuelve a pedir solo cada vez que cambian la URL o los parámetros.
 * Si url es null no se hace la petición (útil para esperar otro dato).
 */
export default function useApi(url, params) {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(!!url)
  const [error, setError] = useState(null)
  const clave = JSON.stringify(params || {})
  const ultima = useRef(0)

  const cargar = useCallback(async () => {
    if (!url) return
    const id = ++ultima.current
    setCargando(true)
    setError(null)
    try {
      const { data } = await api.get(url, { params: limpiar(JSON.parse(clave)) })
      if (id === ultima.current) setDatos(data)
    } catch (e) {
      if (id === ultima.current) setError(mensajeError(e))
    } finally {
      if (id === ultima.current) setCargando(false)
    }
  }, [url, clave])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { datos, setDatos, cargando, error, recargar: cargar }
}

/** Quita los filtros vacíos para no mandar "?estado=" al backend. */
function limpiar(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  )
}
