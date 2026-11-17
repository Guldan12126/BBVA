import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, Campo, Cargando, Encabezado, Modal, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'

/** Reglas configurables del motor de riesgo (se combinan con el score de la IA). */
export default function Reglas() {
  const { tieneRol } = useAuth()
  const { datos, cargando, error, recargar } = useApi('/api/reglas')
  const tipos = useApi('/api/reglas/tipos')
  const [editando, setEditando] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)
  const puedeEditar = tieneRol(...PERMISOS.editarReglas)
  const descripcionTipo = (t) => tipos.datos?.find((x) => x.tipo === t)?.descripcion || t

  async function alternar(r) {
    setErrorAccion(null)
    try {
      await api.patch(`/api/reglas/${r.id}/activa`, null, { params: { valor: !r.activa } })
      recargar()
    } catch (e) {
      setErrorAccion(mensajeError(e))
    }
  }

  return (
    <>
      <Encabezado titulo="Reglas del motor de riesgo" descripcion="Cada regla que se cumple suma su peso al score de reglas (máximo 1)">
        {puedeEditar && <button className="btn btn-primario" onClick={() => setEditando({})}>+ Nueva regla</button>}
      </Encabezado>
      <Aviso>{error || errorAccion}</Aviso>
      {cargando && !datos && <Cargando />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? <Vacio /> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Regla</th><th>Tipo</th><th className="der">Umbral</th><th className="der">Peso</th><th>Estado</th>{puedeEditar && <th />}</tr></thead>
                <tbody>
                  {datos.map((r) => (
                    <tr key={r.id} className={r.activa ? '' : 'fila-inactiva'}>
                      <td><strong>{r.nombre}</strong>{r.descripcion && <div className="muted texto-pequeno">{r.descripcion}</div>}</td>
                      <td>{descripcionTipo(r.tipo)}</td>
                      <td className="der mono">{r.valorUmbral}</td>
                      <td className="der mono">{r.peso}</td>
                      <td><Badge valor={r.activa ? 'ACTIVA' : 'INACTIVO'} texto={r.activa ? 'Activa' : 'Inactiva'} /></td>
                      {puedeEditar && (
                        <td className="der nowrap">
                          <button className="btn btn-sec btn-sm" onClick={() => alternar(r)}>{r.activa ? 'Desactivar' : 'Activar'}</button>{' '}
                          <button className="btn btn-sec btn-sm" onClick={() => setEditando(r)}>Editar</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {editando && <FormRegla regla={editando} tipos={tipos.datos || []} alCerrar={() => setEditando(null)} alGuardar={() => { setEditando(null); recargar() }} />}
    </>
  )
}

function FormRegla({ regla, tipos, alCerrar, alGuardar }) {
  const [f, setF] = useState({ nombre: '', descripcion: '', tipo: tipos[0]?.tipo || 'MONTO', valorUmbral: '', peso: '0.2', activa: true, ...regla })
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    const body = { nombre: f.nombre, descripcion: f.descripcion, tipo: f.tipo, valorUmbral: Number(f.valorUmbral), peso: Number(f.peso), activa: f.activa }
    try {
      if (regla.id) await api.put(`/api/reglas/${regla.id}`, body)
      else await api.post('/api/reglas', body)
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <Modal titulo={regla.id ? 'Editar regla' : 'Nueva regla'} abierto alCerrar={alCerrar}>
      <form onSubmit={enviar} className="form-grid">
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Nombre"><input value={f.nombre} onChange={set('nombre')} required /></Campo>
        <Campo etiqueta="Tipo">
          <select value={f.tipo} onChange={set('tipo')}>
            {tipos.map((t) => <option key={t.tipo} value={t.tipo}>{t.descripcion}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Valor umbral" ayuda="Monto en S/, veces el promedio, km, n.º de compras, hora o riesgo de categoría, según el tipo">
          <input type="number" step="any" value={f.valorUmbral} onChange={set('valorUmbral')} required />
        </Campo>
        <Campo etiqueta="Peso (0 a 1)"><input type="number" step="0.01" min="0" max="1" value={f.peso} onChange={set('peso')} required /></Campo>
        <Campo etiqueta="Descripción"><textarea value={f.descripcion || ''} onChange={set('descripcion')} rows={2} /></Campo>
        <label className="check"><input type="checkbox" checked={!!f.activa} onChange={(e) => setF({ ...f, activa: e.target.checked })} /> Regla activa</label>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
