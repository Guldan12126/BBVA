import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { Aviso, Badge, Campo, Cargando, Encabezado, Modal, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { ENUMS, fechaHora } from '../utils/formato'

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
  const [f, setF] = useState({ titulo: '', descripcion: '', prioridad: 'MEDIA', alertas: alertaInicial ? String(alertaInicial) : '' })
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    const alertaIds = f.alertas.split(/[\s,]+/).filter(Boolean).map(Number).filter((n) => !isNaN(n))
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
        <Campo etiqueta="IDs de alertas (opcional)" ayuda="Separados por coma, ej.: 12, 15. También puedes agregarlas después.">
          <input value={f.alertas} onChange={set('alertas')} />
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Crear caso</button>
        </div>
      </form>
    </Modal>
  )
}
