import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ModalAtencion, ModalEscalar, alertaActiva, escalarAlerta, registrarLlamada } from '../components/AccionesAlerta'
import Icono from '../components/Icono'
import { Aviso, Badge, BarraRiesgo, Encabezado, Kpi, TablaCargando, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import useTiempoReal from '../hooks/useTiempoReal'
import { PERMISOS } from '../menu'
import { mensajeError } from '../api/client'
import { etiqueta, fechaHora, moneda, numero } from '../utils/formato'

/** Respuestas del cliente que obligan a llamarlo, en orden de urgencia. */
const POR_LLAMAR = ['NO_RECONOCIDA', 'EXPIRADA']

const nombre = (c) => (c ? `${c.nombres} ${c.apellidos}` : '—')
const esHoy = (f) => f && new Date(f).toDateString() === new Date().toDateString()

/** Junta en un texto todo lo que se puede buscar de una fila. */
const coincide = (q, ...partes) => !q || partes.filter(Boolean).join(' ').toLowerCase().includes(q)

/** Devuelve la alerta con el cliente siempre disponible (el modal lo necesita). */
function conCliente(alerta, cliente) {
  if (!alerta) return null
  const tx = alerta.transaccion || {}
  return { ...alerta, transaccion: { ...tx, tarjeta: { ...tx.tarjeta, cliente: tx.tarjeta?.cliente || cliente } } }
}

/**
 * Pantalla del Operador de Atención al Cliente (también la ve el Analista):
 * clientes por llamar, alertas asignadas, llamadas registradas y avisos enviados.
 * Desde cada fila se puede registrar la llamada o escalar sin entrar a la alerta.
 */
export default function Atencion() {
  const { tieneRol } = useAuth()
  const esOperador = tieneRol('OPERADOR')
  const puedeLlamar = tieneRol(...PERMISOS.registrarAtencion)
  const puedeEscalar = tieneRol(...PERMISOS.escalarAlerta)

  const notificaciones = useApi('/api/notificaciones')
  const mias = useApi('/api/alertas/mias', { activas: true, size: 100 })
  const atenciones = useApi(esOperador ? '/api/atencion/mias' : null)

  const [vista, setVista] = useState('llamar')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null) // { tipo: 'llamada' | 'escalar', alerta }
  const [errorModal, setErrorModal] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [error, setError] = useState(null)
  const q = busqueda.trim().toLowerCase()

  const recargarTodo = useCallback(() => {
    notificaciones.recargar()
    mias.recargar()
    atenciones.recargar()
  }, [notificaciones.recargar, mias.recargar, atenciones.recargar]) // eslint-disable-line react-hooks/exhaustive-deps

  // Alertas nuevas o cambios en vivo: recarga agrupando varios avisos seguidos
  const espera = useRef(null)
  const alCambio = useCallback(() => {
    clearTimeout(espera.current)
    espera.current = setTimeout(recargarTodo, 1500)
  }, [recargarTodo])
  useEffect(() => () => clearTimeout(espera.current), [])
  useTiempoReal('/topic/alertas', alCambio)

  // Mis llamadas agrupadas por alerta (para mostrar intentos previos en cada fila)
  const llamadasPorAlerta = useMemo(() => {
    const m = new Map()
    for (const t of atenciones.datos || []) {
      const id = t.alerta?.id
      if (!id) continue
      if (!m.has(id)) m.set(id, [])
      m.get(id).push(t)
    }
    return m
  }, [atenciones.datos])

  // Por contactar: el último aviso de cada alerta activa en el que el cliente no reconoció o no respondió
  const porLlamar = useMemo(() => {
    const ultimo = new Map()
    for (const n of notificaciones.datos || []) {
      if (!n.alerta) continue
      const prev = ultimo.get(n.alerta.id)
      if (!prev || new Date(n.fechaEnvio) > new Date(prev.fechaEnvio)) ultimo.set(n.alerta.id, n)
    }
    return [...ultimo.values()]
      .filter((n) => POR_LLAMAR.includes(n.estado) && alertaActiva(n.alerta))
      .sort((a, b) => POR_LLAMAR.indexOf(a.estado) - POR_LLAMAR.indexOf(b.estado) || (b.alerta.probabilidad || 0) - (a.alerta.probabilidad || 0))
  }, [notificaciones.datos])

  const misAlertas = mias.datos?.content || []
  const llamadasHoy = (atenciones.datos || []).filter((t) => esHoy(t.fecha))
  const noReconocidas = porLlamar.filter((n) => n.estado === 'NO_RECONOCIDA').length

  // ---------- Filtros de búsqueda ----------
  const filtroCliente = (c, extra) => coincide(q, c?.nombres, c?.apellidos, c?.dni, c?.telefono, ...extra)
  const llamarFiltrado = porLlamar.filter((n) => filtroCliente(n.cliente, [n.alerta?.codigo, n.alerta?.transaccion?.comercio?.nombre]))
  const miasFiltrado = misAlertas.filter((a) => filtroCliente(a.transaccion?.tarjeta?.cliente, [a.codigo, a.transaccion?.comercio?.nombre]))
  const llamadasFiltrado = (atenciones.datos || []).filter((t) => filtroCliente(t.alerta?.transaccion?.tarjeta?.cliente, [t.alerta?.codigo, t.observacion]))
  const avisosFiltrado = (notificaciones.datos || []).filter((n) => filtroCliente(n.cliente, [n.alerta?.codigo]))

  // ---------- Acciones rápidas ----------
  const abrir = (tipo, alerta) => {
    setErrorModal(null)
    setModal({ tipo, alerta })
  }
  async function ejecutar(peticion) {
    setEnviando(true)
    setErrorModal(null)
    try {
      const res = await peticion()
      setModal(null)
      if (res?.parcial) setError(res.mensaje)
      else setAviso(res.mensaje)
      recargarTodo()
      return true
    } catch (e) {
      setErrorModal(mensajeError(e))
      return false
    } finally {
      setEnviando(false)
    }
  }

  /** Botones de cada fila: registrar llamada, escalar, ver casos del cliente y abrir la alerta. */
  function Acciones({ alerta, cliente }) {
    if (!alerta) return null
    const a = conCliente(alerta, cliente)
    const activa = alertaActiva(a)
    return (
      <div className="acciones-fila">
        {activa && puedeLlamar && (
          <button className="btn btn-primario btn-sm" onClick={() => abrir('llamada', a)} title="Registrar el resultado de la llamada">
            <Icono nombre="telefono" size={14} /> Registrar llamada
          </button>
        )}
        {activa && puedeEscalar && a.estado !== 'ESCALADA' && (
          <button className="btn btn-sec btn-sm" onClick={() => abrir('escalar', a)} title="Escalar al supervisor o transferir a un analista">
            <Icono nombre="flecha" size={14} /> Escalar
          </button>
        )}
        {cliente?.dni && (
          <Link to={`/casos?q=${encodeURIComponent(cliente.dni)}`} className="btn btn-sec btn-sm btn-icono" title="Casos de investigación del cliente" aria-label="Casos del cliente">
            <Icono nombre="caso" size={14} />
          </Link>
        )}
        <Link to={`/alertas/${a.id}`} className="btn btn-sec btn-sm btn-icono" title="Abrir la alerta" aria-label="Abrir la alerta">
          <Icono nombre="ojo" size={14} />
        </Link>
      </div>
    )
  }

  function Intentos({ alertaId }) {
    const lista = llamadasPorAlerta.get(alertaId)
    if (!lista?.length) return <span className="muted">Sin llamadas</span>
    return (
      <span className="intentos">
        <strong>{lista.length} {lista.length === 1 ? 'intento' : 'intentos'}</strong>
        <small>Último: {etiqueta(lista[0].resultado).toLowerCase()} · {fechaHora(lista[0].fecha)}</small>
      </span>
    )
  }

  function Telefono({ cliente }) {
    if (!cliente?.telefono) return <span className="muted">—</span>
    return <a href={`tel:${cliente.telefono.replace(/\s/g, '')}`} className="mono enlace-tel"><Icono nombre="telefono" size={13} /> {cliente.telefono}</a>
  }

  const pestanas = [
    { id: 'llamar', texto: 'Por contactar', n: porLlamar.length },
    { id: 'mias', texto: 'Mis alertas', n: misAlertas.length },
    esOperador && { id: 'llamadas', texto: 'Mis llamadas', n: atenciones.datos?.length },
    { id: 'avisos', texto: 'Avisos enviados' },
  ].filter(Boolean)

  const cargandoInicial = (vista === 'llamar' || vista === 'avisos') ? notificaciones.cargando && !notificaciones.datos
    : vista === 'mias' ? mias.cargando && !mias.datos : atenciones.cargando && !atenciones.datos

  const sinResultados = (
    <Vacio icono="buscar" titulo="Sin resultados" accion={<button className="btn btn-sec btn-sm" onClick={() => setBusqueda('')}>Limpiar búsqueda</button>}>
      Nada coincide con «{busqueda}».
    </Vacio>
  )

  return (
    <>
      <Encabezado titulo="Atención al cliente" descripcion="Llama a los clientes que no reconocieron una compra y registra lo que respondieron">
        <button className="btn btn-sec" onClick={recargarTodo}><Icono nombre="actualizar" size={16} /> Actualizar</button>
      </Encabezado>
      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso alCerrar={() => setError(null)}>{error || notificaciones.error || mias.error || atenciones.error}</Aviso>

      <div className="kpis">
        <Kpi icono="telefono" titulo="Por contactar" valor={numero(porLlamar.length)} tono={porLlamar.length ? 'naranja' : 'verde'}
          detalle={porLlamar.length ? 'Clientes esperando tu llamada' : 'No hay llamadas pendientes'} />
        <Kpi icono="escudo-alerta" titulo="No reconocen la compra" valor={numero(noReconocidas)} tono={noReconocidas ? 'rojo' : undefined}
          detalle="Llámalos primero" />
        <Kpi icono="reloj" titulo="Sin respuesta" valor={numero(porLlamar.length - noReconocidas)}
          detalle="El aviso venció sin que el cliente respondiera" />
        {esOperador ? (
          <Kpi icono="check" titulo="Mis llamadas de hoy" valor={numero(llamadasHoy.length)} tono="verde"
            detalle={`${llamadasHoy.filter((t) => t.resultado === 'CLIENTE_NIEGA').length} no reconocidas · ${llamadasHoy.filter((t) => t.resultado === 'NO_CONTESTA').length} sin contestar`} />
        ) : (
          <Kpi icono="campana" titulo="Mis alertas activas" valor={numero(misAlertas.length)} detalle="Asignadas a ti" />
        )}
      </div>

      <div className="atencion-barra">
        <div className="pestanas">
          {pestanas.map((p) => (
            <button key={p.id} className={vista === p.id ? 'activa' : ''} onClick={() => setVista(p.id)}>
              {p.texto}{p.n > 0 && <span className="pestana-contador">{p.n}</span>}
            </button>
          ))}
        </div>
        <span className="input-prefijo filtro-buscar">
          <span className="input-prefijo-icono"><Icono nombre="buscar" size={16} /></span>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Cliente, DNI, teléfono o alerta" aria-label="Buscar" />
        </span>
      </div>

      {cargandoInicial ? <TablaCargando columnas={7} /> : (
        <section className="panel sin-padding">
          {/* ---------- Por contactar ---------- */}
          {vista === 'llamar' && (porLlamar.length === 0 ? (
            <Vacio icono="escudo-ok" titulo="No hay clientes por contactar">
              Aquí aparecen los clientes que respondieron «No reconozco» o que no respondieron el aviso.
            </Vacio>
          ) : llamarFiltrado.length === 0 ? sinResultados : (
            <div className="tabla-scroll">
              <table className="tabla tabla-atencion">
                <thead><tr><th>Cliente</th><th>Teléfono</th><th>Respuesta al aviso</th><th>Compra</th><th>Riesgo</th><th>{esOperador ? 'Mis intentos' : 'Aviso enviado'}</th><th className="der">Acciones</th></tr></thead>
                <tbody>
                  {llamarFiltrado.map((n) => {
                    const tx = n.alerta.transaccion
                    return (
                      <tr key={n.id} className={n.estado === 'NO_RECONOCIDA' ? 'fila-urgente' : ''}>
                        <td><strong>{nombre(n.cliente)}</strong><br /><small className="muted">DNI {n.cliente?.dni || '—'}</small></td>
                        <td><Telefono cliente={n.cliente} /></td>
                        <td><Badge valor={n.estado} /><br /><small className="muted">{fechaHora(n.fechaRespuesta || n.fechaEnvio)}</small></td>
                        <td><strong>{moneda(tx?.monto, tx?.moneda)}</strong><br /><small className="muted">{tx?.comercio?.nombre}</small></td>
                        <td><BarraRiesgo valor={n.alerta.probabilidad} /></td>
                        <td>{esOperador ? <Intentos alertaId={n.alerta.id} /> : fechaHora(n.fechaEnvio)}</td>
                        <td className="der"><Acciones alerta={n.alerta} cliente={n.cliente} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* ---------- Mis alertas ---------- */}
          {vista === 'mias' && (misAlertas.length === 0 ? (
            <Vacio icono="bandeja" titulo="No tienes alertas asignadas">Las alertas que te asignen o tomes aparecerán aquí.</Vacio>
          ) : miasFiltrado.length === 0 ? sinResultados : (
            <div className="tabla-scroll">
              <table className="tabla tabla-atencion">
                <thead><tr><th>Alerta</th><th>Cliente</th><th>Teléfono</th><th>Compra</th><th>Nivel</th><th>Estado</th><th className="der">Acciones</th></tr></thead>
                <tbody>
                  {miasFiltrado.map((a) => {
                    const c = a.transaccion?.tarjeta?.cliente
                    return (
                      <tr key={a.id}>
                        <td><Link to={`/alertas/${a.id}`} className="mono">{a.codigo}</Link><br /><small className="muted">{fechaHora(a.fechaCreacion)}</small></td>
                        <td><strong>{nombre(c)}</strong><br /><small className="muted">DNI {c?.dni || '—'}</small></td>
                        <td><Telefono cliente={c} /></td>
                        <td><strong>{moneda(a.transaccion?.monto, a.transaccion?.moneda)}</strong><br /><small className="muted">{a.transaccion?.comercio?.nombre}</small></td>
                        <td><Badge valor={a.nivelRiesgo} /></td>
                        <td><Badge valor={a.estado} /></td>
                        <td className="der"><Acciones alerta={a} cliente={c} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* ---------- Mis llamadas ---------- */}
          {vista === 'llamadas' && (!atenciones.datos?.length ? (
            <Vacio icono="telefono" titulo="Aún no registras llamadas">Cada llamada que registres quedará aquí con su resultado.</Vacio>
          ) : llamadasFiltrado.length === 0 ? sinResultados : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Fecha</th><th>Cliente</th><th>Alerta</th><th>Resultado</th><th>Observación</th><th>Tarjeta</th></tr></thead>
                <tbody>
                  {llamadasFiltrado.map((t) => (
                    <tr key={t.id}>
                      <td className="nowrap">{fechaHora(t.fecha)}</td>
                      <td>{nombre(t.alerta?.transaccion?.tarjeta?.cliente)}</td>
                      <td>{t.alerta && <Link to={`/alertas/${t.alerta.id}`} className="mono">{t.alerta.codigo}</Link>}</td>
                      <td><Badge valor={t.resultado} /></td>
                      <td className="celda-texto">{t.observacion || <span className="muted">—</span>}</td>
                      <td>{t.tarjetaBloqueada ? <span className="chip-dato chip-rojo"><Icono nombre="candado" size={12} /> Bloqueada</span> : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* ---------- Avisos enviados ---------- */}
          {vista === 'avisos' && (!notificaciones.datos?.length ? (
            <Vacio icono="correo" titulo="Sin avisos">Todavía no se envió ningún aviso a los clientes.</Vacio>
          ) : avisosFiltrado.length === 0 ? sinResultados : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Cliente</th><th>Canal</th><th>Estado</th><th>Enviado</th><th>Respondido</th><th>Alerta</th></tr></thead>
                <tbody>
                  {avisosFiltrado.slice(0, 100).map((n) => (
                    <tr key={n.id}>
                      <td>{nombre(n.cliente)}</td>
                      <td>{etiqueta(n.canal)}</td>
                      <td><Badge valor={n.estado} /></td>
                      <td>{fechaHora(n.fechaEnvio)}</td>
                      <td>{fechaHora(n.fechaRespuesta)}</td>
                      <td>{n.alerta && <Link to={`/alertas/${n.alerta.id}`} className="mono">{n.alerta.codigo}</Link>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {avisosFiltrado.length > 100 && <p className="muted tabla-pie">Se muestran los 100 más recientes. Usa la búsqueda para encontrar otros.</p>}
            </div>
          ))}
        </section>
      )}

      <ModalAtencion abierto={modal?.tipo === 'llamada'} alerta={modal?.alerta} puedeEscalar={puedeEscalar}
        error={errorModal} enviando={enviando} alCerrar={() => setModal(null)}
        alEnviar={(cuerpo) => ejecutar(() => registrarLlamada(modal.alerta.id, cuerpo))} />
      <ModalEscalar abierto={modal?.tipo === 'escalar'} alerta={modal?.alerta}
        error={errorModal} enviando={enviando} alCerrar={() => setModal(null)}
        alEnviar={(cuerpo) => ejecutar(() => escalarAlerta(modal.alerta.id, cuerpo))} />
    </>
  )
}
