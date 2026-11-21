import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { Aviso, Campo, Encabezado, InputPrefijo, Modal, Paginacion, PieModal, SeccionForm, TablaCargando, Vacio } from '../components/UI'
import MapaDireccion from '../components/MapaDireccion'
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
      {cargando && !datos && <TablaCargando columnas={5} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.content.length === 0 ? <Vacio icono={q ? 'buscar' : 'cliente'} titulo={q ? `Sin resultados para «${q}»` : 'Aún no hay clientes'}
              accion={q && <button className="btn btn-sec btn-sm" onClick={() => { setBusqueda(''); setSp({}) }}>Limpiar búsqueda</button>}>
              {q ? 'Revisa el nombre o el DNI e inténtalo de nuevo.' : 'Registra el primer cliente con el botón «Nuevo cliente».'}
            </Vacio> : (
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
const soloDigitos = (v, max) => v.replace(/\D/g, '').slice(0, max)

/** Formulario para crear o editar un cliente (si recibe "cliente" lo edita). */
export function FormCliente({ abierto, alCerrar, alGuardar, cliente }) {
  const [f, setF] = useState(cliente || VACIO)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [mapa, setMapa] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const iniciales = `${f.nombres?.trim()?.[0] || ''}${f.apellidos?.trim()?.[0] || ''}`.toUpperCase()
  const nombreCompleto = `${f.nombres || ''} ${f.apellidos || ''}`.trim()
  const dniIncompleto = f.dni && f.dni.length !== 8

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const body = { ...f, correo: f.correo || null, telefono: f.telefono || null, direccion: f.direccion || null }
      const { data } = cliente ? await api.put(`/api/clientes/${cliente.id}`, body) : await api.post('/api/clientes', body)
      setF(VACIO)
      alGuardar(data)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      subtitulo={cliente ? 'Actualiza los datos del titular' : 'Registra al titular para luego asociarle sus tarjetas'}
      icono="cliente" abierto={abierto} alCerrar={alCerrar} ancho={640}
    >
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

        {/* Vista previa de cómo se verá el cliente */}
        <div className="ficha-previa">
          <span className="ficha-avatar">{iniciales || <Icono nombre="cliente" size={20} />}</span>
          <span className="ficha-textos">
            <strong>{nombreCompleto || 'Nombre del cliente'}</strong>
            <small>
              {f.dni ? `DNI ${f.dni}` : 'DNI'} · {f.ciudad || 'Ciudad'}
            </small>
          </span>
        </div>

        <SeccionForm titulo="Datos personales" icono="cliente">
          <Campo etiqueta="Nombres" requerido>
            <input value={f.nombres} onChange={set('nombres')} placeholder="Ej. María Elena" autoFocus required />
          </Campo>
          <Campo etiqueta="Apellidos" requerido>
            <input value={f.apellidos} onChange={set('apellidos')} placeholder="Ej. Castillo Ramos" required />
          </Campo>
          <Campo etiqueta="DNI" requerido extra={`${f.dni.length}/8`} error={dniIncompleto ? 'El DNI debe tener 8 dígitos' : null}>
            <InputPrefijo icono="documento" value={f.dni} inputMode="numeric" placeholder="12345678"
              onChange={(e) => setF({ ...f, dni: soloDigitos(e.target.value, 8) })} pattern="\d{8}" title="8 dígitos" required />
          </Campo>
        </SeccionForm>

        <SeccionForm titulo="Contacto" icono="telefono">
          <Campo etiqueta="Teléfono" opcional>
            <InputPrefijo prefijo="+51" value={f.telefono || ''} inputMode="tel" placeholder="987 654 321"
              onChange={(e) => setF({ ...f, telefono: soloDigitos(e.target.value, 9) })} />
          </Campo>
          <Campo etiqueta="Correo electrónico" opcional>
            <InputPrefijo icono="correo" type="email" value={f.correo || ''} onChange={set('correo')} placeholder="cliente@correo.com" />
          </Campo>
          <div className="nota nota-info campo-ancho">
            <Icono nombre="campana" size={16} />
            <span>
              Al correo le llegarán los avisos de <strong>compras sospechosas</strong> para que el cliente las confirme o
              rechace. Sin correo, la validación solo podrá hacerse por teléfono.
            </span>
          </div>
        </SeccionForm>

        <SeccionForm titulo="Ubicación" icono="comercio">
          <Campo etiqueta="Ciudad" requerido>
            <input value={f.ciudad} onChange={set('ciudad')} placeholder="Piura" required />
          </Campo>
          <Campo etiqueta="Dirección" opcional>
            <div className="input-mapa">
              <input value={f.direccion || ''} onChange={set('direccion')} placeholder="Clic para elegir en el mapa"
                onClick={() => setMapa(true)} />
              <button type="button" onClick={() => setMapa(true)} title="Elegir en el mapa" aria-label="Elegir en el mapa">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
                </svg>
              </button>
            </div>
          </Campo>
          {mapa && (
            <MapaDireccion direccion={f.direccion} ciudad={f.ciudad}
              alElegir={({ direccion, ciudad }) => setF((p) => ({ ...p, direccion, ciudad: ciudad || p.ciudad }))} alCerrar={() => setMapa(false)} />
          )}
        </SeccionForm>

        <PieModal alCancelar={alCerrar} enviando={enviando} texto={cliente ? 'Guardar cambios' : 'Registrar cliente'} />
      </form>
    </Modal>
  )
}
