import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { Aviso, Badge, BarraRiesgo, Campo, Cargando, Detalles, Encabezado, Modal, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { fechaHora, moneda } from '../utils/formato'
import { ModalTexto } from './AlertaDetalle'

export default function CasoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { datos: c, setDatos, cargando, error } = useApi(`/api/casos/${id}`)
  const alertas = useApi(`/api/casos/${id}/alertas`)
  const [modal, setModal] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)
  const [aviso, setAviso] = useState(null)

  if (cargando && !c) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!c) return null
  const cerrado = c.estado === 'CERRADO'

  async function accion(peticion, msg) {
    setErrorAccion(null)
    try {
      const { data } = await peticion()
      setDatos(data)
      alertas.recargar()
      setModal(null)
      setAviso(msg)
      return true
    } catch (e) {
      setErrorAccion(mensajeError(e))
      return false
    }
  }

  return (
    <>
      <Encabezado titulo={`${c.codigo} · ${c.titulo}`} descripcion={`Creado ${fechaHora(c.fechaCreacion)}`}>
        <button className="btn btn-sec" onClick={() => navigate('/casos')}>← Casos</button>
      </Encabezado>
      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso alCerrar={() => setErrorAccion(null)}>{!modal && errorAccion}</Aviso>

      {!cerrado && (
        <div className="barra-acciones">
          <Badge valor={c.estado} />
          <div className="espaciador" />
          <label className="filtro-fecha">
            Estado
            <SelectEnum valores={['ABIERTO', 'EN_INVESTIGACION']} valor={c.estado} todos={false}
              alCambiar={(estado) => accion(() => api.patch(`/api/casos/${id}/estado`, { estado }), 'Estado actualizado')} />
          </label>
          <button className="btn btn-sec" onClick={() => setModal('alerta')}>+ Agregar alerta</button>
          <button className="btn btn-primario" onClick={() => setModal('cerrar')}>Cerrar caso</button>
        </div>
      )}

      <div className="grid-2">
        <section className="panel">
          <h2>Información</h2>
          <Detalles items={[
            ['Estado', <Badge key="e" valor={c.estado} />],
            ['Prioridad', <Badge key="p" valor={c.prioridad} />],
            ['Cliente', c.cliente && <Link key="c" to={`/clientes/${c.cliente.id}`}>{c.cliente.nombres} {c.cliente.apellidos}</Link>],
            ['Responsable', c.responsable && `${c.responsable.nombres} ${c.responsable.apellidos}`],
            ['Descripción', c.descripcion],
            cerrado && ['Cerrado', fechaHora(c.fechaCierre)],
            cerrado && ['Conclusión', c.conclusion],
          ]} />
        </section>
        <section className="panel">
          <h2>Alertas del caso</h2>
          {alertas.datos?.length ? (
            <ul className="lista-alertas">
              {alertas.datos.map((a) => (
                <li key={a.id}>
                  <Link to={`/alertas/${a.id}`} className="mono">{a.codigo}</Link>
                  <span>{moneda(a.transaccion?.monto)}</span>
                  <BarraRiesgo valor={a.probabilidad} />
                  <Badge valor={a.estado} />
                </li>
              ))}
            </ul>
          ) : <Vacio>Este caso aún no tiene alertas</Vacio>}
        </section>
      </div>

      <ModalTexto abierto={modal === 'cerrar'} titulo="Cerrar caso" etiqueta="Conclusión de la investigación" max={1000}
        error={errorAccion} alCerrar={() => setModal(null)}
        alEnviar={(conclusion) => accion(() => api.patch(`/api/casos/${id}/cerrar`, { conclusion }), 'Caso cerrado')} />
      <ModalAlerta abierto={modal === 'alerta'} error={errorAccion} alCerrar={() => setModal(null)}
        alEnviar={(alertaId) => accion(() => api.patch(`/api/casos/${id}/alertas/${alertaId}`), 'Alerta agregada al caso')} />
    </>
  )
}

function ModalAlerta({ abierto, alCerrar, alEnviar, error }) {
  const activas = useApi(abierto ? '/api/alertas/cola' : null, { size: 100 })
  const [alertaId, setAlertaId] = useState('')
  return (
    <Modal titulo="Agregar alerta al caso" abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); alEnviar(alertaId) }}>
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Alerta activa">
          <select value={alertaId} onChange={(e) => setAlertaId(e.target.value)} required>
            <option value="">Selecciona…</option>
            {(activas.datos?.content || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo} — {a.transaccion?.tarjeta?.cliente?.nombres} {a.transaccion?.tarjeta?.cliente?.apellidos} — {moneda(a.transaccion?.monto)}
              </option>
            ))}
          </select>
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Agregar</button>
        </div>
      </form>
    </Modal>
  )
}
