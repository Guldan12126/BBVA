import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Campo, Cargando, Encabezado, Modal, Paginacion, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'

export default function Clientes() {
  const navigate = useNavigate()
  const { tieneRol } = useAuth()
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') || ''
  const page = Number(sp.get('page') || 0)
  const [busqueda, setBusqueda] = useState(q)
  const [creando, setCreando] = useState(false)
  const { datos, cargando, error, recargar } = useApi('/api/clientes', { q, page, size: 20 })

  return (
    <>
      <Encabezado titulo="Clientes" descripcion="Titulares de tarjetas monitoreadas">
        {tieneRol(...PERMISOS.editarCatalogos) && <button className="btn btn-primario" onClick={() => setCreando(true)}>+ Nuevo cliente</button>}
      </Encabezado>

      <div className="filtros">
        <form className="buscador" onSubmit={(e) => { e.preventDefault(); setSp(busqueda ? { q: busqueda } : {}) }}>
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, apellido o DNI" aria-label="Buscar cliente" />
          <button className="btn btn-sec">Buscar</button>
        </form>
      </div>

      <Aviso>{error}</Aviso>
      {cargando && !datos && <Cargando />}
      {datos && (
        <section className="panel sin-padding">
          {datos.content.length === 0 ? <Vacio>No se encontraron clientes</Vacio> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Cliente</th><th>DNI</th><th>Ciudad</th><th>Teléfono</th><th>Correo</th></tr></thead>
                <tbody>
                  {datos.content.map((c) => (
                    <tr key={c.id} className="fila-click" onClick={() => navigate(`/clientes/${c.id}`)}>
                      <td><strong>{c.nombres} {c.apellidos}</strong></td>
                      <td className="mono">{c.dni}</td>
                      <td>{c.ciudad}</td>
                      <td>{c.telefono || '—'}</td>
                      <td>{c.correo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion pagina={datos.page} alCambiar={(p) => setSp({ ...(q && { q }), page: p })} />
        </section>
      )}

      <FormCliente abierto={creando} alCerrar={() => setCreando(false)} alGuardar={(c) => { setCreando(false); recargar(); navigate(`/clientes/${c.id}`) }} />
    </>
  )
}

const VACIO = { nombres: '', apellidos: '', dni: '', telefono: '', correo: '', ciudad: 'Piura', direccion: '' }

/** Formulario para crear o editar un cliente (si recibe "cliente" lo edita). */
export function FormCliente({ abierto, alCerrar, alGuardar, cliente }) {
  const [f, setF] = useState(cliente || VACIO)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    try {
      const body = { ...f, correo: f.correo || null }
      const { data } = cliente ? await api.put(`/api/clientes/${cliente.id}`, body) : await api.post('/api/clientes', body)
      setF(VACIO)
      alGuardar(data)
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <Modal titulo={cliente ? 'Editar cliente' : 'Nuevo cliente'} abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="form-grid">
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Nombres"><input value={f.nombres} onChange={set('nombres')} required /></Campo>
        <Campo etiqueta="Apellidos"><input value={f.apellidos} onChange={set('apellidos')} required /></Campo>
        <Campo etiqueta="DNI"><input value={f.dni} onChange={set('dni')} pattern="\d{8}" title="8 dígitos" required /></Campo>
        <Campo etiqueta="Teléfono"><input value={f.telefono || ''} onChange={set('telefono')} /></Campo>
        <Campo etiqueta="Correo" ayuda="Aquí le llegarán los avisos de compras sospechosas"><input type="email" value={f.correo || ''} onChange={set('correo')} /></Campo>
        <Campo etiqueta="Ciudad"><input value={f.ciudad} onChange={set('ciudad')} required /></Campo>
        <Campo etiqueta="Dirección"><input value={f.direccion || ''} onChange={set('direccion')} /></Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
