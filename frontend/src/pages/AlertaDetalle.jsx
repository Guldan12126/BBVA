import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, BarraRiesgo, Campo, Cargando, Detalles, Encabezado, Modal, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, etiqueta, fechaHora, moneda } from '../utils/formato'
import { FormCaso } from './Casos'

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

  const [modal, setModal] = useState(null) // 'decidir' | 'escalar' | 'asignar' | 'atencion'
  const [aviso, setAviso] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  if (cargando && !a) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!a) return null

  const tx = a.transaccion
  const tarjeta = tx.tarjeta
  const cliente = tarjeta?.cliente
  const activa = ['PENDIENTE', 'ASIGNADA', 'EN_REVISION', 'ESCALADA'].includes(a.estado)
  const puede = (accion) => tieneRol(...PERMISOS[accion])

  /** Ejecuta una acción, muestra el resultado y recarga todo lo relacionado. */
  async function accion(peticion, mensajeOk) {
    setErrorAccion(null)
    try {
      const { data } = await peticion()
      if (data?.id === a.id) setDatos(data)
      else recargar()
      setAviso(mensajeOk)
      setModal(null)
      historial.recargar()
      comentarios.recargar()
      notificaciones.recargar()
      atenciones.recargar()
      return true
    } catch (e) {
      setErrorAccion(mensajeError(e))
      return false
    }
  }

  return (
    <>
      <Encabezado titulo={`Alerta ${a.codigo}`} descripcion={`Transacción ${tx.codigo} · ${fechaHora(tx.fechaHora)}`}>
        <Link to="/alertas" className="btn btn-sec">← Volver</Link>
      </Encabezado>

      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso alCerrar={() => setErrorAccion(null)}>{!modal && errorAccion}</Aviso>

      {/* Barra de acciones según rol y estado */}
      <div className="barra-acciones">
        <Badge valor={a.estado} />
        <Badge valor={a.prioridad} texto={`Prioridad ${etiqueta(a.prioridad).toLowerCase()}`} />
        <div className="espaciador" />
        {activa && puede('tomarAlerta') && a.asignadoA?.id !== usuario.id && (
          <button className="btn btn-sec" onClick={() => accion(() => api.patch(`/api/alertas/${id}/tomar`), 'Tomaste la alerta para revisión')}>
            Tomar alerta
          </button>
        )}
        {activa && puede('asignarAlerta') && <button className="btn btn-sec" onClick={() => setModal('asignar')}>Asignar</button>}
        {activa && puede('escalarAlerta') && a.estado !== 'ESCALADA' && (
          <button className="btn btn-sec" onClick={() => setModal('escalar')}>Escalar</button>
        )}
        {activa && puede('registrarAtencion') && <button className="btn btn-sec" onClick={() => setModal('atencion')}>Registrar llamada</button>}
        {activa && puede('reenviarNotificacion') && (
          <button className="btn btn-sec" onClick={() => accion(() => api.post(`/api/notificaciones/alerta/${id}/reenviar`), 'Se envió una nueva notificación al cliente')}>
            Reenviar aviso al cliente
          </button>
        )}
        {!a.caso && puede('crearCaso') && <button className="btn btn-sec" onClick={() => setModal('caso')}>Crear caso</button>}
        {activa && puede('decidirAlerta') && <button className="btn btn-primario" onClick={() => setModal('decidir')}>Tomar decisión</button>}
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2>Evaluación de riesgo</h2>
          <div className="score-grande">
            <BarraRiesgo valor={a.probabilidad} />
            <Badge valor={a.nivelRiesgo} />
          </div>
          <Detalles items={[
            ['Evaluado por', tx.evaluadoPorIa ? `Modelo de IA (${tx.versionModelo})` : 'Reglas de respaldo'],
            ['Tiempo de evaluación', tx.tiempoEvaluacionMs != null ? `${tx.tiempoEvaluacionMs} ms` : null],
            ['Asignada a', a.asignadoA ? `${a.asignadoA.nombres} ${a.asignadoA.apellidos}` : 'Sin asignar'],
            a.decididoPor && ['Decidida por', `${a.decididoPor.nombres} ${a.decididoPor.apellidos} · ${fechaHora(a.fechaDecision)}`],
            a.comentarioDecision && ['Comentario de la decisión', a.comentarioDecision],
            a.caso && ['Caso', <Link key="c" to={`/casos/${a.caso.id}`}>{a.caso.codigo}</Link>],
          ]} />
          <h3>¿Por qué se generó la alerta?</h3>
          {a.factores?.length ? (
            <ul className="factores">
              {a.factores.map((f) => (
                <li key={f.id || f.factor}>
                  <div className="factor-texto">{f.descripcion}</div>
                  <div className="factor-barra"><div style={{ width: `${Math.min(100, (f.impacto || 0) * 100)}%` }} /></div>
                  <small className="muted">impacto {(f.impacto ?? 0).toFixed(2)}</small>
                </li>
              ))}
            </ul>
          ) : <Vacio>Sin factores explicativos</Vacio>}
        </section>

        <section className="panel">
          <h2>Datos de la compra</h2>
          <Detalles items={[
            ['Monto', <strong key="m" className="monto-grande">{moneda(tx.monto, tx.moneda)}</strong>],
            ['Comercio', `${tx.comercio?.nombre} (${etiqueta(tx.comercio?.categoria)})`],
            ['Canal', etiqueta(tx.canal)],
            ['Ciudad', tx.ciudad],
            ['Estado de la transacción', <Badge key="e" valor={tx.estado} />],
            ['Tarjeta', `${tarjeta?.numeroEnmascarado} · ${etiqueta(tarjeta?.tipo)}`],
            ['Estado de la tarjeta', <Badge key="t" valor={tarjeta?.estado} />],
            ['Cliente', cliente && <Link key="cl" to={`/clientes/${cliente.id}`}>{cliente.nombres} {cliente.apellidos}</Link>],
            ['Teléfono', cliente?.telefono],
            ['IP / dispositivo', [tx.ip, tx.dispositivo].filter(Boolean).join(' · ') || null],
          ]} />
          <Link to={`/transacciones/${tx.id}`}>Ver transacción completa →</Link>
        </section>

        <Comentarios alertaId={id} lista={comentarios} puedeComentar={puede('comentarAlerta')} alComentar={() => historial.recargar()} />

        <section className="panel">
          <h2>Contacto con el cliente</h2>
          {notificaciones.datos?.length || atenciones.datos?.length ? (
            <ul className="linea-tiempo">
              {(notificaciones.datos || []).map((n) => (
                <li key={`n${n.id}`}>
                  <div><Badge valor={n.estado} /> Aviso por {etiqueta(n.canal)}</div>
                  <small className="muted">Enviado {fechaHora(n.fechaEnvio)}{n.fechaRespuesta ? ` · respondió ${fechaHora(n.fechaRespuesta)}` : ''}</small>
                </li>
              ))}
              {(atenciones.datos || []).map((t) => (
                <li key={`a${t.id}`}>
                  <div><Badge valor={t.resultado} /> Llamada de {t.operador?.nombres}</div>
                  {t.observacion && <div>{t.observacion}</div>}
                  <small className="muted">{fechaHora(t.fecha)}{t.tarjetaBloqueada ? ' · tarjeta bloqueada' : ''}</small>
                </li>
              ))}
            </ul>
          ) : <Vacio>Aún no hay contacto con el cliente</Vacio>}
        </section>

        <section className="panel panel-ancho">
          <h2>Historial</h2>
          {historial.datos?.length ? (
            <ul className="linea-tiempo">
              {historial.datos.map((h) => (
                <li key={h.id}>
                  <div><strong>{etiqueta(h.accion)}</strong> {h.detalle && `— ${h.detalle}`}</div>
                  <small className="muted">{h.usuario ? `${h.usuario.nombres} ${h.usuario.apellidos}` : 'Sistema / cliente'} · {fechaHora(h.fecha)}</small>
                </li>
              ))}
            </ul>
          ) : <Vacio>Sin movimientos</Vacio>}
        </section>
      </div>

      <ModalDecision abierto={modal === 'decidir'} alCerrar={() => setModal(null)} error={errorAccion}
        alEnviar={(body) => accion(() => api.patch(`/api/alertas/${id}/decision`, body), body.esFraude ? 'Fraude confirmado' : 'Alerta descartada como falso positivo')} />
      <ModalTexto abierto={modal === 'escalar'} titulo="Escalar alerta" etiqueta="Motivo" error={errorAccion} alCerrar={() => setModal(null)}
        alEnviar={(motivo) => accion(() => api.patch(`/api/alertas/${id}/escalar`, { motivo }), 'Alerta escalada')} />
      <ModalAsignar abierto={modal === 'asignar'} error={errorAccion} alCerrar={() => setModal(null)}
        alEnviar={(usuarioId) => accion(() => api.patch(`/api/alertas/${id}/asignar`, { usuarioId: Number(usuarioId) }), 'Alerta asignada')} />
      {modal === 'caso' && (
        <FormCaso abierto alertaInicial={a.id} clienteId={cliente?.id} alCerrar={() => setModal(null)}
          alGuardar={(caso) => navigate(`/casos/${caso.id}`)} />
      )}
      <ModalAtencion abierto={modal === 'atencion'} error={errorAccion} alCerrar={() => setModal(null)}
        alEnviar={(body) => accion(() => api.post('/api/atencion', { ...body, alertaId: Number(id) }), 'Atención registrada')} />
    </>
  )
}

function Comentarios({ alertaId, lista, puedeComentar, alComentar }) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState(null)

  async function enviar(e) {
    e.preventDefault()
    try {
      await api.post(`/api/alertas/${alertaId}/comentarios`, { texto })
      setTexto('')
      lista.recargar()
      alComentar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <section className="panel">
      <h2>Comentarios</h2>
      {lista.datos?.length ? (
        <ul className="comentarios">
          {lista.datos.map((c) => (
            <li key={c.id}>
              <strong>{c.usuario?.nombres} {c.usuario?.apellidos}</strong>
              <small className="muted"> · {fechaHora(c.fecha)}</small>
              <p>{c.texto}</p>
            </li>
          ))}
        </ul>
      ) : <Vacio>Sin comentarios</Vacio>}
      {puedeComentar && (
        <form onSubmit={enviar} className="form-linea">
          <Aviso>{error}</Aviso>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe una nota para el equipo…" rows={2} maxLength={1000} required />
          <button className="btn btn-primario">Comentar</button>
        </form>
      )}
    </section>
  )
}

function ModalDecision({ abierto, alCerrar, alEnviar, error }) {
  const [esFraude, setEsFraude] = useState(null)
  const [comentario, setComentario] = useState('')
  const [bloquearTarjeta, setBloquearTarjeta] = useState(true)

  return (
    <Modal titulo="Decisión del analista" abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); alEnviar({ esFraude, comentario, bloquearTarjeta: esFraude && bloquearTarjeta }) }}>
        <Aviso>{error}</Aviso>
        <div className="opciones-decision">
          <button type="button" className={`opcion ${esFraude === true ? 'sel-rojo' : ''}`} onClick={() => setEsFraude(true)}>
            <strong>Es fraude</strong>
            <small>La transacción queda bloqueada</small>
          </button>
          <button type="button" className={`opcion ${esFraude === false ? 'sel-verde' : ''}`} onClick={() => setEsFraude(false)}>
            <strong>Falso positivo</strong>
            <small>Se aprueba la compra y se libera la tarjeta</small>
          </button>
        </div>
        {esFraude && (
          <label className="check">
            <input type="checkbox" checked={bloquearTarjeta} onChange={(e) => setBloquearTarjeta(e.target.checked)} />
            Bloquear la tarjeta definitivamente
          </label>
        )}
        <Campo etiqueta="Comentario (opcional)">
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} maxLength={500} />
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario" disabled={esFraude === null}>Confirmar decisión</button>
        </div>
      </form>
    </Modal>
  )
}

export function ModalTexto({ abierto, titulo, etiqueta: texto, alCerrar, alEnviar, error, max = 500 }) {
  const [valor, setValor] = useState('')
  return (
    <Modal titulo={titulo} abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={async (e) => { e.preventDefault(); if (await alEnviar(valor)) setValor('') }}>
        <Aviso>{error}</Aviso>
        <Campo etiqueta={texto}>
          <textarea value={valor} onChange={(e) => setValor(e.target.value)} rows={3} maxLength={max} required autoFocus />
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

function ModalAsignar({ abierto, alCerrar, alEnviar, error }) {
  const analistas = useApi(abierto ? '/api/usuarios' : null, { rol: 'ANALISTA' })
  const operadores = useApi(abierto ? '/api/usuarios' : null, { rol: 'OPERADOR' })
  const [usuarioId, setUsuarioId] = useState('')
  const lista = [...(analistas.datos || []), ...(operadores.datos || [])].filter((u) => u.estado === 'ACTIVO')
  // Solo el Administrador puede listar usuarios; los demás escriben el ID
  const sinPermiso = !!analistas.error

  return (
    <Modal titulo="Asignar alerta" abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); alEnviar(usuarioId) }}>
        <Aviso>{error}</Aviso>
        {sinPermiso ? (
          <Campo etiqueta="ID del usuario" ayuda="Tu rol no puede listar usuarios; escribe el ID del analista u operador.">
            <input type="number" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} required />
          </Campo>
        ) : (
          <Campo etiqueta="Asignar a">
            <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} required>
              <option value="">Selecciona…</option>
              {lista.map((u) => (
                <option key={u.id} value={u.id}>{u.nombres} {u.apellidos} — {etiqueta(u.rol)}</option>
              ))}
            </select>
          </Campo>
        )}
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Asignar</button>
        </div>
      </form>
    </Modal>
  )
}

function ModalAtencion({ abierto, alCerrar, alEnviar, error }) {
  const [resultado, setResultado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [bloquearTarjeta, setBloquearTarjeta] = useState(false)
  return (
    <Modal titulo="Registrar llamada al cliente" abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); alEnviar({ resultado, observacion, bloquearTarjeta }) }}>
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Resultado">
          <SelectEnum valores={ENUMS.resultadoAtencion} valor={resultado} alCambiar={setResultado} todos="Selecciona…" required />
        </Campo>
        <Campo etiqueta="Observación">
          <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={3} maxLength={1000} />
        </Campo>
        <label className="check">
          <input type="checkbox" checked={bloquearTarjeta} onChange={(e) => setBloquearTarjeta(e.target.checked)} />
          Bloquear la tarjeta a pedido del cliente
        </label>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Registrar</button>
        </div>
      </form>
    </Modal>
  )
}
