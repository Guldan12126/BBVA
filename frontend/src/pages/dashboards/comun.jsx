/**
 * Piezas compartidas por los dashboards de cada rol
 * (DashboardAnalista, DashboardOperador, DashboardSupervisor, DashboardAdmin).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/AuthContext'
import Icono from '../../components/Icono'
import { BarraRiesgo, Vacio } from '../../components/UI'
import useApi from '../../hooks/useApi'
import useTiempoReal from '../../hooks/useTiempoReal'
import { etiqueta, fechaHora, moneda, numero } from '../../utils/formato'

// ---------- Colores y estilo de los gráficos ----------
export const COLOR = { azul: '#1464a5', turquesa: '#2dcccd', verde: '#2e9d5b', amarillo: '#d9a400', naranja: '#e07b00', rojo: '#d0343c', gris: '#8a95a5' }
export const COLOR_NIVEL = { BAJO: COLOR.verde, MEDIO: COLOR.amarillo, ALTO: COLOR.naranja, CRITICO: COLOR.rojo }
export const EJE = { fontSize: 12, tick: { fill: 'var(--texto-suave)' }, axisLine: false, tickLine: false }
export const TOOLTIP = {
  contentStyle: {
    background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 10,
    boxShadow: '0 8px 24px rgba(16,24,40,.12)', fontSize: 13, padding: '8px 12px',
  },
  labelStyle: { color: 'var(--texto)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { padding: 0 },
  cursor: { fill: 'var(--primario-claro)', opacity: 0.6 },
}

export const aLista = (obj) => Object.entries(obj || {}).map(([clave, valor]) => ({ clave, nombre: etiqueta(clave), valor }))
export const suma = (lista) => lista.reduce((a, x) => a + (x.valor || 0), 0)
export const pct = (parte, total) => (total ? (parte / total) * 100 : 0)
export const variacion = (actual, anterior) => (anterior ? ((actual - anterior) / anterior) * 100 : null)
export const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

/** "2026-11-20" -> { dia: '20/11', diaSemana: 'vie' } para los ejes de los gráficos. */
export const conDia = (lista = []) =>
  lista.map((x) => ({
    ...x,
    dia: `${x.fecha.slice(8, 10)}/${x.fecha.slice(5, 7)}`,
    diaSemana: new Date(`${x.fecha}T00:00:00`).toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''),
  }))

export function minutosATexto(min) {
  if (min === null || min === undefined) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ${min % 60} min`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}

/** "hace 5 min", "hace 2 h", o la fecha si es más antiguo. */
export function haceCuanto(valor) {
  const d = new Date(valor)
  if (isNaN(d)) return '—'
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (seg < 60) return 'hace un momento'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  return fechaHora(valor)
}

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

/**
 * Carga los endpoints del dashboard y los recarga solos cuando llegan transacciones nuevas por WebSocket
 * (agrupando 2 s para no saturar cuando el simulador envía cientos seguidas).
 */
export function useDatosDashboard(urls) {
  const resumen = useApi(urls.includes('resumen') ? '/api/dashboard/resumen' : null)
  const rol = useApi(urls.includes('rol') ? '/api/dashboard/rol' : null)
  const recargarResumen = resumen.recargar
  const recargarRol = rol.recargar

  const recargar = useCallback(() => {
    recargarResumen()
    recargarRol()
  }, [recargarResumen, recargarRol])

  const espera = useRef(null)
  const programar = useCallback(() => {
    clearTimeout(espera.current)
    espera.current = setTimeout(recargar, 2000)
  }, [recargar])
  useEffect(() => () => clearTimeout(espera.current), [])
  const enVivo = useTiempoReal('/topic/transacciones', programar)

  const [actualizado, setActualizado] = useState(null)
  useEffect(() => {
    if (resumen.datos || rol.datos) setActualizado(new Date())
  }, [resumen.datos, rol.datos])

  return {
    resumen: resumen.datos,
    rol: rol.datos,
    cargando: resumen.cargando || rol.cargando,
    error: resumen.error || rol.error,
    listo: (!urls.includes('resumen') || resumen.datos) && (!urls.includes('rol') || rol.datos),
    recargar, enVivo, actualizado,
  }
}

/**
 * Encabezado de cada dashboard: saludo, fecha, estado en vivo y, a la derecha, lo más urgente del momento.
 * foco: { to, icono, tono, titulo, texto, accion } cuando hay algo que atender; si es null se muestra focoOk.
 */
export function CabeceraDashboard({ subtitulo, etiquetaRol, enVivo, actualizado, cargando, alActualizar, foco, focoOk, children }) {
  const { usuario } = useAuth()
  const hoy = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <section className="dash-hero">
      <div className="dash-hero-principal">
        <div className="dash-hero-meta">
          <span className="dash-hero-rol">{etiquetaRol}</span>
          <span className="dash-hero-fecha"><Icono nombre="calendario" size={13} /> {hoy}</span>
        </div>
        <h1><span className="dash-hero-saludo">{saludo()},</span> {usuario.nombres}</h1>
        <p className="dash-hero-sub">{subtitulo}</p>
        <div className="dash-hero-acciones">
          <span className={`dash-hero-vivo ${enVivo ? 'ok' : ''}`}>
            <span className="punto" /> {enVivo ? 'En vivo' : 'Sin conexión en vivo'}
          </span>
          {actualizado && (
            <span className="dash-hero-hora">
              Actualizado {actualizado.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {children}
          <button className="dash-hero-btn" onClick={alActualizar} disabled={cargando} title="Actualizar datos">
            <span className={cargando ? 'girando' : ''}><Icono nombre="actualizar" size={15} /></span> Actualizar
          </button>
        </div>
      </div>

      {foco ? (
        <Link to={foco.to} className={`dash-foco foco-${foco.tono || 'rojo'}`}>
          <span className="dash-foco-etiqueta">Prioridad ahora</span>
          <span className="dash-foco-cuerpo">
            <span className="dash-foco-icono"><Icono nombre={foco.icono || 'escudo-alerta'} size={20} /></span>
            <span className="dash-foco-texto">
              <strong>{foco.titulo}</strong>
              {foco.texto && <small>{foco.texto}</small>}
            </span>
          </span>
          <span className="dash-foco-ir">{foco.accion || 'Revisar ahora'} <Icono nombre="flecha" size={15} /></span>
        </Link>
      ) : (
        <div className="dash-foco foco-ok">
          <span className="dash-foco-etiqueta">Prioridad ahora</span>
          <span className="dash-foco-cuerpo">
            <span className="dash-foco-icono"><Icono nombre="escudo-ok" size={20} /></span>
            <span className="dash-foco-texto">
              <strong>{focoOk?.titulo || 'Todo al día'}</strong>
              <small>{focoOk?.texto || 'No hay nada urgente pendiente.'}</small>
            </span>
          </span>
        </div>
      )}
    </section>
  )
}

/** Franja de aviso destacada (alertas críticas, escaladas, etc.). */
export function Banner({ to, icono = 'escudo-alerta', tono = 'rojo', titulo, texto, accion = 'Revisar ahora' }) {
  return (
    <Link to={to} className={`dash-banner banner-${tono}`}>
      <span className="dash-banner-icono"><Icono nombre={icono} size={20} /></span>
      <span className="dash-banner-texto">
        <strong>{titulo}</strong>
        {texto && <small>{texto}</small>}
      </span>
      <span className="dash-banner-ir">{accion} <Icono nombre="flecha" size={16} /></span>
    </Link>
  )
}

export function TituloPanel({ titulo, sub, children }) {
  return (
    <div className="panel-titulo">
      <div>
        <h2>{titulo}</h2>
        {sub && <p className="panel-sub">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

/** Mini gráfico de línea para las tarjetas de indicadores. */
export function Sparkline({ datos, clave, color, id }) {
  if (!datos?.length) return null
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={datos} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={clave} stroke={color} strokeWidth={1.8} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Progreso({ valor, color }) {
  return (
    <div className="progreso">
      <div style={{ width: `${Math.min(100, Math.max(0, valor || 0))}%`, background: color }} />
    </div>
  )
}

/** Barras apiladas por día (ej. confirmadas / descartadas). series: [{ clave, nombre, color }] */
export function BarrasDia({ datos, series, alto = 230 }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <BarChart data={conDia(datos)} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--borde)" />
        <XAxis dataKey="dia" {...EJE} />
        <YAxis allowDecimals={false} width={40} {...EJE} />
        <Tooltip {...TOOLTIP} labelFormatter={(_, p) => (p?.[0] ? `${p[0].payload.diaSemana} ${p[0].payload.dia}` : '')} />
        {series.map((s, i) => (
          <Bar key={s.clave} dataKey={s.clave} name={s.nombre} stackId="a" fill={s.color} maxBarSize={36}
            radius={i === series.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Gráfico de actividad transaccional (total / sospechosas / fraudulentas). */
export function GraficoActividad({ datos, alto = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={alto}>
      <AreaChart data={conDia(datos)} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          {[['gTotal', COLOR.azul], ['gSosp', COLOR.naranja], ['gFraude', COLOR.rojo]].map(([id, col]) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={col} stopOpacity={0.28} />
              <stop offset="100%" stopColor={col} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--borde)" />
        <XAxis dataKey="dia" {...EJE} />
        <YAxis allowDecimals={false} width={40} {...EJE} />
        <Tooltip {...TOOLTIP} cursor={{ stroke: 'var(--borde)', strokeWidth: 1 }}
          labelFormatter={(_, p) => (p?.[0] ? `${p[0].payload.diaSemana} ${p[0].payload.dia}` : '')} />
        <Area type="monotone" dataKey="total" name="Total" stroke={COLOR.azul} strokeWidth={2.2} fill="url(#gTotal)" activeDot={{ r: 5 }} />
        <Area type="monotone" dataKey="sospechosas" name="Sospechosas" stroke={COLOR.naranja} strokeWidth={2} fill="url(#gSosp)" activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="fraudulentas" name="Fraudulentas" stroke={COLOR.rojo} strokeWidth={2} fill="url(#gFraude)" activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Leyenda horizontal con totales (ej. "● Total 120"). items: [{ texto, valor, color }] */
export function ResumenLeyenda({ items }) {
  return (
    <div className="dash-resumen">
      {items.map((x) => (
        <span key={x.texto}><i style={{ background: x.color }} />{x.texto} <strong>{numero(x.valor)}</strong></span>
      ))}
    </div>
  )
}

/**
 * Lista de alertas resumidas (formato del backend: id, codigo, cliente, comercio, monto, probabilidad, nivelRiesgo, fecha).
 */
export function ListaAlertas({ alertas, vacio, mostrarAsignado = false }) {
  if (!alertas?.length) return vacio
  return (
    <ul className="lista-prioritarias">
      {alertas.map((a) => (
        <li key={a.id}>
          <Link to={`/alertas/${a.id}`}>
            <span className={`prioridad-marca marca-${a.nivelRiesgo}`} />
            <span className="prioritaria-cuerpo">
              <span className="prioritaria-linea">
                <strong>{a.cliente || a.codigo}</strong>
                <span className="prioritaria-monto">{moneda(a.monto)}</span>
              </span>
              <span className="prioritaria-linea muted">
                <span className="prioritaria-comercio">
                  <span className="mono">{a.codigo}</span> · {a.comercio || '—'}
                  {mostrarAsignado && ` · ${a.asignadoA || 'Sin asignar'}`}
                </span>
                <span>{haceCuanto(a.fecha)}</span>
              </span>
              <BarraRiesgo valor={a.probabilidad} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Accesos rápidos a otras secciones. items: [{ to, icono, texto, sub }] */
export function AccesosRapidos({ items }) {
  return (
    <div className="accesos-rapidos">
      {items.map((x) => (
        <Link key={x.to} to={x.to} className="acceso-rapido">
          <span className="acceso-icono"><Icono nombre={x.icono} size={18} /></span>
          <span className="acceso-texto">
            <strong>{x.texto}</strong>
            {x.sub && <small>{x.sub}</small>}
          </span>
          <Icono nombre="chevron" size={16} />
        </Link>
      ))}
    </div>
  )
}

export function VacioOk({ titulo = 'Todo al día', children }) {
  return <Vacio icono="escudo-ok" titulo={titulo}>{children}</Vacio>
}
