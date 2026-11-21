import { useCallback, useEffect, useState } from 'react'

/**
 * Tema de la aplicación: 'claro' (blanco + azules BBVA) u 'oscuro'.
 * Se guarda en localStorage y se aplica como <html data-theme="light|dark">.
 * Si el usuario nunca eligió, se usa la preferencia del sistema operativo.
 */
const CLAVE = 'tema'

function temaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'claro' || guardado === 'oscuro') return guardado
  } catch {
    /* sin acceso a localStorage */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
}

function aplicar(tema) {
  document.documentElement.dataset.theme = tema === 'oscuro' ? 'dark' : 'light'
}

export default function useTema() {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    aplicar(tema)
  }, [tema])

  // Mantiene sincronizadas varias pestañas abiertas
  useEffect(() => {
    const alCambiar = (e) => {
      if (e.key === CLAVE && (e.newValue === 'claro' || e.newValue === 'oscuro')) setTema(e.newValue)
    }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  const alternar = useCallback(() => {
    setTema((actual) => {
      const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro'
      try {
        localStorage.setItem(CLAVE, nuevo)
      } catch {
        /* sin acceso a localStorage */
      }
      return nuevo
    })
  }, [])

  return { tema, alternar }
}
