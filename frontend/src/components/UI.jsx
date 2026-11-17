import { useEffect } from 'react'
import { etiqueta, tono } from '../utils/formato'

/** Etiqueta de color para estados, niveles de riesgo, prioridades, etc. */
export function Badge({ valor, texto }) {
  if (valor === null || valor === undefined) return <span className="muted">—</span>
  return <span className={`badge badge-${tono(valor)}`}>{texto || etiqueta(valor)}</span>
}

/** Barra de probabilidad de fraude (0 a 1). */
export function BarraRiesgo({ valor }) {
  if (valor === null || valor === undefined) return <span className="muted">—</span>
  const pct = Math.round(valor * 100)
  const color = valor >= 0.9 ? 'var(--rojo)' : valor >= 0.7 ? 'var(--naranja)' : valor >= 0.4 ? 'var(--amarillo)' : 'var(--verde)'
  return (
    <div className="barra-riesgo" title={`${pct}%`}>
      <div className="barra-riesgo-fondo">
        <div className="barra-riesgo-valor" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span>{pct}%</span>
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando">
      <span className="spinner" /> {texto}
    </div>
  )
}

export function Aviso({ tipo = 'error', children, alCerrar }) {
  if (!children) return null
  return (
    <div className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {alCerrar && (
        <button type="button" className="aviso-cerrar" onClick={alCerrar} aria-label="Cerrar">
          ×
        </button>
      )}
    </div>
  )
}

export function Vacio({ children = 'No hay datos para mostrar' }) {
  return <div className="vacio">{children}</div>
}

/** Encabezado de cada página: título, descripción y botones a la derecha. */
export function Encabezado({ titulo, descripcion, children }) {
  return (
    <div className="encabezado">
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p className="muted">{descripcion}</p>}
      </div>
      {children && <div className="encabezado-acciones">{children}</div>}
    </div>
  )
}

/** Indicador numérico del dashboard. */
export function Kpi({ titulo, valor, detalle, tono: color }) {
  return (
    <div className={`kpi ${color ? `kpi-${color}` : ''}`}>
      <div className="kpi-titulo">{titulo}</div>
      <div className="kpi-valor">{valor}</div>
      {detalle && <div className="kpi-detalle">{detalle}</div>}
    </div>
  )
}

/**
 * Paginación para las respuestas paginadas del backend:
 * { content: [...], page: { number, size, totalElements, totalPages } }
 */
export function Paginacion({ pagina, alCambiar }) {
  if (!pagina || pagina.totalPages <= 1) {
    return pagina ? <div className="paginacion muted">{pagina.totalElements} registro(s)</div> : null
  }
  const { number, totalPages, totalElements } = pagina
  return (
    <div className="paginacion">
      <span className="muted">
        {totalElements} registro(s) · página {number + 1} de {totalPages}
      </span>
      <div className="paginacion-botones">
        <button className="btn btn-sec btn-sm" disabled={number === 0} onClick={() => alCambiar(number - 1)}>
          ← Anterior
        </button>
        <button
          className="btn btn-sec btn-sm"
          disabled={number + 1 >= totalPages}
          onClick={() => alCambiar(number + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}

/** Ventana emergente. Se cierra con Esc o con el botón ×. */
export function Modal({ titulo, abierto, alCerrar, children, ancho }) {
  useEffect(() => {
    if (!abierto) return
    const tecla = (e) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [abierto, alCerrar])

  if (!abierto) return null
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="modal" style={ancho ? { maxWidth: ancho } : undefined} role="dialog" aria-modal="true">
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="aviso-cerrar" onClick={alCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}

/** <select> con los valores de un enum. */
export function SelectEnum({ valores, valor, alCambiar, todos = 'Todos', ...props }) {
  return (
    <select value={valor ?? ''} onChange={(e) => alCambiar(e.target.value)} {...props}>
      {todos !== false && <option value="">{todos}</option>}
      {valores.map((v) => (
        <option key={v} value={v}>
          {etiqueta(v)}
        </option>
      ))}
    </select>
  )
}

/** Campo de formulario con su etiqueta. */
export function Campo({ etiqueta: texto, children, ayuda }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{texto}</span>
      {children}
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </label>
  )
}

/** Lista de "dato: valor" para las vistas de detalle. */
export function Detalles({ items }) {
  return (
    <dl className="detalles">
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
