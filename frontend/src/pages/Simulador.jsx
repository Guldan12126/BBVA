import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import Icono from '../components/Icono'
import { Aviso, Badge, Campo, Encabezado, InputPrefijo, MedidorRiesgo, Opciones, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { etiqueta, fechaHora, moneda, numero } from '../utils/formato'

/**
 * Herramientas del Administrador para probar el sistema:
 * - Generar transacciones aleatorias (normales o fraudulentas) o un lote.
 * - Registrar una transacción manual eligiendo tarjeta, comercio y monto.
 * Las transacciones generadas se guardan de verdad: aparecen en los dashboards y pueden generar alertas.
 */
const MODOS = [
  { valor: 'rapida', texto: 'Rápida', descripcion: 'Una compra al azar', icono: 'rayo' },
  { valor: 'lote', texto: 'Lote', descripcion: 'Muchas a la vez', icono: 'actividad' },
  { valor: 'manual', texto: 'Manual', descripcion: 'Tú eliges los datos', icono: 'regla' },
]

const PRESETS_LOTE = [
  { texto: 'Prueba rápida', cantidad: 20, porcentaje: 10 },
  { texto: 'Día normal', cantidad: 100, porcentaje: 5 },
  { texto: 'Ataque de fraude', cantidad: 50, porcentaje: 60 },
]

const CANALES = [
  { valor: 'POS', texto: 'POS', descripcion: 'En tienda', icono: 'comercio' },
  { valor: 'ECOMMERCE', texto: 'E-commerce', descripcion: 'Compra en línea', icono: 'actividad' },
  { valor: 'APP_MOVIL', texto: 'App móvil', descripcion: 'Desde el celular', icono: 'telefono' },
  { valor: 'ATM', texto: 'Cajero', descripcion: 'Retiro en ATM', icono: 'tarjeta' },
]

const ESCENARIOS = [
  { texto: 'Compra habitual', icono: 'escudo-ok', datos: { monto: '85.50', canal: 'POS', ciudad: '' } },
  { texto: 'Monto inusual', icono: 'transaccion', datos: { monto: '7500', canal: 'POS', ciudad: '' } },
  { texto: 'Compra en el extranjero', icono: 'comercio', datos: { monto: '1200', canal: 'ECOMMERCE', ciudad: 'Miami' } },
]

const ESTADOS_LOTE = [
  { clave: 'aprobadas', texto: 'Aprobadas', color: 'var(--verde)' },
  { clave: 'enRevision', texto: 'En revisión', color: 'var(--amarillo)' },
  { clave: 'bloqueadas', texto: 'Bloqueadas', color: 'var(--rojo)' },
  { clave: 'rechazadas', texto: 'Rechazadas', color: 'var(--naranja)' },
]

export default function Simulador() {
  const [modo, setModo] = useState('rapida')
  const [resultado, setResultado] = useState(null)
  const [lote, setLote] = useState(null)
  const [historial, setHistorial] = useState([])
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(null) // qué acción está en curso

  async function ejecutar(clave, peticion, alTerminar) {
    setError(null)
    setOcupado(clave)
    try {
      const { data } = await peticion()
      alTerminar(data)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setOcupado(null)
    }
  }

  function mostrarTransaccion(d) {
    setResultado(d)
    setLote(null)
    const t = d.transaccion || d
    setHistorial((h) => [{ ...t, alertaId: d.alertaId, alertaCodigo: d.alertaCodigo, _k: `${t.id}-${Date.now()}` }, ...h].slice(0, 8))
  }

  const aleatoria = (fraude) =>
    ejecutar(fraude ? 'fraude' : 'normal', () => api.post('/api/simulador/transaccion', null, { params: { fraude } }), mostrarTransaccion)

  return (
    <>
      <Encabezado titulo="Simulador de transacciones" descripcion="Genera operaciones de prueba y observa en tiempo real cómo responde el motor de riesgo" />

      <div className="nota nota-alerta sim-nota">
        <Icono nombre="alerta" size={16} />
        <span>Las transacciones simuladas se guardan en el sistema: aparecen en los dashboards, en el historial y pueden generar alertas reales.</span>
      </div>

      <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

      <div className="sim-layout">
        {/* ---------- Panel de control ---------- */}
        <section className="panel sim-control">
          <Opciones nombre="modo" opciones={MODOS} valor={modo} alCambiar={setModo} columnas={3} />

          {modo === 'rapida' && (
            <div className="sim-modo">
              <p className="muted">Crea una compra con una tarjeta y un comercio elegidos al azar.</p>
              <div className="sim-botones">
                <button className="sim-boton verde" disabled={!!ocupado} onClick={() => aleatoria(false)}>
                  <span className="sim-boton-icono">{ocupado === 'normal' ? <span className="spinner" /> : <Icono nombre="escudo-ok" size={22} />}</span>
                  <strong>Compra normal</strong>
                  <small>Monto cercano a su gasto promedio, en un comercio de bajo riesgo</small>
                </button>
                <button className="sim-boton rojo" disabled={!!ocupado} onClick={() => aleatoria(true)}>
                  <span className="sim-boton-icono">{ocupado === 'fraude' ? <span className="spinner" /> : <Icono nombre="escudo-alerta" size={22} />}</span>
                  <strong>Compra fraudulenta</strong>
                  <small>Monto 4 a 9 veces mayor, de madrugada, en línea y en un comercio de riesgo</small>
                </button>
              </div>
            </div>
          )}

          {modo === 'lote' && <FormLote ocupado={ocupado} ejecutar={ejecutar} alResultado={(d) => { setLote(d); setResultado(null) }} />}

          {modo === 'manual' && <FormManual ocupado={ocupado} ejecutar={ejecutar} alResultado={mostrarTransaccion} />}
        </section>

        {/* ---------- Resultado ---------- */}
        <div className="sim-lateral">
          <section className="panel sim-resultado">
            <div className="panel-titulo">
              <div>
                <h2>Respuesta del motor de riesgo</h2>
                <p className="panel-sub">{lote ? 'Resumen del lote' : 'Última transacción evaluada'}</p>
              </div>
            </div>
            {!resultado && !lote && (
              <Vacio icono="simulador" titulo="Aún no hay resultados">Genera una transacción para ver cómo la evalúa el sistema.</Vacio>
            )}
            {resultado && <ResultadoTransaccion r={resultado} />}
            {lote && <ResultadoLote lote={lote} />}
          </section>

          {historial.length > 0 && (
            <section className="panel">
              <div className="panel-titulo">
                <div>
                  <h2>Historial de la sesión</h2>
                  <p className="panel-sub">Transacciones que generaste ahora</p>
                </div>
                <button className="btn btn-link btn-sm" onClick={() => setHistorial([])}>Limpiar</button>
              </div>
              <ul className="sim-historial">
                {historial.map((t) => (
                  <li key={t._k}>
                    <Link to={`/transacciones/${t.id}`}>
                      <span className={`prioridad-marca marca-${t.nivelRiesgo}`} />
                      <span className="sim-hist-datos">
                        <strong className="mono">{t.codigo}</strong>
                        <small>{t.comercio?.nombre} · {fechaHora(t.fechaHora)}</small>
                      </span>
                      <span className="sim-hist-fin">
                        <strong>{moneda(t.monto)}</strong>
                        <Badge valor={t.estado} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

function ResultadoTransaccion({ r }) {
  // El simulador y el registro manual devuelven { transaccion, alertaGenerada, alertaId, factores, evaluadoPorIa }
  const t = r.transaccion || r
  const factores = [...(r.factores || [])].sort((a, b) => (b.impacto || 0) - (a.impacto || 0))
  const max = Math.max(0.01, ...factores.map((f) => f.impacto || 0))
  return (
    <div className="sim-res">
      <div className="sim-res-cabecera">
        <MedidorRiesgo valor={t.scoreRiesgo} nivel={t.nivelRiesgo} />
        <div className="sim-res-datos">
          <strong className="hero-monto">{moneda(t.monto)}</strong>
          <span>{t.comercio?.nombre} · {t.ciudad}</span>
          <span className="hero-chips">
            <span className="chip-dato"><Icono nombre="transaccion" size={13} /> {etiqueta(t.canal)}</span>
            <span className="chip-dato"><Icono nombre="ia" size={13} /> {r.evaluadoPorIa ?? t.evaluadoPorIa ? 'Modelo de IA' : 'Reglas de respaldo'}</span>
            {t.tiempoEvaluacionMs != null && <span className="chip-dato"><Icono nombre="rayo" size={13} /> {t.tiempoEvaluacionMs} ms</span>}
          </span>
          <span className="sim-res-estado">Resultado: <Badge valor={t.estado} /></span>
        </div>
      </div>

      {r.alertaGenerada ? (
        <Link to={`/alertas/${r.alertaId}`} className="nota nota-peligro sim-alerta">
          <Icono nombre="campana" size={16} />
          <span>Se generó la alerta <strong className="mono">{r.alertaCodigo}</strong>. Ábrela para revisarla →</span>
        </Link>
      ) : (
        <div className="nota nota-info">
          <Icono nombre="check" size={16} />
          <span>No se generó alerta: la probabilidad quedó por debajo del umbral.</span>
        </div>
      )}

      {factores.length > 0 && (
        <>
          <h3 className="sim-subtitulo">Factores que influyeron</h3>
          <ol className="factores-lista">
            {factores.map((f, i) => {
              const imp = f.impacto || 0
              const tono = imp >= 0.3 ? 'rojo' : imp >= 0.15 ? 'naranja' : 'amarillo'
              return (
                <li key={f.factor || i}>
                  <span className={`factor-num factor-${tono}`}>{i + 1}</span>
                  <span className="factor-cuerpo">
                    <span className="factor-linea">
                      <span>{f.descripcion}</span>
                      <strong className={`factor-impacto factor-${tono}`}>+{imp.toFixed(2)}</strong>
                    </span>
                    <span className="factor-pista"><span className={`factor-${tono}`} style={{ width: `${(imp / max) * 100}%` }} /></span>
                  </span>
                </li>
              )
            })}
          </ol>
        </>
      )}
      <Link to={`/transacciones/${t.id}`} className="btn btn-sec btn-sm sim-ver">Ver transacción {t.codigo} <Icono nombre="flecha" size={14} /></Link>
    </div>
  )
}

function ResultadoLote({ lote }) {
  const total = lote.total || 0
  return (
    <div className="sim-res">
      <div className="sim-lote-total">
        <strong>{numero(total)}</strong>
        <span>transacciones evaluadas</span>
      </div>
      <div className="barra-apilada" aria-hidden="true">
        {ESTADOS_LOTE.filter((x) => lote[x.clave]).map((x) => (
          <span key={x.clave} style={{ width: `${(lote[x.clave] / Math.max(1, total)) * 100}%`, background: x.color }} />
        ))}
      </div>
      <ul className="leyenda">
        {ESTADOS_LOTE.map((x) => (
          <li key={x.clave}>
            <i style={{ background: x.color }} />
            <span>{x.texto}</span>
            <strong>{numero(lote[x.clave] ?? 0)}</strong>
            <small>{total ? (((lote[x.clave] ?? 0) / total) * 100).toFixed(0) : 0}%</small>
          </li>
        ))}
      </ul>
      <Link to="/alertas" className="nota nota-info sim-alerta">
        <Icono nombre="campana" size={16} />
        <span>Se generaron <strong>{numero(lote.alertasGeneradas ?? 0)} alertas</strong>. Ir a la cola de alertas →</span>
      </Link>
    </div>
  )
}

function FormLote({ ocupado, ejecutar, alResultado }) {
  const [cantidad, setCantidad] = useState(50)
  const [porcentaje, setPorcentaje] = useState(10)
  const fraudes = Math.round((Number(cantidad) || 0) * (Number(porcentaje) || 0) / 100)

  const enviar = (e) => {
    e.preventDefault()
    ejecutar('lote', () => api.post('/api/simulador/lote', { cantidad: Number(cantidad), porcentajeFraude: Number(porcentaje) }), alResultado)
  }

  return (
    <form onSubmit={enviar} className="sim-modo">
      <div className="campo">
        <span className="campo-etiqueta">Escenarios rápidos</span>
        <div className="chips">
          {PRESETS_LOTE.map((p) => (
            <button type="button" key={p.texto} className={`chip ${Number(cantidad) === p.cantidad && Number(porcentaje) === p.porcentaje ? 'sel' : ''}`}
              onClick={() => { setCantidad(p.cantidad); setPorcentaje(p.porcentaje) }}>
              {p.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span className="campo-etiqueta">Cantidad de transacciones <span className="campo-extra">{cantidad}</span></span>
        <div className="peso-control">
          <input type="range" min={1} max={500} value={cantidad} onChange={(e) => setCantidad(e.target.value)}
            className="rango" style={{ '--pct': `${((cantidad - 1) / 499) * 100}%` }} aria-label="Cantidad" />
          <input type="number" min={1} max={500} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="peso-numero" required aria-label="Cantidad exacta" />
        </div>
      </div>

      <div className="campo">
        <span className="campo-etiqueta">Porcentaje de fraude <span className="campo-extra">{porcentaje}%</span></span>
        <div className="peso-control">
          <input type="range" min={0} max={100} value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)}
            className="rango rango-rojo" style={{ '--pct': `${porcentaje}%` }} aria-label="Porcentaje de fraude" />
          <input type="number" min={0} max={100} value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} className="peso-numero" required aria-label="Porcentaje exacto" />
        </div>
      </div>

      <div className="sim-preview">
        <span><i style={{ background: 'var(--verde)' }} /> ≈ {numero((Number(cantidad) || 0) - fraudes)} normales</span>
        <span><i style={{ background: 'var(--rojo)' }} /> ≈ {numero(fraudes)} fraudulentas</span>
      </div>

      <button className="btn btn-primario btn-destacado" disabled={!!ocupado}>
        {ocupado === 'lote' ? <><span className="spinner spinner-btn" /> Procesando {cantidad} transacciones…</> : <><Icono nombre="simulador" size={16} /> Generar lote</>}
      </button>
    </form>
  )
}

function FormManual({ ocupado, ejecutar, alResultado }) {
  const tarjetas = useApi('/api/tarjetas', { estado: 'ACTIVA' })
  const comercios = useApi('/api/comercios')
  const [f, setF] = useState({ tarjetaId: '', comercioId: '', monto: '', canal: 'POS', ciudad: '', dispositivo: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const comercio = (comercios.datos || []).find((c) => String(c.id) === String(f.comercioId))

  const enviar = (e) => {
    e.preventDefault()
    const body = { ...f, tarjetaId: Number(f.tarjetaId), comercioId: Number(f.comercioId), monto: Number(f.monto) }
    if (!body.ciudad) delete body.ciudad
    if (!body.dispositivo) delete body.dispositivo
    ejecutar('manual', () => api.post('/api/transacciones', body), alResultado)
  }

  return (
    <form onSubmit={enviar} className="sim-modo">
      <div className="campo">
        <span className="campo-etiqueta">Escenarios de ejemplo</span>
        <div className="chips">
          {ESCENARIOS.map((x) => (
            <button type="button" key={x.texto} className="chip" onClick={() => setF({ ...f, ...x.datos })}>
              <Icono nombre={x.icono} size={14} /> {x.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid">
        <Campo etiqueta="Tarjeta" requerido>
          <select value={f.tarjetaId} onChange={set('tarjetaId')} required>
            <option value="">{tarjetas.cargando ? 'Cargando…' : 'Selecciona una tarjeta activa…'}</option>
            {(tarjetas.datos || []).map((t) => (
              <option key={t.id} value={t.id}>{t.numeroEnmascarado} — {t.cliente?.nombres} {t.cliente?.apellidos}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Comercio" requerido ayuda={comercio ? `${etiqueta(comercio.categoria)} · riesgo ${etiqueta(comercio.nivelRiesgo).toLowerCase()}${comercio.internacional ? ' · internacional' : ''}` : undefined}>
          <select value={f.comercioId} onChange={set('comercioId')} required>
            <option value="">{comercios.cargando ? 'Cargando…' : 'Selecciona un comercio…'}</option>
            {(comercios.datos || []).map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.ciudad})</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Monto" requerido>
          <InputPrefijo prefijo="S/" type="number" step="0.01" min="0.10" value={f.monto} onChange={set('monto')} placeholder="0.00" required />
        </Campo>
        <Campo etiqueta="Ciudad" opcional ayuda="Vacío = la ciudad del comercio">
          <InputPrefijo icono="comercio" value={f.ciudad} onChange={set('ciudad')} placeholder="Ej. Lima, Miami" />
        </Campo>
        <Opciones etiqueta="Canal" nombre="canal" opciones={CANALES} valor={f.canal} alCambiar={(v) => setF({ ...f, canal: v })} columnas={4} />
        <Campo etiqueta="Dispositivo" opcional ancho ayuda="Identificador del equipo (útil para probar la lista negra)">
          <InputPrefijo icono="telefono" value={f.dispositivo} onChange={set('dispositivo')} placeholder="Ej. device-123" />
        </Campo>
      </div>

      <button className="btn btn-primario btn-destacado" disabled={!!ocupado}>
        {ocupado === 'manual' ? <><span className="spinner spinner-btn" /> Evaluando…</> : <><Icono nombre="ia" size={16} /> Evaluar transacción</>}
      </button>
    </form>
  )
}
