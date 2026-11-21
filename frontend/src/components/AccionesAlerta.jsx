import { useEffect, useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import useApi from '../hooks/useApi'
import { fechaHora, moneda } from '../utils/formato'
import Icono from './Icono'
import { Aviso, Campo, Interruptor, Modal, Opciones, PieModal } from './UI'

/**
 * Modales que comparten la ficha de la alerta (/alertas/:id) y la pantalla de Atención (/atencion):
 * - ModalAtencion: registrar la llamada al cliente (y, si hace falta, escalar en el mismo paso).
 * - ModalEscalar: escalar al Supervisor o transferir a un Analista.
 */

/** Motivos frecuentes: un clic los agrega al texto. */
const MOTIVOS = [
  'Posible clonación de tarjeta',
  'Robo de identidad / suplantación',
  'El cliente presentó denuncia policial',
  'Varias compras que el cliente no reconoce',
  'El cliente pide hablar con un especialista',
]

const ACTIVAS = ['PENDIENTE', 'ASIGNADA', 'EN_REVISION', 'ESCALADA']
export const alertaActiva = (a) => !!a && ACTIVAS.includes(a.estado)

const nombreCliente = (c) => (c ? `${c.nombres} ${c.apellidos}` : '')

export const mensajeEscalado = (e) =>
  e.destino === 'ANALISTA' ? (e.usuarioId ? 'Alerta transferida al analista' : 'Alerta devuelta a la cola de analistas como urgente')
    : 'Alerta escalada al supervisor'

/** Escala la alerta (PATCH /escalar). Devuelve { data, mensaje }. */
export async function escalarAlerta(alertaId, cuerpo) {
  const { data } = await api.patch(`/api/alertas/${alertaId}/escalar`, cuerpo)
  return { data, mensaje: mensajeEscalado(cuerpo) }
}

/**
 * Registra la llamada y, si se pidió, escala en el mismo paso.
 * Si la llamada se guardó pero el escalado falló, devuelve parcial=true (no hay que reintentar la llamada).
 */
export async function registrarLlamada(alertaId, { escalar, ...cuerpo }) {
  await api.post('/api/atencion', { ...cuerpo, alertaId: Number(alertaId) })
  if (!escalar) return { mensaje: 'Llamada registrada' }
  try {
    await api.patch(`/api/alertas/${alertaId}/escalar`, escalar)
    return { mensaje: `Llamada registrada. ${mensajeEscalado(escalar)}` }
  } catch (e) {
    return { parcial: true, mensaje: `La llamada se registró, pero no se pudo escalar: ${mensajeError(e)}` }
  }
}

/** Destinos que puede elegir el rol actual (el Supervisor no se escala a sí mismo). */
function useDestinos() {
  const { tieneRol } = useAuth()
  const destinos = []
  if (!tieneRol('SUPERVISOR')) {
    destinos.push({ valor: 'SUPERVISOR', texto: 'Supervisor de agencia', descripcion: 'Él revisa y toma la decisión final', icono: 'flecha', tono: 'naranja' })
  }
  destinos.push({ valor: 'ANALISTA', texto: 'Analista de fraude', descripcion: 'Se transfiere para que lo investigue', icono: 'escudo-alerta', tono: 'rojo' })
  return destinos
}

/** Campos comunes del escalado: destino, analista (opcional) y motivo con atajos. */
function CamposEscalado({ valor, alCambiar, abierto }) {
  const destinos = useDestinos()
  const asignables = useApi(abierto && valor.destino === 'ANALISTA' ? '/api/usuarios/asignables' : null)
  const analistas = (asignables.datos || []).filter((u) => u.rol === 'ANALISTA')
  const set = (cambios) => alCambiar({ ...valor, ...cambios })

  // Si solo hay un destino posible (Supervisor), queda elegido
  useEffect(() => {
    if (!valor.destino && destinos.length === 1) set({ destino: destinos[0].valor })
  }, [valor.destino, destinos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function agregarMotivo(m) {
    const actual = valor.motivo.trim()
    if (actual.includes(m)) return
    set({ motivo: actual ? `${actual}. ${m}` : m })
  }

  return (
    <>
      {destinos.length > 1 && (
        <Opciones etiqueta="¿A quién se lo pasas?" nombre="destino" valor={valor.destino} alCambiar={(d) => set({ destino: d, usuarioId: '' })}
          opciones={destinos} />
      )}
      {valor.destino === 'ANALISTA' && (
        <Campo etiqueta="Analista" ayuda="Si eliges «Cualquier analista», vuelve a la cola general como urgente">
          <select value={valor.usuarioId} onChange={(e) => set({ usuarioId: e.target.value })}>
            <option value="">Cualquier analista (cola general)</option>
            {analistas.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </Campo>
      )}
      <Campo etiqueta="Motivo" requerido extra={`${valor.motivo.length}/500`}>
        <div className="motivos-rapidos">
          {MOTIVOS.map((m) => (
            <button key={m} type="button" className={`chip-motivo ${valor.motivo.includes(m) ? 'sel' : ''}`} onClick={() => agregarMotivo(m)}>
              {valor.motivo.includes(m) ? <Icono nombre="check" size={12} /> : '+'} {m}
            </button>
          ))}
        </div>
        <textarea value={valor.motivo} onChange={(e) => set({ motivo: e.target.value })} rows={3} maxLength={500}
          placeholder="Describe lo que reportó el cliente y por qué necesita otra revisión" />
      </Campo>
      <div className="nota nota-info">
        <Icono nombre="campana" size={16} />
        <span>La alerta pasa a prioridad <strong>urgente</strong> y el motivo queda en el historial y en los comentarios.</span>
      </div>
    </>
  )
}

const ESCALADO_VACIO = { destino: '', usuarioId: '', motivo: '' }
const escaladoListo = (e) => !!e.destino && !!e.motivo.trim()
const cuerpoEscalado = (e) => ({ motivo: e.motivo.trim(), destino: e.destino, usuarioId: e.usuarioId ? Number(e.usuarioId) : null })

/** Escalar al Supervisor o transferir a un Analista. alEnviar recibe { motivo, destino, usuarioId }. */
export function ModalEscalar({ abierto, alCerrar, alEnviar, error, enviando, alerta }) {
  const [esc, setEsc] = useState(ESCALADO_VACIO)
  useEffect(() => { if (abierto) setEsc(ESCALADO_VACIO) }, [abierto])
  const cliente = alerta?.transaccion?.tarjeta?.cliente

  return (
    <Modal titulo="Escalar o transferir alerta" icono="flecha" tono="naranja" abierto={abierto} alCerrar={alCerrar} ancho={600}
      subtitulo={alerta ? `${alerta.codigo}${cliente ? ` · ${nombreCliente(cliente)}` : ''}` : undefined}>
      <form className="form-modal" onSubmit={(e) => { e.preventDefault(); alEnviar(cuerpoEscalado(esc)) }}>
        <Aviso>{error}</Aviso>
        <CamposEscalado valor={esc} alCambiar={setEsc} abierto={abierto} />
        <PieModal alCancelar={alCerrar} enviando={enviando} deshabilitado={!escaladoListo(esc)} icono="flecha"
          texto={esc.destino === 'ANALISTA' ? 'Transferir al analista' : 'Escalar al supervisor'} />
      </form>
    </Modal>
  )
}

/**
 * Registrar la llamada al cliente. alEnviar recibe { resultado, observacion, bloquearTarjeta, escalar }
 * donde escalar es null o { motivo, destino, usuarioId }.
 */
export function ModalAtencion({ abierto, alCerrar, alEnviar, error, enviando, alerta, puedeEscalar }) {
  const [resultado, setResultado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [bloquearTarjeta, setBloquearTarjeta] = useState(false)
  const [escalar, setEscalar] = useState(false)
  const [esc, setEsc] = useState(ESCALADO_VACIO)
  const [verGuion, setVerGuion] = useState(true)

  useEffect(() => {
    if (!abierto) return
    setResultado('')
    setObservacion('')
    setBloquearTarjeta(false)
    setEscalar(false)
    setEsc(ESCALADO_VACIO)
  }, [abierto, alerta?.id])

  const tx = alerta?.transaccion
  const cliente = tx?.tarjeta?.cliente
  // Si el cliente confirma la compra, la alerta se cierra como falso positivo: ya no hay nada que escalar
  const seCierra = resultado === 'CLIENTE_CONFIRMA' && !bloquearTarjeta
  const permiteEscalar = puedeEscalar && alerta?.estado !== 'ESCALADA' && !seCierra
  const conEscalado = permiteEscalar && escalar
  const listo = !!resultado && (!conEscalado || escaladoListo(esc))

  function enviar(e) {
    e.preventDefault()
    alEnviar({ resultado, observacion, bloquearTarjeta, escalar: conEscalado ? cuerpoEscalado(esc) : null })
  }

  return (
    <Modal titulo="Registrar llamada al cliente" icono="telefono" abierto={abierto} alCerrar={alCerrar} ancho={660}
      subtitulo={cliente ? `${nombreCliente(cliente)} · alerta ${alerta.codigo}` : undefined}>
      <form className="form-modal" onSubmit={enviar}>
        <Aviso>{error}</Aviso>

        {cliente && (
          <div className="llamada-ficha">
            <span className="llamada-ficha-icono"><Icono nombre="telefono" size={18} /></span>
            <span className="llamada-ficha-datos">
              <small>Llamar a</small>
              {cliente.telefono
                ? <a href={`tel:${cliente.telefono.replace(/\s/g, '')}`} className="llamada-numero">{cliente.telefono}</a>
                : <strong className="muted">Sin teléfono registrado</strong>}
              <small>DNI {cliente.dni || '—'}</small>
            </span>
            {tx && (
              <span className="llamada-ficha-compra">
                <small>Compra a verificar</small>
                <strong>{moneda(tx.monto, tx.moneda)}</strong>
                <small>{tx.comercio?.nombre} · {fechaHora(tx.fechaHora)}</small>
              </span>
            )}
          </div>
        )}

        {cliente && tx && (
          <div className="guion">
            <button type="button" className="guion-titulo" onClick={() => setVerGuion(!verGuion)} aria-expanded={verGuion}>
              <Icono nombre="documento" size={14} /> Guion sugerido
              <span className={`guion-chevron ${verGuion ? 'abierto' : ''}`}><Icono nombre="chevron" size={14} /></span>
            </button>
            {verGuion && (
              <ol>
                <li>Preséntate y confirma que hablas con <strong>{nombreCliente(cliente)}</strong> (pide su DNI).</li>
                <li>Indica que detectamos una compra de <strong>{moneda(tx.monto, tx.moneda)}</strong> en <strong>{tx.comercio?.nombre}</strong>{tx.ciudad ? ` (${tx.ciudad})` : ''}.</li>
                <li>Pregunta si reconoce la compra. Nunca pidas claves, el CVV ni códigos SMS.</li>
                <li>Si no la reconoce, ofrece bloquear la tarjeta y, si el caso es complejo, escálalo.</li>
              </ol>
            )}
          </div>
        )}

        <Opciones etiqueta="Resultado de la llamada" nombre="resultado" valor={resultado} alCambiar={setResultado} columnas={3}
          opciones={[
            { valor: 'CLIENTE_CONFIRMA', texto: 'Confirma', descripcion: 'Reconoce la compra', icono: 'escudo-ok', tono: 'verde' },
            { valor: 'CLIENTE_NIEGA', texto: 'Niega', descripcion: 'No reconoce la compra', icono: 'escudo-alerta', tono: 'rojo' },
            { valor: 'NO_CONTESTA', texto: 'No contesta', descripcion: 'Volver a intentar', icono: 'reloj', tono: 'naranja' },
          ]} />
        {seCierra && (
          <div className="nota nota-info">
            <Icono nombre="check" size={16} />
            <span>Al registrar, la compra se aprueba y la tarjeta se libera de inmediato (queda como falso positivo).</span>
          </div>
        )}
        {resultado === 'CLIENTE_NIEGA' && (
          <div className="nota nota-peligro">
            <Icono nombre="candado" size={16} />
            <span>La tarjeta se bloqueará temporalmente y la alerta pasará a prioridad urgente para el analista.</span>
          </div>
        )}
        <Campo etiqueta="Observación" opcional extra={`${observacion.length}/1000`}>
          <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={3} maxLength={1000}
            placeholder="Resume lo que dijo el cliente" />
        </Campo>
        {resultado !== 'CLIENTE_NIEGA' && (
          <Interruptor activo={bloquearTarjeta} alCambiar={setBloquearTarjeta} titulo="Bloquear la tarjeta a pedido del cliente"
            descripcion="Úsalo si el cliente lo solicita durante la llamada" />
        )}

        {permiteEscalar && (
          <div className={`escalado-bloque ${conEscalado ? 'activo' : ''}`}>
            <Interruptor activo={escalar} alCambiar={setEscalar} titulo="Escalar después de registrar la llamada"
              descripcion="Para casos complejos: clonación, robo de identidad, denuncia policial…" />
            {conEscalado && <CamposEscalado valor={esc} alCambiar={setEsc} abierto={abierto} />}
          </div>
        )}

        <PieModal alCancelar={alCerrar} enviando={enviando} icono="telefono" deshabilitado={!listo}
          texto={conEscalado ? 'Registrar y escalar' : 'Registrar llamada'} />
      </form>
    </Modal>
  )
}
