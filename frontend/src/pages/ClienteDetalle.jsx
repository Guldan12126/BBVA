import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, Campo, Cargando, Detalles, Encabezado, Modal, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, etiqueta, fechaHora, moneda } from '../utils/formato'
import { FormCliente } from './Clientes'

export default function ClienteDetalle() {
  const { id } = useParams()
  const { tieneRol } = useAuth()
  const { datos: c, setDatos, cargando, error } = useApi(`/api/clientes/${id}`)
  const tarjetas = useApi(`/api/clientes/${id}/tarjetas`)
  const perfil = useApi(`/api/clientes/${id}/perfil`)
  const notificaciones = useApi(`/api/clientes/${id}/notificaciones`)
  const transacciones = useApi('/api/transacciones', { clienteId: id, size: 10 })
  const [editando, setEditando] = useState(false)
  const [nuevaTarjeta, setNuevaTarjeta] = useState(false)
  const [bloqueo, setBloqueo] = useState(null) // { tarjeta, accion: 'bloquear' | 'desbloquear' }
  const [aviso, setAviso] = useState(null)
  const esAdmin = tieneRol(...PERMISOS.editarCatalogos)

  if (cargando && !c) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!c) return null
  const p = perfil.datos

  return (
    <>
      <Encabezado titulo={`${c.nombres} ${c.apellidos}`} descripcion={`DNI ${c.dni} · ${c.ciudad}`}>
        <Link to="/clientes" className="btn btn-sec">← Clientes</Link>
        {esAdmin && <button className="btn btn-sec" onClick={() => setEditando(true)}>Editar</button>}
      </Encabezado>
      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>

      <div className="grid-2">
        <section className="panel">
          <h2>Datos de contacto</h2>
          <Detalles items={[['Teléfono', c.telefono], ['Correo', c.correo], ['Dirección', c.direccion], ['Ciudad', c.ciudad]]} />
        </section>
        <section className="panel">
          <h2>Comportamiento habitual</h2>
          {p ? (
            <Detalles items={[
              ['Gasto promedio', moneda(p.montoPromedio)],
              ['Compra más alta', moneda(p.montoMaximo)],
              ['Ciudad habitual', p.ciudadHabitual],
              ['Horario habitual', `${p.horaHabitualInicio}:00 a ${p.horaHabitualFin}:00 h`],
              ['Compras analizadas', p.totalTransacciones],
              ['Actualizado', fechaHora(p.ultimaActualizacion)],
            ]} />
          ) : <Vacio>Aún no hay perfil (se crea con su primera compra)</Vacio>}
        </section>

        <section className="panel panel-ancho">
          <div className="panel-titulo">
            <h2>Tarjetas</h2>
            {esAdmin && <button className="btn btn-sec btn-sm" onClick={() => setNuevaTarjeta(true)}>+ Agregar tarjeta</button>}
          </div>
          {tarjetas.datos?.length ? (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Número</th><th>Tipo</th><th>Vence</th><th className="der">Límite</th><th>Estado</th><th /></tr></thead>
                <tbody>
                  {tarjetas.datos.map((t) => (
                    <tr key={t.id}>
                      <td className="mono">{t.numeroEnmascarado}</td>
                      <td>{etiqueta(t.tipo)}</td>
                      <td>{t.fechaVencimiento || '—'}</td>
                      <td className="der">{moneda(t.limiteCredito)}</td>
                      <td><Badge valor={t.estado} /></td>
                      <td className="der">
                        {t.estado === 'ACTIVA' && <button className="btn btn-sec btn-sm" onClick={() => setBloqueo({ tarjeta: t, accion: 'bloquear' })}>Bloquear</button>}
                        {(t.estado === 'BLOQUEADA_TEMPORAL' || t.estado === 'BLOQUEADA') && (
                          <button className="btn btn-sec btn-sm" onClick={() => setBloqueo({ tarjeta: t, accion: 'desbloquear' })}>Desbloquear</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Vacio>Sin tarjetas</Vacio>}
        </section>

        <section className="panel panel-ancho">
          <div className="panel-titulo">
            <h2>Últimas transacciones</h2>
            <Link to={`/transacciones?clienteId=${id}`} className="btn btn-link">Ver todas</Link>
          </div>
          {transacciones.datos?.content?.length ? (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Código</th><th>Fecha</th><th>Comercio</th><th className="der">Monto</th><th>Riesgo</th><th>Estado</th></tr></thead>
                <tbody>
                  {transacciones.datos.content.map((t) => (
                    <tr key={t.id}>
                      <td><Link to={`/transacciones/${t.id}`} className="mono">{t.codigo}</Link></td>
                      <td className="nowrap">{fechaHora(t.fechaHora)}</td>
                      <td>{t.comercio?.nombre}</td>
                      <td className="der">{moneda(t.monto)}</td>
                      <td><Badge valor={t.nivelRiesgo} /></td>
                      <td><Badge valor={t.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Vacio>Sin transacciones</Vacio>}
        </section>

        <section className="panel panel-ancho">
          <h2>Avisos enviados al cliente</h2>
          {notificaciones.datos?.length ? (
            <ul className="linea-tiempo">
              {notificaciones.datos.map((n) => (
                <li key={n.id}>
                  <div><Badge valor={n.estado} /> {n.mensaje}</div>
                  <small className="muted">{etiqueta(n.canal)} · {fechaHora(n.fechaEnvio)}{n.alerta && <> · <Link to={`/alertas/${n.alerta.id}`}>{n.alerta.codigo}</Link></>}</small>
                </li>
              ))}
            </ul>
          ) : <Vacio>Sin avisos</Vacio>}
        </section>
      </div>

      {editando && <FormCliente abierto cliente={c} alCerrar={() => setEditando(false)} alGuardar={(d) => { setDatos(d); setEditando(false); setAviso('Cliente actualizado') }} />}
      <FormTarjeta abierto={nuevaTarjeta} clienteId={c.id} alCerrar={() => setNuevaTarjeta(false)}
        alGuardar={() => { setNuevaTarjeta(false); tarjetas.recargar(); setAviso('Tarjeta registrada') }} />
      <ModalBloqueo datos={bloqueo} alCerrar={() => setBloqueo(null)}
        alGuardar={(msg) => { setBloqueo(null); tarjetas.recargar(); setAviso(msg) }} />
    </>
  )
}

function FormTarjeta({ abierto, clienteId, alCerrar, alGuardar }) {
  const [f, setF] = useState({ numero: '', tipo: 'CREDITO', fechaVencimiento: '', limiteCredito: '' })
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/api/tarjetas', {
        clienteId, numero: f.numero, tipo: f.tipo,
        fechaVencimiento: f.fechaVencimiento || null,
        limiteCredito: f.limiteCredito ? Number(f.limiteCredito) : null,
      })
      setF({ numero: '', tipo: 'CREDITO', fechaVencimiento: '', limiteCredito: '' })
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <Modal titulo="Nueva tarjeta" abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="form-grid">
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Número de tarjeta" ayuda="Solo se guardan los últimos 4 dígitos">
          <input value={f.numero} onChange={set('numero')} inputMode="numeric" autoComplete="off" required />
        </Campo>
        <Campo etiqueta="Tipo"><SelectEnum valores={ENUMS.tipoTarjeta} valor={f.tipo} alCambiar={(v) => setF({ ...f, tipo: v })} todos={false} /></Campo>
        <Campo etiqueta="Vencimiento (MM/AA)"><input value={f.fechaVencimiento} onChange={set('fechaVencimiento')} pattern="\d{2}/\d{2}" placeholder="08/29" /></Campo>
        <Campo etiqueta="Límite de crédito (S/)"><input type="number" step="0.01" value={f.limiteCredito} onChange={set('limiteCredito')} /></Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

function ModalBloqueo({ datos, alCerrar, alGuardar }) {
  const [motivo, setMotivo] = useState('')
  const [temporal, setTemporal] = useState(true)
  const [error, setError] = useState(null)
  if (!datos) return null
  const { tarjeta, accion } = datos

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    try {
      const body = accion === 'bloquear' ? { temporal, motivo } : { motivo }
      await api.patch(`/api/tarjetas/${tarjeta.id}/${accion}`, body)
      setMotivo('')
      alGuardar(accion === 'bloquear' ? 'Tarjeta bloqueada' : 'Tarjeta desbloqueada')
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <Modal titulo={`${accion === 'bloquear' ? 'Bloquear' : 'Desbloquear'} ${tarjeta.numeroEnmascarado}`} abierto alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        <Aviso>{error}</Aviso>
        {accion === 'bloquear' && (
          <label className="check">
            <input type="checkbox" checked={temporal} onChange={(e) => setTemporal(e.target.checked)} /> Bloqueo temporal
          </label>
        )}
        <Campo etiqueta="Motivo"><textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} /></Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className={`btn ${accion === 'bloquear' ? 'btn-peligro' : 'btn-primario'}`}>Confirmar</button>
        </div>
      </form>
    </Modal>
  )
}
