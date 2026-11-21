import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ModalAtencion, ModalEscalar, escalarAlerta, registrarLlamada } from '../components/AccionesAlerta'
import Icono from '../components/Icono'
import { Aviso, Badge, Campo, Cargando, Detalles, Interruptor, MedidorRiesgo, Modal, Opciones, PieModal, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { etiqueta, fechaHora, moneda } from '../utils/formato'
import { FormCaso } from './Casos'

const COLOR_NIVEL = { BAJO: 'var(--verde)', MEDIO: 'var(--amarillo)', ALTO: 'var(--naranja)', CRITICO: 'var(--rojo)' }

/** Ícono de cada acción del historial. */
const ICONO_ACCION = {
  ASIGNAR_ALERTA: 'usuarios', CONFIRMAR_FRAUDE: 'escudo-alerta', DESCARTAR_ALERTA: 'escudo-ok', ESCALAR_ALERTA: 'flecha',
  COMENTAR_ALERTA: 'correo', BLOQUEAR_TARJETA: 'candado', DESBLOQUEAR_TARJETA: 'llave', ATENCION_CLIENTE: 'telefono',
  RESPUESTA_CLIENTE: 'cliente', CREAR_CASO: 'caso', CERRAR_CASO: 'caso', LISTA_NEGRA: 'prohibido',
}
const TONO_ACCION = { CONFIRMAR_FRAUDE: 'rojo', BLOQUEAR_TARJETA: 'rojo', LISTA_NEGRA: 'rojo', DESCARTAR_ALERTA: 'verde', DESBLOQUEAR_TARJETA: 'verde', ESCALAR_ALERTA: 'naranja' }

const iniciales = (p) => `${p?.nombres?.[0] || ''}${p?.apellidos?.[0] || ''}`.toUpperCase()

/** Ficha completa de una alerta: datos de la compra, factores de la IA y acciones del analista. */
export default function AlertaDetalle() {
  const { id } = useParams()
  const { usuario, tieneRol } = useAuth()
  const navigate = useNavigate()
  const { datos: a, setDatos, cargando, error, recargar } = useApi(`/api/alertas/${id}`)
  const comentarios = useApi(`/api/alertas/${id}/comentarios`)
  const historial = useApi(`/api/alertas/${id}/historial`)
  const notificaciones = useApi(`/api/alertas/${id}/notificaciones`)
  const atenciones = useApi(`/api/alertas/${id}/atenciones`)

  const [modal, setModal] = useState(null) // 'decidir' | 'escalar' | 'asignar' | 'atencion' | 'caso'
  const [aviso, setAviso] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  if (cargando && !a) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!a) return null

  const tx = a.transaccion
  const tarjeta = tx.tarjeta
  const cliente = tarjeta?.cliente
  const activa = ['PENDIENTE', 'ASIGNADA', 'EN_REVISION', 'ESCALADA'].includes(a.estado)
  const puede = (accion) => tieneRol(...PERMISOS[accion])
  // El Supervisor solo decide las alertas que le escalaron
  const puedeDecidir = puede('decidirAlerta') || (a.estado === 'ESCALADA' && puede('decidirAlertaEscalada'))

  /** Ejecuta una acción, muestra el resultado y recarga todo lo relacionado. */
  async function accion(peticion, mensajeOk) {
    setErrorAccion(null)
    setOcupado(true)
    try {
      const res = await peticion()
      const data = res?.data
      if (data?.id === a.id) setDatos(data)
      else recargar()
      if (res?.parcial) setErrorAccion(res.mensaje)
      else setAviso(res?.mensaje || mensajeOk)
      setModal(null)
      historial.recargar()
      comentarios.recargar()
      notificaciones.recargar()
      atenciones.recargar()
      return true
    } catch (e) {
      setErrorAccion(mensajeError(e))
      return false
    } finally {
      setOcupado(false)
    }
  }

  const abrir = (m) => {
    setErrorAccion(null)
    setModal(m)
  }
  const cerrar = () => setModal(null)

  const factores = [...(a.factores || [])].sort((x, y) => (y.impacto || 0) - (x.impacto || 0))
  const maxImpacto = Math.max(0.01, ...factores.map((f) => f.impacto || 0))
  const contactos = [
    ...(notificaciones.datos || []).map((n) => ({ tipo: 'aviso', fecha: n.fechaEnvio, n })),
    ...(atenciones.datos || []).map((t) => ({ tipo: 'llamada', fecha: t.fecha, t })),
  ].sort((x, y) => new Date(y.fecha) - new Date(x.fecha))

  return (
    <>
      {/* ---------- Cabecera ---------- */}
      <div className="detalle-cabecera">
        <Link to="/alertas" className="volver"><Icono nombre="flecha-izq" size={16} /> Alertas</Link>
        <div className="detalle-titulo">
          <h1>Alerta <span className="mono-titulo">{a.codigo}</span></h1>
          <Badge valor={a.estado} />
          <Badge valor={a.prioridad} texto={`Prioridad ${etiqueta(a.prioridad).toLowerCase()}`} />
        </div>
        <p className="muted">Transacción {tx.codigo} · {fechaHora(tx.fechaHora)}</p>
      </div>

      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso alCerrar={() => setErrorAccion(null)}>{!modal && errorAccion}</Aviso>

      {/* Resultado si ya fue decidida */}
      {(a.estado === 'CONFIRMADA' || a.estado === 'DESCARTADA') && (
        <div className={`decision-banner ${a.estado === 'CONFIRMADA' ? 'rojo' : 'verde'}`}>
          <span className="decision-icono"><Icono nombre={a.estado === 'CONFIRMADA' ? 'escudo-alerta' : 'escudo-ok'} size={20} /></span>
          <span className="decision-texto">
            <strong>{a.estado === 'CONFIRMADA' ? 'Fraude confirmado' : 'Descartada como falso positivo'}</strong>
            <small>
              {a.decididoPor ? `Por ${a.decididoPor.nombres} ${a.decididoPor.apellidos}` : 'Decisión registrada'}
              {a.fechaDecision && ` · ${fechaHora(a.fechaDecision)}`}
            </small>
            {a.comentarioDecision && <q>{a.comentarioDecision}</q>}
          </span>
        </div>
      )}

      {/* ---------- Resumen: riesgo, compra y cliente ---------- */}
      <section className="panel alerta-hero" style={{ '--nivel': COLOR_NIVEL[a.nivelRiesgo] || 'var(--primario)' }}>
        <MedidorRiesgo valor={a.probabilidad} nivel={a.nivelRiesgo} />

        <div className="hero-compra">
          <span className="hero-etiqueta">Monto de la compra</span>
          <strong className="hero-monto">{moneda(tx.monto, tx.moneda)}</strong>
          <span className="hero-comercio">
            <Icono nombre="comercio" size={15} /> {tx.comercio?.nombre}
            <span className="muted"> · {etiqueta(tx.comercio?.categoria)}</span>
          </span>
          <span className="hero-chips">
            <span className="chip-dato"><Icono nombre="flecha" size={13} /> {tx.ciudad || '—'}</span>
            <span className="chip-dato"><Icono nombre="transaccion" size={13} /> {etiqueta(tx.canal)}</span>
            <span className="chip-dato"><Icono nombre="ia" size={13} /> {tx.evaluadoPorIa ? `IA ${tx.versionModelo || ''}` : 'Reglas de respaldo'}</span>
            {tx.tiempoEvaluacionMs != null && <span className="chip-dato"><Icono nombre="rayo" size={13} /> {tx.tiempoEvaluacionMs} ms</span>}
          </span>
        </div>

        <div className="hero-cliente">
          <span className="hero-etiqueta">Cliente</span>
          {cliente ? (
            <Link to={`/clientes/${cliente.id}`} className="hero-persona">
              <span className="ficha-avatar">{iniciales(cliente)}</span>
              <span>
                <strong>{cliente.nombres} {cliente.apellidos}</strong>
                <small>{cliente.telefono ? cliente.telefono : 'Sin teléfono'}</small>
              </span>
            </Link>
          ) : <span className="muted">—</span>}
          <span className="hero-tarjeta">
            <span className="mono">{tarjeta?.numeroEnmascarado}</span>
            <span className="muted">{etiqueta(tarjeta?.tipo)}</span>
            <Badge valor={tarjeta?.estado} />
          </span>
        </div>
      </section>

      {/* ---------- Acciones según rol y estado ---------- */}
      {(activa || (!a.caso && puede('crearCaso'))) && (
        <div className="barra-acciones">
          <span className="barra-acciones-titulo">Acciones</span>
          {activa && puede('tomarAlerta') && a.asignadoA?.id !== usuario.id && (
            <button className="btn btn-sec" disabled={ocupado} onClick={() => accion(() => api.patch(`/api/alertas/${id}/tomar`), 'Tomaste la alerta para revisión')}>
              <Icono nombre="cliente" size={16} /> Tomar alerta
            </button>
          )}
          {activa && puede('asignarAlerta') && <button className="btn btn-sec" onClick={() => abrir('asignar')}><Icono nombre="usuarios" size={16} /> Asignar</button>}
          {activa && puede('escalarAlerta') && a.estado !== 'ESCALADA' && (
            <button className="btn btn-sec" onClick={() => abrir('escalar')}><Icono nombre="flecha" size={16} /> Escalar / transferir</button>
          )}
          {activa && puede('registrarAtencion') && <button className="btn btn-sec" onClick={() => abrir('atencion')}><Icono nombre="telefono" size={16} /> Registrar llamada</button>}
          {activa && puede('reenviarNotificacion') && (
            <button className="btn btn-sec" disabled={ocupado} onClick={() => accion(() => api.post(`/api/notificaciones/alerta/${id}/reenviar`), 'Se envió una nueva notificación al cliente')}>
              <Icono nombre="correo" size={16} /> Reenviar aviso
            </button>
          )}
          {!a.caso && puede('crearCaso') && <button className="btn btn-sec" onClick={() => abrir('caso')}><Icono nombre="caso" size={16} /> Crear caso</button>}
          <div className="espaciador" />
          {activa && puedeDecidir && (
            <button className="btn btn-primario btn-destacado" onClick={() => abrir('decidir')}>
              <Icono nombre="escudo-ok" size={16} /> Tomar decisión
            </button>
          )}
        </div>
      )}

      <div className="detalle-grid">
        {/* ---------- Columna principal ---------- */}
        <div className="detalle-col">
          <section className="panel">
            <div className="panel-titulo">
              <div>
                <h2>¿Por qué se generó la alerta?</h2>
                <p className="panel-sub">Factores que más influyeron en la probabilidad, de mayor a menor</p>
              </div>
            </div>
            {factores.length ? (
              <ol className="factores-lista">
                {factores.map((f, i) => {
                  const imp = f.impacto || 0
                  const tono = imp >= 0.3 ? 'rojo' : imp >= 0.15 ? 'naranja' : 'amarillo'
                  return (
                    <li key={f.id || f.factor || i}>
                      <span className={`factor-num factor-${tono}`}>{i + 1}</span>
                      <span className="factor-cuerpo">
                        <span className="factor-linea">
                          <span>{f.descripcion}</span>
                          <strong className={`factor-impacto factor-${tono}`}>+{imp.toFixed(2)}</strong>
                        </span>
                        <span className="factor-pista"><span className={`factor-${tono}`} style={{ width: `${(imp / maxImpacto) * 100}%` }} /></span>
                      </span>
                    </li>
                  )
                })}
              </ol>
            ) : <Vacio>Sin factores explicativos</Vacio>}
          </section>

          <section className="panel">
            <div className="panel-titulo">
              <div><h2>Datos de la compra</h2></div>
              <Link to={`/transacciones/${tx.id}`} className="btn btn-sec btn-sm">Ver transacción <Icono nombre="flecha" size={14} /></Link>
            </div>
            <Detalles items={[
              ['Código', <span key="c" className="mono">{tx.codigo}</span>],
              ['Fecha y hora', fechaHora(tx.fechaHora)],
              ['Comercio', `${tx.comercio?.nombre} (${etiqueta(tx.comercio?.categoria)})`],
              ['Canal', etiqueta(tx.canal)],
              ['Ciudad', tx.ciudad],
              ['Estado de la transacción', <Badge key="e" valor={tx.estado} />],
              ['IP', tx.ip ? <span key="ip" className="mono">{tx.ip}</span> : null],
              ['Dispositivo', tx.dispositivo ? <span key="d" className="mono">{tx.dispositivo}</span> : null],
            ]} />
          </section>

          <Comentarios alertaId={id} lista={comentarios} puedeComentar={puede('comentarAlerta')} alComentar={() => historial.recargar()} />
        </div>

        {/* ---------- Columna lateral ---------- */}
        <div className="detalle-col">
          <section className="panel">
            <h2>Seguimiento</h2>
            <ul className="seguimiento">
              <li>
                <small>Asignada a</small>
                {a.asignadoA ? (
                  <span className="persona-mini"><span className="avatar-mini">{iniciales(a.asignadoA)}</span>{a.asignadoA.nombres} {a.asignadoA.apellidos}</span>
                ) : <span className="muted">Sin asignar</span>}
              </li>
              <li>
                <small>Creada</small>
                <span>{fechaHora(a.fechaCreacion)}</span>
              </li>
              <li>
                <small>Caso</small>
                {a.caso ? <Link to={`/casos/${a.caso.id}`}>{a.caso.codigo}</Link> : <span className="muted">Sin caso</span>}
              </li>
            </ul>
          </section>

          <section className="panel">
            <h2>Contacto con el cliente</h2>
            {contactos.length ? (
              <ul className="timeline">
                {contactos.map((x) => x.tipo === 'aviso' ? (
                  <li key={`n${x.n.id}`}>
                    <span className="timeline-icono"><Icono nombre="correo" size={14} /></span>
                    <div>
                      <div className="timeline-linea"><strong>Aviso por {etiqueta(x.n.canal)}</strong> <Badge valor={x.n.estado} /></div>
                      <small className="muted">Enviado {fechaHora(x.n.fechaEnvio)}{x.n.fechaRespuesta ? ` · respondió ${fechaHora(x.n.fechaRespuesta)}` : ''}</small>
                    </div>
                  </li>
                ) : (
                  <li key={`a${x.t.id}`}>
                    <span className="timeline-icono"><Icono nombre="telefono" size={14} /></span>
                    <div>
                      <div className="timeline-linea"><strong>Llamada de {x.t.operador?.nombres}</strong> <Badge valor={x.t.resultado} /></div>
                      {x.t.observacion && <p className="timeline-nota">{x.t.observacion}</p>}
                      <small className="muted">{fechaHora(x.t.fecha)}{x.t.tarjetaBloqueada ? ' · tarjeta bloqueada' : ''}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Vacio>Aún no hay contacto con el cliente</Vacio>}
          </section>

          <section className="panel">
            <h2>Historial</h2>
            {historial.datos?.length ? (
              <ul className="timeline">
                {historial.datos.map((h) => (
                  <li key={h.id} className={TONO_ACCION[h.accion] ? `tono-${TONO_ACCION[h.accion]}` : ''}>
                    <span className="timeline-icono"><Icono nombre={ICONO_ACCION[h.accion] || 'reloj'} size={14} /></span>
                    <div>
                      <div className="timeline-linea"><strong>{etiqueta(h.accion)}</strong></div>
                      {h.detalle && <p className="timeline-nota">{h.detalle}</p>}
                      <small className="muted">{h.usuario ? `${h.usuario.nombres} ${h.usuario.apellidos}` : 'Sistema / cliente'} · {fechaHora(h.fecha)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Vacio>Sin movimientos</Vacio>}
          </section>
        </div>
      </div>

      <ModalDecision abierto={modal === 'decidir'} alCerrar={cerrar} error={errorAccion} enviando={ocupado}
        monto={moneda(tx.monto, tx.moneda)} cliente={cliente ? `${cliente.nombres} ${cliente.apellidos}` : null}
        alEnviar={(body) => accion(() => api.patch(`/api/alertas/${id}/decision`, body), body.esFraude ? 'Fraude confirmado' : 'Alerta descartada como falso positivo')} />
      <ModalEscalar abierto={modal === 'escalar'} alerta={a} error={errorAccion} enviando={ocupado} alCerrar={cerrar}
        alEnviar={(cuerpo) => accion(() => escalarAlerta(id, cuerpo))} />
      <ModalAsignar abierto={modal === 'asignar'} error={errorAccion} enviando={ocupado} actual={a.asignadoA?.id} alCerrar={cerrar}
        alEnviar={(usuarioId) => accion(() => api.patch(`/api/alertas/${id}/asignar`, { usuarioId: Number(usuarioId) }), 'Alerta asignada')} />
      {modal === 'caso' && (
        <FormCaso abierto alertaInicial={a.id} clienteId={cliente?.id} alCerrar={cerrar}
          alGuardar={(caso) => navigate(`/casos/${caso.id}`)} />
      )}
      <ModalAtencion abierto={modal === 'atencion'} alerta={a} puedeEscalar={puede('escalarAlerta')} error={errorAccion} enviando={ocupado}
        alCerrar={cerrar} alEnviar={(cuerpo) => accion(() => registrarLlamada(id, cuerpo))} />
    </>
  )
}

function Comentarios({ alertaId, lista, puedeComentar, alComentar }) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await api.post(`/api/alertas/${alertaId}/comentarios`, { texto })
      setTexto('')
      lista.recargar()
      alComentar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-titulo">
        <div>
          <h2>Comentarios</h2>
          <p className="panel-sub">Notas internas del equipo (el cliente no las ve)</p>
        </div>
        {lista.datos?.length > 0 && <span className="perfil-contador">{lista.datos.length}</span>}
      </div>
      {lista.datos?.length ? (
        <ul className="hilo">
          {lista.datos.map((c) => (
            <li key={c.id}>
              <span className="avatar-mini">{iniciales(c.usuario)}</span>
              <div className="hilo-burbuja">
                <div className="hilo-cabecera">
                  <strong>{c.usuario?.nombres} {c.usuario?.apellidos}</strong>
                  <small className="muted">{fechaHora(c.fecha)}</small>
                </div>
                <p>{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : <Vacio>Sin comentarios todavía</Vacio>}
      {puedeComentar && (
        <form onSubmit={enviar} className="hilo-form">
          <Aviso alCerrar={() => setError(null)}>{error}</Aviso>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe una nota para el equipo…" rows={2} maxLength={1000} required />
          <div className="hilo-form-pie">
            <small className="muted">{texto.length}/1000</small>
            <button className="btn btn-primario btn-sm" disabled={enviando || !texto.trim()}>
              {enviando ? 'Enviando…' : <><Icono nombre="correo" size={14} /> Comentar</>}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function ModalDecision({ abierto, alCerrar, alEnviar, error, enviando, monto, cliente }) {
  const [esFraude, setEsFraude] = useState(null)
  const [comentario, setComentario] = useState('')
  const [bloquearTarjeta, setBloquearTarjeta] = useState(true)
  const opcion = esFraude === null ? null : esFraude ? 'SI' : 'NO'

  return (
    <Modal titulo="Tomar decisión" subtitulo={`Compra de ${monto}${cliente ? ` · ${cliente}` : ''}`} icono="escudo-ok"
      abierto={abierto} alCerrar={alCerrar} ancho={600}>
      <form className="form-modal" onSubmit={(e) => { e.preventDefault(); alEnviar({ esFraude, comentario, bloquearTarjeta: esFraude && bloquearTarjeta }) }}>
        <Aviso>{error}</Aviso>
        <Opciones etiqueta="¿Cuál es el resultado de la revisión?" nombre="decision" valor={opcion} alCambiar={(v) => setEsFraude(v === 'SI')}
          opciones={[
            { valor: 'SI', texto: 'Es fraude', descripcion: 'La transacción queda bloqueada', icono: 'escudo-alerta', tono: 'rojo' },
            { valor: 'NO', texto: 'Falso positivo', descripcion: 'Se aprueba la compra y se libera la tarjeta', icono: 'escudo-ok', tono: 'verde' },
          ]} />
        {esFraude && (
          <Interruptor activo={bloquearTarjeta} alCambiar={setBloquearTarjeta} titulo="Bloquear la tarjeta definitivamente"
            descripcion="Recomendado cuando el cliente no reconoce la compra" />
        )}
        <Campo etiqueta="Comentario" opcional extra={`${comentario.length}/500`}>
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} maxLength={500}
            placeholder={esFraude === false ? 'Ej. El cliente confirmó la compra por teléfono' : 'Ej. Cliente no reconoce la compra; varios intentos en minutos'} />
        </Campo>
        {esFraude !== null && (
          <div className={`nota ${esFraude ? 'nota-peligro' : 'nota-info'}`}>
            <Icono nombre={esFraude ? 'alerta' : 'check'} size={16} />
            <span>
              {esFraude
                ? <>Se registrará como <strong>fraude confirmado</strong>{bloquearTarjeta ? ' y la tarjeta quedará bloqueada' : ''}. Esta decisión cierra la alerta.</>
                : <>Se registrará como <strong>falso positivo</strong> y la compra quedará aprobada. Esta decisión cierra la alerta.</>}
            </span>
          </div>
        )}
        <PieModal alCancelar={alCerrar} enviando={enviando} deshabilitado={esFraude === null}
          texto={esFraude === null ? 'Elige una opción' : esFraude ? 'Confirmar fraude' : 'Confirmar falso positivo'}
          icono={esFraude ? 'escudo-alerta' : 'check'} tono={esFraude ? 'peligro' : esFraude === false ? 'exito' : 'primario'} />
      </form>
    </Modal>
  )
}

/** Modal con un solo campo de texto (escalar, cerrar caso, etc.). También se usa en CasoDetalle. */
export function ModalTexto({
  abierto, titulo, subtitulo, icono = 'correo', tono, etiqueta: texto, placeholder, textoBoton = 'Guardar',
  alCerrar, alEnviar, error, enviando: enviandoExterno, max = 500,
}) {
  const [valor, setValor] = useState('')
  const [enviandoLocal, setEnviandoLocal] = useState(false)
  const enviando = enviandoExterno ?? enviandoLocal

  async function enviar(e) {
    e.preventDefault()
    setEnviandoLocal(true)
    try {
      if (await alEnviar(valor)) setValor('')
    } finally {
      setEnviandoLocal(false)
    }
  }

  return (
    <Modal titulo={titulo} subtitulo={subtitulo} icono={icono} tono={tono} abierto={abierto} alCerrar={alCerrar} ancho={520}>
      <form className="form-modal" onSubmit={enviar}>
        <Aviso>{error}</Aviso>
        <Campo etiqueta={texto} requerido extra={`${valor.length}/${max}`}>
          <textarea value={valor} onChange={(e) => setValor(e.target.value)} rows={4} maxLength={max} placeholder={placeholder} required autoFocus />
        </Campo>
        <PieModal alCancelar={alCerrar} enviando={enviando} texto={textoBoton} deshabilitado={!valor.trim()} />
      </form>
    </Modal>
  )
}

function ModalAsignar({ abierto, alCerrar, alEnviar, error, enviando, actual }) {
  // Analistas y operadores activos (endpoint permitido para Admin, Supervisor y Analista)
  const asignables = useApi(abierto ? '/api/usuarios/asignables' : null)
  const [usuarioId, setUsuarioId] = useState('')
  const [q, setQ] = useState('')
  const lista = (asignables.datos || []).filter((u) => !q || u.nombre.toLowerCase().includes(q.toLowerCase()))

  return (
    <Modal titulo="Asignar alerta" subtitulo="Elige al analista u operador que se encargará de revisarla" icono="usuarios"
      abierto={abierto} alCerrar={alCerrar} ancho={520}>
      <form className="form-modal" onSubmit={(e) => { e.preventDefault(); alEnviar(usuarioId) }}>
        <Aviso>{error || asignables.error}</Aviso>
        <div className="selector-buscable">
          <span className="input-prefijo">
            <span className="input-prefijo-icono"><Icono nombre="buscar" size={16} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre" aria-label="Buscar usuario" autoFocus />
          </span>
          <ul role="listbox">
            {asignables.cargando && <li className="selector-vacio">Cargando…</li>}
            {!asignables.cargando && lista.length === 0 && <li className="selector-vacio">No hay usuarios disponibles</li>}
            {lista.map((u) => {
              const sel = String(u.id) === String(usuarioId)
              const partes = u.nombre.split(' ')
              return (
                <li key={u.id} role="option" aria-selected={sel}>
                  <button type="button" className={`selector-persona ${sel ? 'sel' : ''}`} onClick={() => setUsuarioId(String(u.id))}>
                    <span className="avatar-mini">{`${partes[0]?.[0] || ''}${partes[1]?.[0] || ''}`.toUpperCase()}</span>
                    <span className="selector-persona-datos">
                      <span className="selector-titulo">{u.nombre}</span>
                      <span className="selector-sub">{etiqueta(u.rol)}{u.id === actual ? ' · asignado actualmente' : ''}</span>
                    </span>
                    {sel && <Icono nombre="check" size={16} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <PieModal alCancelar={alCerrar} enviando={enviando} texto="Asignar" icono="usuarios" deshabilitado={!usuarioId} />
      </form>
    </Modal>
  )
}
