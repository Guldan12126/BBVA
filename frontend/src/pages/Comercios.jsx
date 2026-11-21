import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { Aviso, Badge, Campo, Encabezado, Interruptor, Modal, Opciones, PieModal, SeccionForm, SelectEnum, TablaCargando, Vacio } from '../components/UI'
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
      {cargando && !datos && <TablaCargando columnas={5} />}
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

const NIVELES_COMERCIO = [
  { valor: 'BAJO', texto: 'Bajo', descripcion: 'Comercio habitual', tono: 'verde' },
  { valor: 'MEDIO', texto: 'Medio', descripcion: 'Requiere atención', tono: 'amarillo' },
  { valor: 'ALTO', texto: 'Alto', descripcion: 'Fraudes previos', tono: 'naranja' },
  { valor: 'CRITICO', texto: 'Crítico', descripcion: 'Muy riesgoso', tono: 'rojo' },
]

const numeroONull = (v) => (v === '' || v == null ? null : Number(v))

function FormComercio({ comercio, alCerrar, alGuardar }) {
  const [f, setF] = useState({ ...VACIO, ...comercio })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const lat = numeroONull(f.latitud)
  const lon = numeroONull(f.longitud)
  const errorLat = lat !== null && (lat < -90 || lat > 90) ? 'Debe estar entre -90 y 90' : null
  const errorLon = lon !== null && (lon < -180 || lon > 180) ? 'Debe estar entre -180 y 180' : null
  const soloUna = (lat === null) !== (lon === null)
  const tieneCoordenadas = lat !== null && lon !== null && !errorLat && !errorLon

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const body = {
      nombre: f.nombre, categoria: f.categoria, ciudad: f.ciudad, nivelRiesgo: f.nivelRiesgo,
      internacional: f.internacional, latitud: lat, longitud: lon,
    }
    try {
      if (comercio.id) await api.put(`/api/comercios/${comercio.id}`, body)
      else await api.post('/api/comercios', body)
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={comercio.id ? 'Editar comercio' : 'Nuevo comercio'}
      subtitulo="El nivel de riesgo y la ubicación se usan para calcular la probabilidad de fraude"
      icono="comercio" abierto alCerrar={alCerrar} ancho={660}
    >
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

        <SeccionForm titulo="Identificación" icono="comercio">
          <Campo etiqueta="Nombre del comercio" requerido>
            <input value={f.nombre} onChange={set('nombre')} placeholder="Ej. Plaza Vea Piura Centro" autoFocus required />
          </Campo>
          <Campo etiqueta="Categoría" requerido>
            <SelectEnum valores={ENUMS.categoriaComercio} valor={f.categoria} alCambiar={(v) => setF({ ...f, categoria: v })} todos={false} />
          </Campo>
        </SeccionForm>

        <SeccionForm titulo="Riesgo" icono="escudo-alerta" columnas={1}>
          <Opciones etiqueta="Nivel de riesgo del comercio" nombre="nivelRiesgo" opciones={NIVELES_COMERCIO}
            valor={f.nivelRiesgo} alCambiar={(v) => setF({ ...f, nivelRiesgo: v })} />
          <Interruptor
            activo={f.internacional} alCambiar={(v) => setF({ ...f, internacional: v })}
            titulo="Comercio internacional"
            descripcion="El modelo de IA considera las compras en el extranjero como un factor de riesgo"
          />
        </SeccionForm>

        <SeccionForm titulo="Ubicación" icono="flecha">
          <Campo etiqueta="Ciudad" requerido ancho>
            <input value={f.ciudad} onChange={set('ciudad')} placeholder="Piura" required />
          </Campo>
          <Campo etiqueta="Latitud" opcional error={errorLat}>
            <input type="number" step="any" value={f.latitud ?? ''} onChange={set('latitud')} placeholder="-5.1945" />
          </Campo>
          <Campo etiqueta="Longitud" opcional error={errorLon}>
            <input type="number" step="any" value={f.longitud ?? ''} onChange={set('longitud')} placeholder="-80.6328" />
          </Campo>
          <div className={`nota campo-ancho ${soloUna ? 'nota-alerta' : 'nota-info'}`}>
            <Icono nombre={soloUna ? 'alerta' : 'comercio'} size={16} />
            <span>
              {soloUna
                ? 'Completa latitud y longitud, o deja ambas vacías.'
                : 'Si las dejas vacías se usan las de la ciudad. Sirven para medir la distancia de la compra a la zona habitual del cliente.'}
              {tieneCoordenadas && (
                <>
                  {' '}
                  <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noreferrer">
                    Ver en el mapa ↗
                  </a>
                </>
              )}
            </span>
          </div>
        </SeccionForm>

        <PieModal alCancelar={alCerrar} enviando={enviando} deshabilitado={!!(errorLat || errorLon || soloUna)}
          texto={comercio.id ? 'Guardar cambios' : 'Registrar comercio'} />
      </form>
    </Modal>
  )
}
