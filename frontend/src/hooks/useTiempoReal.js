import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'

/**
 * Se conecta al WebSocket del backend (STOMP en /ws) y escucha un canal.
 *
 *   useTiempoReal('/topic/alertas', (alerta) => { ... })
 *
 * Canales disponibles: /topic/alertas y /topic/transacciones.
 * Devuelve true/false según si la conexión está activa.
 */
export default function useTiempoReal(canal, alRecibir) {
  const [conectado, setConectado] = useState(false)
  const callback = useRef(alRecibir)
  callback.current = alRecibir

  useEffect(() => {
    const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const base = import.meta.env.VITE_WS_URL || `${protocolo}://${window.location.host}/ws`

    const cliente = new Client({
      brokerURL: base,
      reconnectDelay: 5000,
      onConnect: () => {
        setConectado(true)
        cliente.subscribe(canal, (mensaje) => {
          try {
            callback.current(JSON.parse(mensaje.body))
          } catch {
            /* mensaje con formato inesperado: se ignora */
          }
        })
      },
      onWebSocketClose: () => setConectado(false),
      onStompError: () => setConectado(false),
    })
    cliente.activate()
    return () => {
      cliente.deactivate()
    }
  }, [canal])

  return conectado
}
