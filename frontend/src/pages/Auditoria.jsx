import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { Aviso, Encabezado, Kpi, Paginacion, TablaCargando, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, descargarArchivo, etiqueta, fechaHora, numero } from '../utils/formato'
import { BarrasDia, COLOR, ResumenLeyenda, TituloPanel, haceCuanto, iniciales } from './dashboards/comun'

/** Agrupación de las acciones para filtrar, colorear y graficar. */
const CATEGORIAS = [
  { id: 'decisiones', texto: 'Decisiones', color: COLOR.azul, acciones: ['CONFIRMAR_FRAUDE', 'DESCARTAR_ALERTA'] },
  { id: 'gestion', texto: 'Alertas y casos', color: COLOR.turquesa, acciones: ['ASIGNAR_ALERTA', 'ESCALAR_ALERTA', 'COMENTAR_ALERTA', 'CREAR_CASO', 'CERRAR_CASO', 'ATENCION_CLIENTE', 'RESPUESTA_CLIENTE'] },
  { id: 'seguridad', texto: 'Seguridad', color: COLOR.naranja, acciones: ['LOGIN', 'LOGOUT', 'CAMBIO_PASSWORD', 'BLOQUEAR_TARJETA', 'DESBLOQUEAR_TARJETA', 'LISTA_NEGRA'] },
  { id: 'configuracion', texto: 'Configuración', color: '#8a63d2', acciones: ['CREAR_USUARIO', 'ACTUALIZAR_USUARIO', 'ACTUALIZAR_PARAMETRO', 'ACTUALIZAR_REGLA', 'REENTRENAR_MODELO', 'GENERAR_REPORTE'] },
]
const CATEGORIA_DE = Object.fromEntries(CATEGORIAS.flatMap((c) => c.acciones.map((a) => [a, c])))

const ICONO_ACCION = {
  LOGIN: 'llave', LOGOUT: 'salir', CAMBIO_PASSWORD: 'candado', CREAR_USUARIO: 'usuarios', ACTUALIZAR_USUARIO: 'usuarios',
  ASIGNAR_ALERTA: 'usuarios', CONFIRMAR_FRAUDE: 'escudo-alerta', DESCARTAR_ALERTA: 'escudo-ok', ESCALAR_ALERTA: 'flecha',
  COMENTAR_ALERTA: 'correo', BLOQUEAR_TARJETA: 'candado', DESBLOQUEAR_TARJETA: 'llave', ATENCION_CLIENTE: 'telefono',
  RESPUESTA_CLIENTE: 'cliente', ACTUALIZAR_PARAMETRO: 'ia', ACTUALIZAR_REGLA: 'regla', LISTA_NEGRA: 'prohibido',
  REENTRENAR_MODELO: 'ia', GENERAR_REPORTE: 'reporte', CREAR_CASO: 'caso', CERRAR_CASO: 'caso',
}
/** Acciones que conviene resaltar con su propio color. */
const TONO_ACCION = { CONFIRMAR_FRAUDE: COLOR.rojo, BLOQUEAR_TARJETA: COLOR.rojo, LISTA_NEGRA: COLOR.rojo, DESCARTAR_ALERTA: COLOR.verde, DESBLOQUEAR_TARJETA: COLOR.verde, ESCALAR_ALERTA: COLOR.naranja }
const colorAccion = (a) => TONO_ACCION[a] || CATEGORIA_DE[a]?.color || COLOR.gris

const PERIODOS = [
  { id: 'hoy', texto: 'Hoy', dias: 1 },
  { id: '7', texto: '7 días', dias: 7 },
  { id: '30', texto: '30 días', dias: 30 },
  { id: 'todo', texto: 'Todo' },
]

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function rangoPeriodo(id) {
  const p = PERIODOS.find((x) => x.id === id)
  if (!p?.dias) return { desde: '', hasta: '' }
  const d = new Date()
  d.setDate(d.getDate() - (p.dias - 1))
  return { desde: iso(d), hasta: iso(new Date()) }
}

/** "Hoy", "Ayer" o "viernes, 20 de noviembre". */
function tituloDia(fecha) {
  const d = new Date(fecha)
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === hoy.getFullYear() ? undefined : 'numeric' })
}
const hora = (f) => new Date(f).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
const nombreUsuario = (u) => (u ? `${u.nombres} ${u.apellidos}` : 'Sistema')

function csv(filas) {
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')
}

/** Historial de acciones (quién hizo qué) y, para el Administrador, los inicios de sesión. */
export default function Auditoria() {
  const { tieneRol } = useAuth()
  const verAccesos = tieneRol(...PERMISOS.verAccesos)
  const [vista, setVista] = useState('acciones')
  return (
    <>
      <Encabezado titulo="Auditoría"
        descripcion={tieneRol('ANALISTA') ? 'Registro de las acciones que realizaste en el sistema' : 'Trazabilidad de todas las acciones y accesos al sistema'} />
      {verAccesos && (
        <div className="pestanas">
          <button className={vista === 'acciones' ? 'activa' : ''} onClick={() => setVista('acciones')}>
            <Icono nombre="actividad" size={14} /> Acciones
          </button>
          <button className={vista === 'accesos' ? 'activa' : ''} onClick={() => setVista('accesos')}>
            <Icono nombre="llave" size={14} /> Inicios de sesión
          </button>
        </div>
      )}
      {vista === 'acciones' ? <Acciones /> : <Accesos />}
    </>
  )
}

// =====================================================================
// Acciones
// =====================================================================
function Acciones() {
  const { tieneRol } = useAuth()
  const esAnalista = tieneRol('ANALISTA')
  const [periodo, setPeriodo] = useState('7')
  const [rango, setRango] = useState(() => rangoPeriodo('7'))
  const [categoria, setCategoria] = useState('')
  const [accion, setAccion] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [texto, setTexto] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [exportando, setExportando] = useState(false)
  const [errorExportar, setErrorExportar] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setQ(texto.trim()); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [texto])

  const acciones = accion ? [accion] : categoria ? CATEGORIAS.find((c) => c.id === categoria).acciones : []
  const filtros = { accion: acciones.join(','), usuarioId, desde: rango.desde, hasta: rango.hasta, q }
  const { datos, cargando, error } = useApi('/api/auditoria', { ...filtros, page, size: 25 })
  // El resumen no se filtra por usuario: así el ranking y la lista del filtro siguen completos
  const resumen = useApi('/api/auditoria/resumen', { dias: 14 })
  const r = resumen.datos

  // ---------- Datos del resumen ----------
  const porDia = useMemo(() => (r?.porDia || []).map((d) => {
    const fila = { fecha: d.fecha }
    CATEGORIAS.forEach((c) => { fila[c.id] = c.acciones.reduce((s, a) => s + (d.acciones?.[a] || 0), 0) })
    return fila
  }), [r])
  const totalCategoria = (c) => c.acciones.reduce((s, a) => s + (r?.porAccion?.[a] || 0), 0)
  const decisiones = (r?.porAccion?.CONFIRMAR_FRAUDE || 0) + (r?.porAccion?.DESCARTAR_ALERTA || 0)
  const maxTop = Math.max(1, ...(r?.topUsuarios || []).map((u) => u.total))

  // ---------- Agrupar por día ----------
  const grupos = useMemo(() => {
    const g = []
    for (const h of datos?.content || []) {
      const clave = new Date(h.fecha).toDateString()
      if (!g.length || g.at(-1).clave !== clave) g.push({ clave, titulo: tituloDia(h.fecha), items: [] })
      g.at(-1).items.push(h)
    }
    return g
  }, [datos])

  const hayFiltros = categoria || accion || usuarioId || q || periodo !== '7'
  function elegirPeriodo(id) {
    setPeriodo(id)
    setRango(rangoPeriodo(id))
    setPage(0)
  }
  function limpiar() {
    setCategoria(''); setAccion(''); setUsuarioId(''); setTexto(''); setQ('')
    elegirPeriodo('7')
  }

  async function exportar() {
    setExportando(true)
    setErrorExportar(null)
    try {
      const params = Object.fromEntries(Object.entries({ ...filtros, page: 0, size: 2000 }).filter(([, v]) => v !== ''))
      const { data } = await api.get('/api/auditoria', { params })
      const filas = [['Fecha', 'Usuario', 'Rol', 'Acción', 'Detalle', 'Alerta', 'IP'],
        ...data.content.map((h) => [fechaHora(h.fecha), nombreUsuario(h.usuario), h.usuario ? etiqueta(h.usuario.rol) : '', etiqueta(h.accion), h.detalle, h.alerta?.codigo, h.ip])]
      descargarArchivo(new Blob([csv(filas)], { type: 'text/csv;charset=utf-8' }), `auditoria-${iso(new Date())}.csv`)
    } catch (e) {
      setErrorExportar(mensajeError(e))
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <Aviso>{error || resumen.error}</Aviso>
      <Aviso alCerrar={() => setErrorExportar(null)}>{errorExportar}</Aviso>

      {/* ---------- Indicadores ---------- */}
      {r && (
        <div className="kpis">
          <Kpi icono="actividad" titulo="Acciones hoy" valor={numero(r.hoy)} detalle={`${numero(r.total)} en los últimos 14 días`} />
          <Kpi icono="escudo-ok" titulo="Decisiones de fraude" valor={numero(decisiones)} tono="verde"
            detalle={`${r.porAccion?.CONFIRMAR_FRAUDE || 0} confirmadas · ${r.porAccion?.DESCARTAR_ALERTA || 0} descartadas`} />
          <Kpi icono="candado" titulo="Bloqueos de tarjeta" valor={numero(r.porAccion?.BLOQUEAR_TARJETA || 0)} tono={r.porAccion?.BLOQUEAR_TARJETA ? 'rojo' : undefined}
            detalle={`${r.porAccion?.DESBLOQUEAR_TARJETA || 0} desbloqueos en 14 días`} />
          {esAnalista ? (
            <Kpi icono="flecha" titulo="Escalamientos" valor={numero(r.porAccion?.ESCALAR_ALERTA || 0)} tono="naranja" detalle="Alertas que escalaste o transferiste" />
          ) : (
            <Kpi icono="usuarios" titulo="Usuarios con actividad" valor={numero(r.usuariosActivos)}
              detalle={r.porSistema ? `${numero(r.porSistema)} acciones automáticas del sistema` : 'En los últimos 14 días'} />
          )}
        </div>
      )}

      {r && (
        <div className="dash-fila dash-fila-2-1">
          <section className="panel">
            <TituloPanel titulo="Actividad por día" sub="Acciones registradas en los últimos 14 días, por tipo">
              <ResumenLeyenda items={CATEGORIAS.map((c) => ({ texto: c.texto, valor: totalCategoria(c), color: c.color }))} />
            </TituloPanel>
            <BarrasDia datos={porDia} alto={220} series={CATEGORIAS.map((c) => ({ clave: c.id, nombre: c.texto, color: c.color }))} />
          </section>

          <section className="panel">
            {esAnalista ? (
              <>
                <TituloPanel titulo="Mis acciones por tipo" sub="Últimos 14 días" />
                <ul className="ranking">
                  {Object.entries(r.porAccion || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a, n]) => (
                    <li key={a}>
                      <span className="ranking-icono" style={{ '--rc': colorAccion(a) }}><Icono nombre={ICONO_ACCION[a] || 'actividad'} size={14} /></span>
                      <span className="ranking-datos">
                        <span className="ranking-linea"><strong>{etiqueta(a)}</strong><span>{numero(n)}</span></span>
                        <span className="ranking-barra"><span style={{ width: `${(n / Math.max(1, ...Object.values(r.porAccion))) * 100}%`, background: colorAccion(a) }} /></span>
                      </span>
                    </li>
                  ))}
                </ul>
                {!Object.keys(r.porAccion || {}).length && <Vacio icono="actividad">Sin acciones en este periodo.</Vacio>}
              </>
            ) : (
              <>
                <TituloPanel titulo="Usuarios más activos" sub="Últimos 14 días · clic para filtrar" />
                {r.topUsuarios?.length ? (
                  <ul className="ranking">
                    {r.topUsuarios.map((u) => (
                      <li key={u.id}>
                        <button className={`ranking-fila ${String(u.id) === usuarioId ? 'sel' : ''}`}
                          onClick={() => { setUsuarioId(String(u.id) === usuarioId ? '' : String(u.id)); setPage(0) }}>
                          <span className="avatar-mini">{iniciales(u.nombre)}</span>
                          <span className="ranking-datos">
                            <span className="ranking-linea"><strong>{u.nombre}</strong><span>{numero(u.total)}</span></span>
                            <small className="muted">{etiqueta(u.rol)}</small>
                            <span className="ranking-barra"><span style={{ width: `${(u.total / maxTop) * 100}%` }} /></span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <Vacio icono="usuarios">Sin actividad de usuarios en este periodo.</Vacio>}
              </>
            )}
          </section>
        </div>
      )}

      {/* ---------- Filtros ---------- */}
      <div className="panel barra-filtros">
        <div className="barra-filtros-fila">
          <span className="input-prefijo filtro-buscar">
            <span className="input-prefijo-icono"><Icono nombre="buscar" size={16} /></span>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar en el detalle, usuario, alerta o IP" aria-label="Buscar" />
          </span>
          <div className="segmentado segmentado-texto" role="group" aria-label="Periodo">
            {PERIODOS.map((p) => (
              <button key={p.id} className={periodo === p.id ? 'activo' : ''} onClick={() => elegirPeriodo(p.id)}>{p.texto}</button>
            ))}
            <button className={periodo === 'rango' ? 'activo' : ''} onClick={() => setPeriodo('rango')}><Icono nombre="calendario" size={13} /> Rango</button>
          </div>
          {periodo === 'rango' && (
            <span className="rango-fechas">
              <input type="date" value={rango.desde} max={rango.hasta || undefined} onChange={(e) => { setRango({ ...rango, desde: e.target.value }); setPage(0) }} aria-label="Desde" />
              <span className="muted">a</span>
              <input type="date" value={rango.hasta} min={rango.desde || undefined} onChange={(e) => { setRango({ ...rango, hasta: e.target.value }); setPage(0) }} aria-label="Hasta" />
            </span>
          )}
          {!esAnalista && r?.usuarios?.length > 0 && (
            <select value={usuarioId} onChange={(e) => { setUsuarioId(e.target.value); setPage(0) }} aria-label="Usuario">
              <option value="">Todos los usuarios</option>
              {r.usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          )}
          <button className="btn btn-sec" onClick={exportar} disabled={exportando || !datos?.content?.length} title="Descargar las acciones filtradas (hasta 2000)">
            <Icono nombre="documento" size={15} /> {exportando ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
        <div className="barra-filtros-fila">
          <div className="chips-filtro" role="group" aria-label="Tipo de acción">
            <button className={!categoria && !accion ? 'activo' : ''} onClick={() => { setCategoria(''); setAccion(''); setPage(0) }}>Todas</button>
            {CATEGORIAS.map((c) => (
              <button key={c.id} className={categoria === c.id ? 'activo' : ''} style={{ '--chip': c.color }}
                onClick={() => { setCategoria(categoria === c.id ? '' : c.id); setAccion(''); setPage(0) }}>
                <i style={{ background: c.color }} /> {c.texto}
              </button>
            ))}
          </div>
          <select className="select-compacto" value={accion} onChange={(e) => { setAccion(e.target.value); setPage(0) }} aria-label="Acción específica">
            <option value="">{categoria ? `Cualquier acción de ${CATEGORIAS.find((c) => c.id === categoria).texto.toLowerCase()}` : 'Acción específica'}</option>
            {(categoria ? CATEGORIAS.find((c) => c.id === categoria).acciones : ENUMS.tipoAccion).map((a) => <option key={a} value={a}>{etiqueta(a)}</option>)}
          </select>
          <span className="barra-filtros-total">
            {datos && `${numero(datos.page?.totalElements ?? datos.totalElements ?? datos.content.length)} registros`}
            {hayFiltros && <button className="enlace-boton" onClick={limpiar}>Limpiar filtros</button>}
          </span>
        </div>
      </div>

      {/* ---------- Registro ---------- */}
      {cargando && !datos && <TablaCargando columnas={5} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.content.length === 0 ? (
            <Vacio icono={hayFiltros ? 'buscar' : 'auditoria'} titulo={hayFiltros ? 'Sin resultados' : 'Sin registros'}
              accion={hayFiltros && <button className="btn btn-sec btn-sm" onClick={limpiar}>Limpiar filtros</button>}>
              {hayFiltros ? 'No hay acciones que coincidan con los filtros.' : 'Todavía no hay acciones registradas.'}
            </Vacio>
          ) : (
            <div className={`auditoria-registro ${cargando ? 'recargando' : ''}`}>
              {grupos.map((g) => (
                <div key={g.clave} className="auditoria-dia">
                  <h3 className="auditoria-dia-titulo"><span>{g.titulo}</span><small>{g.items.length} {g.items.length === 1 ? 'acción' : 'acciones'}</small></h3>
                  <ul className="auditoria-lista">
                    {g.items.map((h) => (
                      <li key={h.id} className="auditoria-item" style={{ '--ac': colorAccion(h.accion) }}>
                        <span className="auditoria-hora" title={fechaHora(h.fecha)}>{hora(h.fecha)}</span>
                        <span className="auditoria-icono"><Icono nombre={ICONO_ACCION[h.accion] || 'actividad'} size={15} /></span>
                        <div className="auditoria-cuerpo">
                          <div className="auditoria-linea">
                            <strong className="auditoria-accion">{etiqueta(h.accion)}</strong>
                            {h.alerta && <Link to={`/alertas/${h.alerta.id}`} className="chip-dato mono">{h.alerta.codigo}</Link>}
                          </div>
                          {h.detalle && <p className="auditoria-detalle">{h.detalle}</p>}
                          <div className="auditoria-meta">
                            <span className="persona-mini">
                              <span className="avatar-mini">{h.usuario ? iniciales(nombreUsuario(h.usuario)) : <Icono nombre="ia" size={11} />}</span>
                              {nombreUsuario(h.usuario)}
                              {h.usuario?.rol && <small className="muted"> · {etiqueta(h.usuario.rol)}</small>}
                            </span>
                            {h.ip && <span className="mono muted">IP {h.ip}</span>}
                            <span className="muted">{haceCuanto(h.fecha)}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <Paginacion pagina={datos.page} alCambiar={setPage} />
        </section>
      )}
    </>
  )
}

// =====================================================================
// Inicios de sesión (solo Administrador)
// =====================================================================
function Accesos() {
  const [texto, setTexto] = useState('')
  const [correo, setCorreo] = useState('')
  const [resultado, setResultado] = useState('')
  const [ip, setIp] = useState('')
  const [page, setPage] = useState(0)
  const { datos, cargando, error } = useApi('/api/auditoria/accesos', { correo, exitoso: resultado, ip, page, size: 25 })
  const resumen = useApi('/api/auditoria/accesos/resumen')
  const r = resumen.datos

  useEffect(() => {
    const t = setTimeout(() => { setCorreo(texto.trim()); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [texto])

  const hayFiltros = correo || resultado || ip
  const limpiar = () => { setTexto(''); setCorreo(''); setResultado(''); setIp(''); setPage(0) }
  const totalFallidos14 = (r?.porDia || []).reduce((s, d) => s + d.fallidos, 0)
  const totalExitosos14 = (r?.porDia || []).reduce((s, d) => s + d.exitosos, 0)

  return (
    <>
      <Aviso>{error || resumen.error}</Aviso>
      {r && (
        <div className="kpis">
          <Kpi icono="check" titulo="Accesos exitosos" valor={numero(r.exitosos24h)} tono="verde" detalle="Últimas 24 horas" />
          <Kpi icono="candado" titulo="Intentos fallidos" valor={numero(r.fallidos24h)} tono={r.fallidos24h >= 10 ? 'rojo' : r.fallidos24h ? 'naranja' : 'verde'}
            detalle={r.fallidos24h >= 10 ? 'Volumen inusual: revisa los correos abajo' : 'Últimas 24 horas'} />
          <Kpi icono="escudo-ok" titulo="Tasa de éxito" valor={r.tasaExito24h == null ? '—' : `${r.tasaExito24h.toFixed(0)}%`}
            detalle="Accesos correctos sobre el total (24 h)" />
          <Kpi icono="actividad" titulo="IPs distintas" valor={numero(r.ips24h)} detalle="Desde las que se intentó ingresar (24 h)" />
        </div>
      )}

      {r && (
        <div className="dash-fila dash-fila-2-1">
          <section className="panel">
            <TituloPanel titulo="Inicios de sesión por día" sub="Últimos 14 días">
              <ResumenLeyenda items={[
                { texto: 'Exitosos', valor: totalExitosos14, color: COLOR.verde },
                { texto: 'Fallidos', valor: totalFallidos14, color: COLOR.rojo },
              ]} />
            </TituloPanel>
            <BarrasDia datos={r.porDia} alto={220} series={[
              { clave: 'exitosos', nombre: 'Exitosos', color: COLOR.verde },
              { clave: 'fallidos', nombre: 'Fallidos', color: COLOR.rojo },
            ]} />
          </section>
          <section className="panel">
            <TituloPanel titulo="Correos con más fallos" sub="Últimos 14 días · clic para filtrar" />
            {r.correosConFallos?.length ? (
              <ul className="ranking">
                {r.correosConFallos.map((c) => (
                  <li key={c.correo}>
                    <button className={`ranking-fila ${correo === c.correo ? 'sel' : ''}`}
                      onClick={() => { const nuevo = correo === c.correo ? '' : c.correo; setTexto(nuevo); setCorreo(nuevo); setResultado(nuevo ? 'false' : ''); setPage(0) }}>
                      <span className={`ranking-icono ${c.fallidos >= 5 ? 'peligro' : ''}`} style={{ '--rc': c.fallidos >= 5 ? COLOR.rojo : COLOR.naranja }}>
                        <Icono nombre="candado" size={14} />
                      </span>
                      <span className="ranking-datos">
                        <span className="ranking-linea"><strong>{c.correo}</strong><span>{numero(c.fallidos)}</span></span>
                        <small className="muted">Último intento {haceCuanto(c.ultimo)}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <Vacio icono="escudo-ok" titulo="Sin intentos fallidos">Nadie falló al iniciar sesión en los últimos 14 días.</Vacio>}
          </section>
        </div>
      )}

      <div className="panel barra-filtros">
        <div className="barra-filtros-fila">
          <span className="input-prefijo filtro-buscar">
            <span className="input-prefijo-icono"><Icono nombre="buscar" size={16} /></span>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por correo" aria-label="Correo" />
          </span>
          <div className="segmentado segmentado-texto" role="group" aria-label="Resultado">
            {[['', 'Todos'], ['true', 'Exitosos'], ['false', 'Fallidos']].map(([v, t]) => (
              <button key={v} className={resultado === v ? 'activo' : ''} onClick={() => { setResultado(v); setPage(0) }}>{t}</button>
            ))}
          </div>
          {ip && (
            <span className="chip-dato chip-filtro-activo">
              IP <span className="mono">{ip}</span>
              <button onClick={() => { setIp(''); setPage(0) }} aria-label="Quitar filtro de IP">×</button>
            </span>
          )}
          <span className="barra-filtros-total">
            {hayFiltros && <button className="enlace-boton" onClick={limpiar}>Limpiar filtros</button>}
          </span>
        </div>
      </div>

      {cargando && !datos && <TablaCargando columnas={5} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.content.length === 0 ? (
            <Vacio icono={hayFiltros ? 'buscar' : 'llave'} titulo={hayFiltros ? 'Sin resultados' : 'Sin registros'}
              accion={hayFiltros && <button className="btn btn-sec btn-sm" onClick={limpiar}>Limpiar filtros</button>}>
              {hayFiltros ? 'No hay inicios de sesión que coincidan con los filtros.' : 'Todavía no hay inicios de sesión registrados.'}
            </Vacio>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Resultado</th><th>Correo</th><th>Detalle</th><th>IP</th><th>Fecha</th></tr></thead>
                <tbody>
                  {datos.content.map((a) => (
                    <tr key={a.id} className={a.exitoso ? '' : 'fila-fallida'}>
                      <td>
                        <span className={`estado-acceso ${a.exitoso ? 'ok' : 'mal'}`}>
                          <Icono nombre={a.exitoso ? 'check' : 'candado'} size={13} /> {a.exitoso ? 'Exitoso' : 'Fallido'}
                        </span>
                      </td>
                      <td><strong>{a.correo}</strong></td>
                      <td className="celda-texto">{a.detalle || <span className="muted">—</span>}</td>
                      <td>
                        {a.ip ? (
                          <button className="enlace-boton mono" onClick={() => { setIp(a.ip); setPage(0) }} title="Ver todos los accesos desde esta IP">{a.ip}</button>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td className="nowrap">{fechaHora(a.fecha)}<br /><small className="muted">{haceCuanto(a.fecha)}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion pagina={datos.page} alCambiar={setPage} />
        </section>
      )}
    </>
  )
}
