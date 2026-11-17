import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, Campo, Cargando, Encabezado, Modal, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, etiqueta } from '../utils/formato'

const VACIO = { nombre: '', categoria: 'SUPERMERCADO', ciudad: 'Piura', latitud: '', longitud: '', nivelRiesgo: 'BAJO', internacional: false }

export default function Comercios() {
  const { tieneRol } = useAuth()
  const [categoria, setCategoria] = useState('')
  const { datos, cargando, error, recargar } = useApi('/api/comercios', { categoria })
  const [editando, setEditando] = useState(null) // null | {} (nuevo) | comercio
  const esAdmin = tieneRol(...PERMISOS.editarCatalogos)

  return (
    <>
      <Encabezado titulo="Comercios" descripcion="Establecimientos donde se realizan las compras">
        {esAdmin && <button className="btn btn-primario" onClick={() => setEditando({})}>+ Nuevo comercio</button>}
      </Encabezado>
      <div className="filtros">
        <SelectEnum valores={ENUMS.categoriaComercio} valor={categoria} alCambiar={setCategoria} todos="Todas las categorías" aria-label="Categoría" />
      </div>
      <Aviso>{error}</Aviso>
      {cargando && !datos && <Cargando />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? <Vacio /> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Nombre</th><th>Categoría</th><th>Ciudad</th><th>Riesgo</th><th>Internacional</th>{esAdmin && <th />}</tr></thead>
                <tbody>
                  {datos.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.nombre}</strong></td>
                      <td>{etiqueta(c.categoria)}</td>
                      <td>{c.ciudad}</td>
                      <td><Badge valor={c.nivelRiesgo} /></td>
                      <td>{c.internacional ? 'Sí' : 'No'}</td>
                      {esAdmin && <td className="der"><button className="btn btn-sec btn-sm" onClick={() => setEditando(c)}>Editar</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {editando && <FormComercio comercio={editando} alCerrar={() => setEditando(null)} alGuardar={() => { setEditando(null); recargar() }} />}
    </>
  )
}

function FormComercio({ comercio, alCerrar, alGuardar }) {
  const [f, setF] = useState({ ...VACIO, ...comercio })
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    const body = {
      nombre: f.nombre, categoria: f.categoria, ciudad: f.ciudad, nivelRiesgo: f.nivelRiesgo, internacional: f.internacional,
      latitud: f.latitud === '' || f.latitud == null ? null : Number(f.latitud),
      longitud: f.longitud === '' || f.longitud == null ? null : Number(f.longitud),
    }
    try {
      if (comercio.id) await api.put(`/api/comercios/${comercio.id}`, body)
      else await api.post('/api/comercios', body)
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <Modal titulo={comercio.id ? 'Editar comercio' : 'Nuevo comercio'} abierto alCerrar={alCerrar}>
      <form onSubmit={enviar} className="form-grid">
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Nombre"><input value={f.nombre} onChange={set('nombre')} required /></Campo>
        <Campo etiqueta="Categoría"><SelectEnum valores={ENUMS.categoriaComercio} valor={f.categoria} alCambiar={(v) => setF({ ...f, categoria: v })} todos={false} /></Campo>
        <Campo etiqueta="Ciudad"><input value={f.ciudad} onChange={set('ciudad')} required /></Campo>
        <Campo etiqueta="Nivel de riesgo"><SelectEnum valores={ENUMS.nivelRiesgo} valor={f.nivelRiesgo} alCambiar={(v) => setF({ ...f, nivelRiesgo: v })} todos={false} /></Campo>
        <Campo etiqueta="Latitud (opcional)"><input type="number" step="any" value={f.latitud ?? ''} onChange={set('latitud')} /></Campo>
        <Campo etiqueta="Longitud (opcional)"><input type="number" step="any" value={f.longitud ?? ''} onChange={set('longitud')} /></Campo>
        <label className="check"><input type="checkbox" checked={!!f.internacional} onChange={(e) => setF({ ...f, internacional: e.target.checked })} /> Comercio internacional</label>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
