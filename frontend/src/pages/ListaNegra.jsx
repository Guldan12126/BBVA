import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, Campo, Cargando, Encabezado, Modal, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, etiqueta, fechaHora } from '../utils/formato'

/** Tarjetas, comercios, IPs o dispositivos bloqueados: si una compra coincide, el score sube a 0.99. */
export default function ListaNegra() {
  const { tieneRol } = useAuth()
  const { datos, cargando, error, recargar } = useApi('/api/lista-negra')
  const [agregando, setAgregando] = useState(false)
  const [errorAccion, setErrorAccion] = useState(null)
  const puedeAgregar = tieneRol(...PERMISOS.agregarListaNegra)
  const puedeDesactivar = tieneRol(...PERMISOS.desactivarListaNegra)
  const puedeGestionar = tieneRol(...PERMISOS.gestionarListaNegra)

  async function ejecutar(peticion) {
    setErrorAccion(null)
    try {
      await peticion()
      recargar()
    } catch (e) {
      setErrorAccion(mensajeError(e))
    }
  }

  return (
    <>
      <Encabezado titulo="Lista negra" descripcion="Cualquier compra que coincida se marca con riesgo crítico">
        {puedeAgregar && <button className="btn btn-primario" onClick={() => setAgregando(true)}>+ Agregar</button>}
      </Encabezado>
      <Aviso>{error || errorAccion}</Aviso>
      {cargando && !datos && <Cargando />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? <Vacio>La lista negra está vacía</Vacio> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Tipo</th><th>Valor</th><th>Motivo</th><th>Vence</th><th>Estado</th><th>Agregado</th>{puedeDesactivar && <th />}</tr></thead>
                <tbody>
                  {datos.map((l) => (
                    <tr key={l.id} className={l.activo ? '' : 'fila-inactiva'}>
                      <td>{etiqueta(l.tipo)}</td>
                      <td className="mono">{l.valor}</td>
                      <td>{l.motivo || '—'}</td>
                      <td>{l.fechaExpiracion ? fechaHora(l.fechaExpiracion) : 'Permanente'}</td>
                      <td><Badge valor={l.activo ? 'ACTIVO' : 'INACTIVO'} /></td>
                      <td>{fechaHora(l.fechaCreacion)}</td>
                      {puedeDesactivar && (
                        <td className="der nowrap">
                          {l.activo && <button className="btn btn-sec btn-sm" onClick={() => window.confirm('¿Desactivar este registro? Las compras que coincidan dejarán de marcarse como críticas.') && ejecutar(() => api.patch(`/api/lista-negra/${l.id}/desactivar`))}>Desactivar</button>}{' '}
                          {puedeGestionar && <button className="btn btn-peligro-sec btn-sm" onClick={() => window.confirm('¿Eliminar este registro?') && ejecutar(() => api.delete(`/api/lista-negra/${l.id}`))}>Eliminar</button>}
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
      {agregando && <FormListaNegra alCerrar={() => setAgregando(false)} alGuardar={() => { setAgregando(false); recargar() }} />}
    </>
  )
}

function FormListaNegra({ alCerrar, alGuardar }) {
  const [f, setF] = useState({ tipo: 'TARJETA', valor: '', motivo: '', diasVigencia: '' })
  const [error, setError] = useState(null)
  const tarjetas = useApi(f.tipo === 'TARJETA' ? '/api/tarjetas' : null)
  const comercios = useApi(f.tipo === 'COMERCIO' ? '/api/comercios' : null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/api/lista-negra', { ...f, diasVigencia: f.diasVigencia ? Number(f.diasVigencia) : null })
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <Modal titulo="Agregar a la lista negra" abierto alCerrar={alCerrar}>
      <form onSubmit={enviar} className="form-grid">
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Tipo">
          <SelectEnum valores={ENUMS.tipoListaNegra} valor={f.tipo} alCambiar={(v) => setF({ ...f, tipo: v, valor: '' })} todos={false} />
        </Campo>
        {/* Para tarjetas y comercios el backend guarda el ID; para IP y dispositivo, el texto */}
        {f.tipo === 'TARJETA' && (
          <Campo etiqueta="Tarjeta">
            <select value={f.valor} onChange={set('valor')} required>
              <option value="">Selecciona…</option>
              {(tarjetas.datos || []).map((t) => <option key={t.id} value={t.id}>{t.numeroEnmascarado} — {t.cliente?.nombres} {t.cliente?.apellidos}</option>)}
            </select>
          </Campo>
        )}
        {f.tipo === 'COMERCIO' && (
          <Campo etiqueta="Comercio">
            <select value={f.valor} onChange={set('valor')} required>
              <option value="">Selecciona…</option>
              {(comercios.datos || []).map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.ciudad})</option>)}
            </select>
          </Campo>
        )}
        {(f.tipo === 'IP' || f.tipo === 'DISPOSITIVO') && (
          <Campo etiqueta={f.tipo === 'IP' ? 'Dirección IP' : 'Identificador del dispositivo'}>
            <input value={f.valor} onChange={set('valor')} required />
          </Campo>
        )}
        <Campo etiqueta="Días de vigencia" ayuda="Vacío = permanente"><input type="number" min="1" value={f.diasVigencia} onChange={set('diasVigencia')} /></Campo>
        <Campo etiqueta="Motivo"><textarea value={f.motivo} onChange={set('motivo')} rows={2} /></Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Agregar</button>
        </div>
      </form>
    </Modal>
  )
}
