import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { Aviso, Badge, Campo, Cargando, Encabezado, Modal, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { ENUMS, fechaHora, moneda } from '../utils/formato'

/** Casos de investigación: agrupan varias alertas relacionadas (por ejemplo, del mismo cliente). */
export default function Casos() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState('')
  const [creando, setCreando] = useState(false)
  const { datos, cargando, error } = useApi('/api/casos', { estado })

  return (
    <>
      <Encabezado titulo="Casos de investigación" descripcion="Agrupa alertas relacionadas para investigarlas juntas">
        <button className="btn btn-primario" onClick={() => setCreando(true)}>+ Nuevo caso</button>
      </Encabezado>
      <div className="filtros">
        <SelectEnum valores={ENUMS.estadoCaso} valor={estado} alCambiar={setEstado} todos="Todos los estados" aria-label="Estado" />
      </div>
      <Aviso>{error}</Aviso>
      {cargando && !datos && <Cargando />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? <Vacio>No hay casos</Vacio> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Código</th><th>Título</th><th>Cliente</th><th>Responsable</th><th>Prioridad</th><th>Estado</th><th>Creado</th></tr></thead>
                <tbody>
                  {datos.map((c) => (
                    <tr key={c.id} className="fila-click" onClick={() => navigate(`/casos/${c.id}`)}>
                      <td className="mono">{c.codigo}</td>
                      <td><strong>{c.titulo}</strong></td>
                      <td>{c.cliente ? `${c.cliente.nombres} ${c.cliente.apellidos}` : '—'}</td>
                      <td>{c.responsable ? `${c.responsable.nombres} ${c.responsable.apellidos}` : '—'}</td>
                      <td><Badge valor={c.prioridad} /></td>
                      <td><Badge valor={c.estado} /></td>
                      <td>{fechaHora(c.fechaCreacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      <FormCaso abierto={creando} alCerrar={() => setCreando(false)} alGuardar={(c) => navigate(`/casos/${c.id}`)} />
    </>
  )
}

export function FormCaso({ abierto, alCerrar, alGuardar, alertaInicial, clienteId }) {
  const [f, setF] = useState({ titulo: '', descripcion: '', prioridad: 'MEDIA' })
  const [alertaIds, setAlertaIds] = useState(alertaInicial ? [alertaInicial] : [])
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await api.post('/api/casos', { titulo: f.titulo, descripcion: f.descripcion, prioridad: f.prioridad, alertaIds, clienteId })
      alGuardar(data)
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <Modal titulo="Nuevo caso" abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="form-grid">
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Título"><input value={f.titulo} onChange={set('titulo')} maxLength={150} required /></Campo>
        <Campo etiqueta="Prioridad"><SelectEnum valores={ENUMS.prioridad} valor={f.prioridad} alCambiar={(v) => setF({ ...f, prioridad: v })} todos={false} /></Campo>
        <Campo etiqueta="Descripción"><textarea value={f.descripcion} onChange={set('descripcion')} rows={3} maxLength={1000} /></Campo>
        <SelectorAlertas abierto={abierto} seleccion={alertaIds} alCambiar={setAlertaIds} clienteId={clienteId} />
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Crear caso</button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Lista de alertas activas con casillas y buscador (por código, cliente o últimos dígitos de la tarjeta),
 * para no tener que escribir IDs. Las alertas del mismo cliente del caso aparecen primero.
 */
function SelectorAlertas({ abierto, seleccion, alCambiar, clienteId }) {
  const activas = useApi(abierto ? '/api/alertas/cola' : null, { size: 200 })
  const [filtro, setFiltro] = useState('')

  const texto = filtro.trim().toLowerCase()
  const lista = (activas.datos?.content || [])
    .filter((a) => !a.caso || seleccion.includes(a.id))
    .filter((a) => {
      if (!texto) return true
      const c = a.transaccion?.tarjeta?.cliente
      return [a.codigo, c?.nombres, c?.apellidos, c?.dni, a.transaccion?.tarjeta?.ultimosDigitos]
        .some((v) => v && String(v).toLowerCase().includes(texto))
    })
    .sort((x, y) => {
      const mismo = (a) => (clienteId && a.transaccion?.tarjeta?.cliente?.id === clienteId ? 0 : 1)
      return mismo(x) - mismo(y)
    })

  const alternar = (id) => alCambiar(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id])

  return (
    <div className="campo">
      <span className="campo-etiqueta">Alertas vinculadas (opcional){seleccion.length > 0 && ` · ${seleccion.length} seleccionada(s)`}</span>
      <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por código, cliente, DNI o últimos 4 dígitos…" />
      <div className="selector-alertas">
        {activas.cargando && !activas.datos && <small className="muted">Cargando alertas…</small>}
        {activas.error && <small className="campo-error">{activas.error}</small>}
        {activas.datos && lista.length === 0 && <small className="muted">No hay alertas activas que coincidan</small>}
        {lista.map((a) => {
          const c = a.transaccion?.tarjeta?.cliente
          return (
            <label key={a.id} className="check">
              <input type="checkbox" checked={seleccion.includes(a.id)} onChange={() => alternar(a.id)} />
              <span>
                <span className="mono">{a.codigo}</span> · {c?.nombres} {c?.apellidos} · ****{a.transaccion?.tarjeta?.ultimosDigitos}
                {' · '}{moneda(a.transaccion?.monto)} <Badge valor={a.nivelRiesgo} />
              </span>
            </label>
          )
        })}
      </div>
      <span className="campo-ayuda">También puedes agregar alertas después, desde el detalle del caso.</span>
    </div>
  )
}
