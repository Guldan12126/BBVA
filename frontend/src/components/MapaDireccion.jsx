import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icono from './Icono'

/*
 * Ventana para elegir una dirección sobre un mapa.
 * - Mapa: Leaflet + teselas de OpenStreetMap (gratis, sin API key).
 * - Geocodificación: API de Nominatim (OpenStreetMap). Convierte texto -> coordenadas
 *   y coordenadas -> dirección. Política de uso: máx. 1 petición por segundo.
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const PIURA = [-5.1945, -80.6328]

// Pin propio (el ícono por defecto de Leaflet no carga bien con Vite)
const PIN = L.divIcon({ className: 'mapa-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] })

async function consultar(params) {
  const r = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=1&countrycodes=pe&accept-language=es&${params}`)
  if (!r.ok) throw new Error('No se pudo consultar el mapa')
  const [lugar] = await r.json()
  return lugar ? [Number(lugar.lat), Number(lugar.lon)] : null
}

const buscarCiudad = (ciudad) => consultar(`city=${encodeURIComponent(ciudad)}`)

const buscarDireccion = (texto, ciudad) => {
  const q = ciudad && !texto.toLowerCase().includes(ciudad.toLowerCase()) ? `${texto}, ${ciudad}` : texto
  return consultar(`q=${encodeURIComponent(q)}`)
}

async function direccionDe([lat, lon]) {
  const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=es&lat=${lat}&lon=${lon}`)
  if (!r.ok) throw new Error('No se pudo obtener la dirección')
  const d = await r.json()
  const a = d.address || {}
  const via = [a.road || a.pedestrian || a.neighbourhood || a.suburb, a.house_number].filter(Boolean).join(' ')
  const ciudad = a.city || a.town || a.village || a.county
  const texto = [via, ciudad].filter(Boolean).join(', ') || (d.display_name || '').split(',').slice(0, 3).join(',').trim()
  return { texto, ciudad: ciudad || '' }
}

export default function MapaDireccion({ direccion, ciudad, alElegir, alCerrar }) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const marcador = useRef(null)
  const [busqueda, setBusqueda] = useState(direccion || '')
  const [elegida, setElegida] = useState(direccion || '')
  const [ciudadElegida, setCiudadElegida] = useState('')
  const [estado, setEstado] = useState(null) // { tipo: 'cargando' | 'error', texto }

  function ponerPin(punto) {
    if (marcador.current) return marcador.current.setLatLng(punto)
    marcador.current = L.marker(punto, { icon: PIN, draggable: true }).addTo(mapa.current)
    marcador.current.on('dragend', (e) => elegirPunto(e.target.getLatLng()))
  }

  // Coloca el pin y obtiene la dirección del punto elegido
  async function elegirPunto(latlng) {
    const punto = [latlng.lat, latlng.lng]
    ponerPin(punto)
    setEstado({ tipo: 'cargando', texto: 'Buscando la dirección…' })
    try {
      const { texto, ciudad: c } = await direccionDe(punto)
      setBusqueda(texto)
      setElegida(texto)
      setCiudadElegida(c)
      setEstado(null)
    } catch (err) {
      setEstado({ tipo: 'error', texto: err.message })
    }
  }

  async function buscar() {
    const q = busqueda.trim()
    if (!q) return
    setEstado({ tipo: 'cargando', texto: 'Buscando…' })
    try {
      const punto = await buscarDireccion(q, ciudad)
      if (!punto) return setEstado({ tipo: 'error', texto: 'No se encontró esa dirección. Márcala haciendo clic en el mapa.' })
      mapa.current.setView(punto, 17)
      await elegirPunto({ lat: punto[0], lng: punto[1] })
    } catch (err) {
      setEstado({ tipo: 'error', texto: err.message })
    }
  }

  // Crea el mapa y lo centra en la dirección actual (o en la ciudad del cliente)
  useEffect(() => {
    const m = L.map(contenedor.current).setView(PIURA, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    m.on('click', (e) => elegirPunto(e.latlng))
    mapa.current = m
    const t = setTimeout(() => m.invalidateSize(), 80) // el contenedor acaba de aparecer

    let vivo = true
    ;(async () => {
      try {
        const punto = direccion ? await buscarDireccion(direccion, ciudad) : null
        if (vivo && punto) { m.setView(punto, 17); ponerPin(punto); return }
        const centro = ciudad ? await buscarCiudad(ciudad) : null
        if (vivo && centro) m.setView(centro, 14)
      } catch { /* sin conexión: se queda en Piura */ }
    })()

    // Escape cierra solo esta ventana, no el formulario de atrás
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); alCerrar() } }
    window.addEventListener('keydown', tecla, true)

    return () => {
      vivo = false
      clearTimeout(t)
      window.removeEventListener('keydown', tecla, true)
      m.remove()
      mapa.current = null
      marcador.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ventana = (
    <div className="mapa-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="mapa-ventana" role="dialog" aria-modal="true" aria-label="Elegir dirección en el mapa">
        <div className="mapa-cabecera">
          <div>
            <h3>Elegir dirección en el mapa</h3>
            <p>Busca la calle o haz clic en el mapa. Puedes arrastrar el pin para ajustarla.</p>
          </div>
          <button type="button" className="modal-cerrar" onClick={alCerrar} aria-label="Cerrar">×</button>
        </div>

        <div className="mapa-barra">
          <div className="mapa-buscar">
            <Icono nombre="buscar" size={15} />
            <input
              value={busqueda}
              autoFocus
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar() } }}
              placeholder="Ej. Av. Grau 100"
            />
          </div>
          <button type="button" className="btn btn-sec" onClick={buscar}>Buscar</button>
        </div>

        <div ref={contenedor} className="mapa-lienzo" />

        <p className={`mapa-estado ${estado?.tipo === 'error' ? 'error' : ''}`}>
          {estado?.texto || (elegida ? <>Dirección: <strong>{elegida}</strong>{ciudadElegida && <> · Ciudad: <strong>{ciudadElegida}</strong></>}</> : 'Aún no has marcado ningún punto.')}
        </p>

        <div className="mapa-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button type="button" className="btn btn-primario" disabled={!elegida || estado?.tipo === 'cargando'}
            onClick={() => { alElegir({ direccion: elegida, ciudad: ciudadElegida }); alCerrar() }}>
            <Icono nombre="check" size={16} /> Usar esta dirección
          </button>
        </div>
      </div>
    </div>
  )

  // Se monta dentro de .app (para heredar los estilos) pero fuera del formulario
  return createPortal(ventana, document.querySelector('.app') || document.body)
}
