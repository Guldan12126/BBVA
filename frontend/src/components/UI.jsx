import { useCallback, useEffect, useRef, useState } from 'react'
import { etiqueta, tono } from '../utils/formato'
import Icono from './Icono'

/**
 * Reemplazo de window.confirm() con el estilo del sistema.
 *
 *   const [confirmar, dialogo] = useConfirmar()
 *   if (await confirmar({ titulo: '¿Eliminar?', mensaje: '…', textoOk: 'Eliminar' })) { ... }
 *   ...
 *   return <>{...}{dialogo}</>
 *
 * Opciones: titulo, mensaje, textoOk, tono ('peligro' por defecto | 'primario'), icono.
 */
export function useConfirmar() {
  const [estado, setEstado] = useState(null)
  const resolver = useRef(null)

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setEstado(opciones)
      }),
    [],
  )
  const cerrar = useCallback((valor) => {
    resolver.current?.(valor)
    resolver.current = null
    setEstado(null)
  }, [])
  const cancelar = useCallback(() => cerrar(false), [cerrar])

  const peligro = (estado?.tono || 'peligro') === 'peligro'
  const dialogo = estado && (
    <Modal titulo={estado.titulo} icono={estado.icono || (peligro ? 'alerta' : 'check')} tono={peligro ? 'rojo' : undefined}
      abierto alCerrar={cancelar} ancho={460}>
      <div className="form-modal confirmar">
        {estado.mensaje && <p className="confirmar-texto">{estado.mensaje}</p>}
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={cancelar}>Cancelar</button>
          <button type="button" className={`btn ${peligro ? 'btn-peligro' : 'btn-primario'}`} onClick={() => cerrar(true)} autoFocus>
            {estado.textoOk || 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  )
  return [confirmar, dialogo]
}

/** Reglas de contraseña segura (iguales a @PasswordSegura del backend). */
export const REQUISITOS_PASSWORD = [
  { texto: 'Mínimo 8 caracteres', ok: (p) => p.length >= 8 },
  { texto: 'Una letra mayúscula', ok: (p) => /[A-Z]/.test(p) },
  { texto: 'Una letra minúscula', ok: (p) => /[a-z]/.test(p) },
  { texto: 'Un número', ok: (p) => /\d/.test(p) },
]
export const passwordValida = (p) => REQUISITOS_PASSWORD.every((r) => r.ok(p || ''))

/** Lista de requisitos que se van marcando en verde mientras se escribe la contraseña. */
export function RequisitosPassword({ password }) {
  return (
    <ul className="requisitos">
      {REQUISITOS_PASSWORD.map((r) => {
        const cumple = r.ok(password || '')
        return (
          <li key={r.texto} className={cumple ? 'ok' : ''}>
            <Icono nombre={cumple ? 'check' : 'circulo'} size={15} /> {r.texto}
          </li>
        )
      })}
    </ul>
  )
}

/** Genera una contraseña aleatoria que cumple los requisitos (para contraseñas iniciales). */
export function generarPassword(largo = 12) {
  const grupos = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789']
  const todos = grupos.join('')
  const azar = (n) => {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0] % n
  }
  const chars = grupos.map((g) => g[azar(g.length)])
  while (chars.length < largo) chars.push(todos[azar(todos.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = azar(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

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

/**
 * Mensaje para cuando no hay datos.
 * icono: nombre del ícono (false para no mostrarlo) · accion: botón opcional (ej. "Limpiar filtros").
 */
export function Vacio({ children = 'No hay datos para mostrar', icono = 'bandeja', titulo, accion }) {
  return (
    <div className="vacio">
      {icono && (
        <span className="vacio-icono">
          <Icono nombre={icono} size={22} />
        </span>
      )}
      {titulo && <strong className="vacio-titulo">{titulo}</strong>}
      <div className="vacio-texto">{children}</div>
      {accion && <div className="vacio-accion">{accion}</div>}
    </div>
  )
}

/** Filas grises animadas mientras carga una tabla (en lugar del spinner). */
export function TablaCargando({ filas = 6, columnas = 6 }) {
  return (
    <section className="panel sin-padding" aria-busy="true" aria-label="Cargando">
      <div className="tabla-scroll">
        <table className="tabla tabla-esqueleto">
          <thead>
            <tr>{Array.from({ length: columnas }, (_, i) => <th key={i}><span className="esqueleto" style={{ width: 60 + ((i * 23) % 40) }} /></th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: filas }, (_, f) => (
              <tr key={f}>
                {Array.from({ length: columnas }, (_, c) => (
                  <td key={c}><span className="esqueleto" style={{ width: `${45 + ((f * 7 + c * 19) % 50)}%` }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
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
/**
 * tendencia: { valor: 12.5, bueno: 'subir' | 'bajar' } -> chip "▲ 12.5%" en verde o rojo según si subir es bueno.
 * extra: contenido adicional al pie (mini gráfico, barra de progreso, etc.).
 */
export function Kpi({ titulo, valor, detalle, tono: color, icono, tendencia, extra }) {
  let chip = null
  if (tendencia && Number.isFinite(tendencia.valor)) {
    const sube = tendencia.valor > 0
    const igual = Math.abs(tendencia.valor) < 0.05
    const bien = igual ? null : (tendencia.bueno === 'bajar') !== sube
    chip = (
      <span className={`kpi-tendencia ${igual ? '' : bien ? 'bien' : 'mal'}`} title={tendencia.texto}>
        {igual ? '=' : sube ? '▲' : '▼'} {Math.abs(tendencia.valor).toFixed(Math.abs(tendencia.valor) < 10 ? 1 : 0)}%
      </span>
    )
  }
  return (
    <div className={`kpi ${color ? `kpi-${color}` : ''}`}>
      <div className="kpi-cabecera">
        <div className="kpi-titulo">{titulo}</div>
        {icono && (
          <span className="kpi-icono">
            <Icono nombre={icono} size={18} />
          </span>
        )}
      </div>
      <div className="kpi-valor">
        {valor} {chip}
      </div>
      {detalle && <div className="kpi-detalle">{detalle}</div>}
      {extra && <div className="kpi-extra">{extra}</div>}
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

/**
 * Ventana emergente. Se cierra con Esc, con el botón × o haciendo clic fuera.
 * icono / subtitulo / tono ('rojo', 'verde', 'naranja') son opcionales para la cabecera.
 */
export function Modal({ titulo, subtitulo, icono, tono, abierto, alCerrar, children, ancho }) {
  useEffect(() => {
    if (!abierto) return
    const tecla = (e) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', tecla)
    // Evita que la página de atrás se desplace mientras el modal está abierto
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = overflow
    }
  }, [abierto, alCerrar])

  if (!abierto) return null
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="modal" style={ancho ? { maxWidth: ancho } : undefined} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabecera">
          {icono && (
            <span className={`modal-icono ${tono ? `modal-icono-${tono}` : ''}`}>
              <Icono nombre={icono} size={20} />
            </span>
          )}
          <div className="modal-titulos">
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button type="button" className="modal-cerrar" onClick={alCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}

/** Pie de los formularios en modal: Cancelar + botón principal con estado "Guardando…". */
export function PieModal({ alCancelar, enviando, texto = 'Guardar', icono = 'check', tono = 'primario', deshabilitado }) {
  return (
    <div className="modal-pie">
      <button type="button" className="btn btn-sec" onClick={alCancelar} disabled={enviando}>
        Cancelar
      </button>
      <button className={`btn btn-${tono}`} disabled={enviando || deshabilitado}>
        {enviando ? <span className="spinner spinner-btn" /> : <Icono nombre={icono} size={16} />}
        {enviando ? 'Guardando…' : texto}
      </button>
    </div>
  )
}

/** Grupo de campos con un título (ej. "Datos personales"). */
export function SeccionForm({ titulo, icono, children, columnas = 2 }) {
  return (
    <fieldset className="seccion-form">
      <legend>
        {icono && <Icono nombre={icono} size={15} />} {titulo}
      </legend>
      <div className={`form-grid ${columnas === 1 ? 'form-grid-1' : columnas === 3 ? 'form-grid-3' : ''}`}>{children}</div>
    </fieldset>
  )
}

/** Interruptor tipo "switch" con título y descripción. */
export function Interruptor({ activo, alCambiar, titulo, descripcion }) {
  return (
    <label className={`interruptor ${activo ? 'activo' : ''}`}>
      <span className="interruptor-texto">
        <strong>{titulo}</strong>
        {descripcion && <small>{descripcion}</small>}
      </span>
      <input type="checkbox" role="switch" checked={!!activo} onChange={(e) => alCambiar(e.target.checked)} />
      <span className="interruptor-pista" aria-hidden="true" />
    </label>
  )
}

/**
 * Selector de opciones en forma de tarjetas (radio).
 * opciones: [{ valor, texto, descripcion?, icono?, tono? }]
 */
export function Opciones({ etiqueta: texto, opciones, valor, alCambiar, columnas, nombre, ayuda }) {
  return (
    <div className="campo campo-ancho">
      {texto && <span className="campo-etiqueta">{texto}</span>}
      <div className="opciones" role="radiogroup" aria-label={texto} style={{ '--columnas': columnas || opciones.length }}>
        {opciones.map((o) => (
          <label key={o.valor} className={`opcion-tarjeta ${valor === o.valor ? 'sel' : ''} ${o.tono ? `opcion-${o.tono}` : ''}`}>
            <input type="radio" name={nombre} value={o.valor} checked={valor === o.valor} onChange={() => alCambiar(o.valor)} />
            {o.icono && (
              <span className="opcion-icono">
                <Icono nombre={o.icono} size={17} />
              </span>
            )}
            {o.tono && !o.icono && <span className="opcion-punto" />}
            <span className="opcion-texto">
              <strong>{o.texto}</strong>
              {o.descripcion && <small>{o.descripcion}</small>}
            </span>
          </label>
        ))}
      </div>
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </div>
  )
}

/** Input con un texto o ícono fijo a la izquierda (ej. "S/", "+51") y/o a la derecha. */
export function InputPrefijo({ prefijo, icono, sufijo, ...props }) {
  return (
    <span className="input-prefijo">
      {icono && (
        <span className="input-prefijo-icono">
          <Icono nombre={icono} size={16} />
        </span>
      )}
      {prefijo && <span className="input-prefijo-texto">{prefijo}</span>}
      <input {...props} />
      {sufijo && <span className="input-sufijo">{sufijo}</span>}
    </span>
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
export function Campo({ etiqueta: texto, children, ayuda, requerido, opcional, ancho, error, extra }) {
  return (
    <label className={`campo ${ancho ? 'campo-ancho' : ''} ${error ? 'campo-con-error' : ''}`}>
      <span className="campo-etiqueta">
        {texto}
        {requerido && <span className="campo-requerido" aria-hidden="true"> *</span>}
        {opcional && <span className="campo-opcional"> (opcional)</span>}
        {extra && <span className="campo-extra">{extra}</span>}
      </span>
      {children}
      {error ? <span className="campo-error">{error}</span> : ayuda && <span className="campo-ayuda">{ayuda}</span>}
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

const colorProbabilidad = (p) => (p >= 0.9 ? 'var(--rojo)' : p >= 0.7 ? 'var(--naranja)' : p >= 0.4 ? 'var(--amarillo)' : 'var(--verde)')

/** Indicador circular de la probabilidad de fraude (0 a 1). */
export function MedidorRiesgo({ valor, nivel }) {
  const pct = Math.round((valor || 0) * 100)
  const r = 44
  const c = 2 * Math.PI * r
  const color = colorProbabilidad(valor || 0)
  return (
    <div className="medidor" style={{ '--color': color }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="medidor-fondo" />
        <circle cx="50" cy="50" r={r} className="medidor-valor" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="medidor-centro">
        <strong>{pct}%</strong>
        <small>prob. de fraude</small>
      </div>
      {nivel && <span className="medidor-nivel"><Badge valor={nivel} /></span>}
    </div>
  )
}

