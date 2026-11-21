import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { Aviso, Badge, Campo, Encabezado, Interruptor, Kpi, Modal, Opciones, PieModal, SeccionForm, SelectEnum, TablaCargando, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, etiqueta, fechaHora, moneda, numero } from '../utils/formato'

const VACIO = { nombre: '', categoria: 'SUPERMERCADO', ciudad: 'Piura', latitud: '', longitud: '', nivelRiesgo: 'BAJO', internacional: false }

/** Color de cada categoría (las de mayor riesgo base en tonos más cálidos). */
const COLOR_CATEGORIA = {
  SUPERMERCADO: '#2e9d5b', RESTAURANTE: '#c98a00', FARMACIA: '#1b9aaa', COMBUSTIBLE: '#5b6676', ROPA: '#8a63d2',
  SERVICIOS: '#1464a5', ENTRETENIMIENTO: '#d4589b', TECNOLOGIA: '#e07b00', VIAJES: '#0f7bd6', CASINO: '#d0343c',
}
const NIVELES = ['BAJO', 'MEDIO', 'ALTO', 'CRITICO']
const ORDEN = [
  { valor: 'nombre', texto: 'Nombre (A-Z)' },
  { valor: 'transacciones', texto: 'Más transacciones' },
  { valor: 'alertas', texto: 'Más alertas' },
  { valor: 'tasa', texto: 'Mayor tasa de fraude' },
  { valor: 'riesgo', texto: 'Mayor nivel de riesgo' },
]

const leer = (k, def) => { try { return localStorage.getItem(k) || def } catch { return def } }
const guardar = (k, v) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

/** Fraudulentas sobre el total de transacciones del comercio (null si no tiene). */
const tasaFraude = (e) => (e?.transacciones ? (e.fraudulentas / e.transacciones) * 100 : null)

function Sigla({ categoria, size = 40 }) {
  return (
    <span className="comercio-sigla" style={{ '--cc': COLOR_CATEGORIA[categoria] || 'var(--primario)', width: size, height: size }}>
      <Icono nombre="comercio" size={Math.round(size * 0.45)} />
    </span>
  )
}

export default function Comercios() {
  const { tieneRol } = useAuth()
  const esAdmin = tieneRol(...PERMISOS.editarCatalogos)
  const { datos, cargando, error, recargar } = useApi('/api/comercios')
  const stats = useApi('/api/comercios/estadisticas')
  const [editando, setEditando] = useState(null) // null | {} (nuevo) | comercio

  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [nivel, setNivel] = useState('')
  const [soloInternacionales, setSoloInternacionales] = useState(false)
  const [orden, setOrden] = useState(() => leer('comercios-orden', 'nombre'))
  const [vista, setVista] = useState(() => leer('comercios-vista', 'tarjetas'))

  const est = (c) => stats.datos?.[c.id] || null
  const lista = datos || []

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    const r = lista.filter((c) =>
      (!t || `${c.nombre} ${c.ciudad || ''}`.toLowerCase().includes(t))
      && (!categoria || c.categoria === categoria)
      && (!nivel || c.nivelRiesgo === nivel)
      && (!soloInternacionales || c.internacional))
    const val = {
      transacciones: (c) => est(c)?.transacciones || 0,
      alertas: (c) => est(c)?.alertas || 0,
      tasa: (c) => tasaFraude(est(c)) ?? -1,
      riesgo: (c) => NIVELES.indexOf(c.nivelRiesgo),
    }[orden]
    return [...r].sort((a, b) => (val ? val(b) - val(a) : 0) || a.nombre.localeCompare(b.nombre))
  }, [lista, q, categoria, nivel, soloInternacionales, orden, stats.datos]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Indicadores ----------
  const porNivel = Object.fromEntries(NIVELES.map((n) => [n, lista.filter((c) => c.nivelRiesgo === n).length]))
  const altoRiesgo = porNivel.ALTO + porNivel.CRITICO
  const internacionales = lista.filter((c) => c.internacional).length
  const conFraude = lista.filter((c) => est(c)?.fraudulentas > 0).length
  const hayFiltros = q || categoria || nivel || soloInternacionales

  const limpiar = () => { setQ(''); setCategoria(''); setNivel(''); setSoloInternacionales(false) }
  const cambiarVista = (v) => { setVista(v); guardar('comercios-vista', v) }
  const cambiarOrden = (v) => { setOrden(v); guardar('comercios-orden', v) }

  return (
    <>
      <Encabezado titulo="Comercios" descripcion="Establecimientos donde se realizan las compras y su comportamiento de riesgo">
        {esAdmin && <button className="btn btn-primario" onClick={() => setEditando({})}>+ Nuevo comercio</button>}
      </Encabezado>
      <Aviso>{error || stats.error}</Aviso>

      {datos && (
        <div className="kpis">
          <Kpi icono="comercio" titulo="Comercios registrados" valor={numero(lista.length)}
            detalle={`${ENUMS.categoriaComercio.filter((k) => lista.some((c) => c.categoria === k)).length} categorías`} />
          <Kpi icono="escudo-alerta" titulo="Riesgo alto o crítico" valor={numero(altoRiesgo)} tono={altoRiesgo ? 'naranja' : 'verde'}
            detalle={`${porNivel.CRITICO} críticos · ${porNivel.ALTO} altos`} />
          <Kpi icono="flecha" titulo="Internacionales" valor={numero(internacionales)}
            detalle="Las compras en el extranjero suman riesgo" />
          <Kpi icono="alerta" titulo="Con fraude confirmado" valor={numero(conFraude)} tono={conFraude ? 'rojo' : 'verde'}
            detalle={conFraude ? 'Tienen al menos una compra fraudulenta' : 'Ningún comercio con fraude'} />
        </div>
      )}

      {/* ---------- Barra de filtros ---------- */}
      <div className="panel barra-filtros">
        <div className="barra-filtros-fila">
          <span className="input-prefijo filtro-buscar">
            <span className="input-prefijo-icono"><Icono nombre="buscar" size={16} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o ciudad" aria-label="Buscar comercio" />
          </span>
          <SelectEnum valores={ENUMS.categoriaComercio} valor={categoria} alCambiar={setCategoria} todos="Todas las categorías" aria-label="Categoría" />
          <label className="filtro-orden">
            <span>Ordenar</span>
            <select value={orden} onChange={(e) => cambiarOrden(e.target.value)} aria-label="Ordenar por">
              {ORDEN.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </label>
          <div className="segmentado" role="group" aria-label="Vista">
            <button className={vista === 'tarjetas' ? 'activo' : ''} onClick={() => cambiarVista('tarjetas')} title="Vista en tarjetas" aria-label="Tarjetas">
              <Icono nombre="dashboard" size={15} />
            </button>
            <button className={vista === 'tabla' ? 'activo' : ''} onClick={() => cambiarVista('tabla')} title="Vista en tabla" aria-label="Tabla">
              <Icono nombre="menu" size={15} />
            </button>
          </div>
        </div>
        <div className="barra-filtros-fila">
          <div className="chips-filtro" role="group" aria-label="Nivel de riesgo">
            <button className={!nivel ? 'activo' : ''} onClick={() => setNivel('')}>Todos <span>{lista.length}</span></button>
            {NIVELES.map((n) => (
              <button key={n} className={`chip-nivel-${n} ${nivel === n ? 'activo' : ''}`} onClick={() => setNivel(nivel === n ? '' : n)}>
                <i /> {etiqueta(n)} <span>{porNivel[n]}</span>
              </button>
            ))}
          </div>
          <button className={`chip-toggle ${soloInternacionales ? 'activo' : ''}`} onClick={() => setSoloInternacionales(!soloInternacionales)}>
            {soloInternacionales && <Icono nombre="check" size={13} />} Solo internacionales
          </button>
          <span className="barra-filtros-total">
            {filtrados.length === lista.length ? `${numero(lista.length)} comercios` : `${numero(filtrados.length)} de ${numero(lista.length)}`}
            {hayFiltros && <button className="enlace-boton" onClick={limpiar}>Limpiar</button>}
          </span>
        </div>
      </div>

      {cargando && !datos && <TablaCargando columnas={6} />}
      {datos && (filtrados.length === 0 ? (
        <section className="panel">
          {hayFiltros ? (
            <Vacio icono="buscar" titulo="Sin resultados" accion={<button className="btn btn-sec btn-sm" onClick={limpiar}>Limpiar filtros</button>}>
              Ningún comercio coincide con los filtros seleccionados.
            </Vacio>
          ) : (
            <Vacio icono="comercio" titulo="Aún no hay comercios"
              accion={esAdmin && <button className="btn btn-primario btn-sm" onClick={() => setEditando({})}>+ Registrar el primero</button>}>
              Registra los establecimientos donde los clientes realizan sus compras.
            </Vacio>
          )}
        </section>
      ) : vista === 'tarjetas' ? (
        <div className="comercios-grid">
          {filtrados.map((c) => {
            const e = est(c)
            const tasa = tasaFraude(e)
            return (
              <article key={c.id} className={`comercio-card riesgo-${c.nivelRiesgo}`}>
                <header className="comercio-card-cabecera">
                  <Sigla categoria={c.categoria} />
                  <div className="comercio-card-titulo">
                    <h3 title={c.nombre}>{c.nombre}</h3>
                    <span className="comercio-card-sub">
                      {etiqueta(c.categoria)} · {c.ciudad || 'Sin ciudad'}
                    </span>
                  </div>
                  <Badge valor={c.nivelRiesgo} />
                </header>

                <div className="comercio-card-chips">
                  {c.internacional && <span className="chip-dato"><Icono nombre="flecha" size={12} /> Internacional</span>}
                  {c.latitud != null && c.longitud != null && (
                    <a className="chip-dato" href={`https://www.google.com/maps?q=${c.latitud},${c.longitud}`} target="_blank" rel="noreferrer">
                      <Icono nombre="ojo" size={12} /> Ver mapa
                    </a>
                  )}
                </div>

                <dl className="comercio-card-stats">
                  <div><dt>Transacciones</dt><dd>{numero(e?.transacciones || 0)}</dd></div>
                  <div><dt>Monto total</dt><dd>{moneda(e?.monto || 0)}</dd></div>
                  <div><dt>Alertas</dt><dd className={e?.alertas ? 'con-valor' : ''}>{numero(e?.alertas || 0)}</dd></div>
                  <div><dt>Tasa de fraude</dt><dd className={tasa > 0 ? 'peligro' : ''}>{tasa == null ? '—' : `${tasa.toFixed(tasa < 10 && tasa > 0 ? 1 : 0)}%`}</dd></div>
                </dl>
                {tasa != null && (
                  <div className="comercio-card-barra" title={`${e.fraudulentas} fraudulentas · ${e.sospechosas} sospechosas de ${e.transacciones}`}>
                    <span className="b-fraude" style={{ width: `${(e.fraudulentas / e.transacciones) * 100}%` }} />
                    <span className="b-sosp" style={{ width: `${(e.sospechosas / e.transacciones) * 100}%` }} />
                  </div>
                )}

                <footer className="comercio-card-pie">
                  <small className="muted">{e?.ultimaCompra ? `Última compra ${fechaHora(e.ultimaCompra)}` : 'Sin compras registradas'}</small>
                  <span className="comercio-card-acciones">
                    {e?.transacciones > 0 && (
                      <Link to={`/transacciones?texto=${encodeURIComponent(c.nombre)}`} className="btn btn-sec btn-sm btn-icono" title="Ver sus transacciones" aria-label="Ver transacciones">
                        <Icono nombre="transaccion" size={14} />
                      </Link>
                    )}
                    {esAdmin && <button className="btn btn-sec btn-sm" onClick={() => setEditando(c)}>Editar</button>}
                  </span>
                </footer>
              </article>
            )
          })}
        </div>
      ) : (
        <section className="panel sin-padding">
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Comercio</th><th>Ciudad</th><th>Riesgo</th><th className="der">Transacciones</th><th className="der">Monto</th>
                  <th className="der">Alertas</th><th className="der">Tasa de fraude</th><th>Última compra</th>{esAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => {
                  const e = est(c)
                  const tasa = tasaFraude(e)
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="comercio-celda">
                          <Sigla categoria={c.categoria} size={32} />
                          <span>
                            <strong>{c.nombre}</strong>
                            <small className="muted">{etiqueta(c.categoria)}{c.internacional ? ' · Internacional' : ''}</small>
                          </span>
                        </span>
                      </td>
                      <td>{c.ciudad || '—'}</td>
                      <td><Badge valor={c.nivelRiesgo} /></td>
                      <td className="der num">{numero(e?.transacciones || 0)}</td>
                      <td className="der num">{moneda(e?.monto || 0)}</td>
                      <td className="der num">{numero(e?.alertas || 0)}</td>
                      <td className={`der num ${tasa > 0 ? 'texto-peligro' : ''}`}>{tasa == null ? '—' : `${tasa.toFixed(1)}%`}</td>
                      <td className="nowrap">{e?.ultimaCompra ? fechaHora(e.ultimaCompra) : <span className="muted">—</span>}</td>
                      {esAdmin && <td className="der"><button className="btn btn-sec btn-sm" onClick={() => setEditando(c)}>Editar</button></td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {editando && (
        <FormComercio comercio={editando} alCerrar={() => setEditando(null)}
          alGuardar={() => { setEditando(null); recargar(); stats.recargar() }} />
      )}
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
