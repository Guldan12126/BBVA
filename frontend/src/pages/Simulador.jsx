import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { Aviso, Badge, BarraRiesgo, Campo, Encabezado, SelectEnum } from '../components/UI'
import useApi from '../hooks/useApi'
import { ENUMS, etiqueta, moneda } from '../utils/formato'

/**
 * Herramientas del Administrador para probar el sistema:
 * - Generar transacciones aleatorias (normales o fraudulentas) o un lote.
 * - Registrar una transacción manual eligiendo tarjeta, comercio y monto.
 */
export default function Simulador() {
  const [resultado, setResultado] = useState(null)
  const [lote, setLote] = useState(null)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [cantidad, setCantidad] = useState(50)
  const [porcentaje, setPorcentaje] = useState(10)

  async function ejecutar(peticion, alTerminar) {
    setError(null)
    setOcupado(true)
    try {
      const { data } = await peticion()
      alTerminar(data)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setOcupado(false)
    }
  }

  const aleatoria = (fraude) =>
    ejecutar(() => api.post('/api/simulador/transaccion', null, { params: { fraude } }), (d) => { setResultado(d); setLote(null) })

  const enviarLote = (e) => {
    e.preventDefault()
    ejecutar(() => api.post('/api/simulador/lote', { cantidad: Number(cantidad), porcentajeFraude: Number(porcentaje) }), (d) => { setLote(d); setResultado(null) })
  }

  return (
    <>
      <Encabezado titulo="Simulador de transacciones" descripcion="Genera operaciones de prueba y observa cómo responde el motor de riesgo" />
      <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

      <div className="grid-2">
        <section className="panel">
          <h2>Transacción aleatoria</h2>
          <p className="muted">Crea una compra con una tarjeta y un comercio al azar.</p>
          <div className="fila-botones">
            <button className="btn btn-exito" disabled={ocupado} onClick={() => aleatoria(false)}>Compra normal</button>
            <button className="btn btn-peligro" disabled={ocupado} onClick={() => aleatoria(true)}>Compra fraudulenta</button>
          </div>

          <h2 className="mt">Lote de transacciones</h2>
          <form onSubmit={enviarLote} className="form-grid">
            <Campo etiqueta="Cantidad (1-500)">
              <input type="number" min={1} max={500} value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
            </Campo>
            <Campo etiqueta="% de fraude (0-100)">
              <input type="number" min={0} max={100} value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} required />
            </Campo>
            <button className="btn btn-primario" disabled={ocupado}>{ocupado ? 'Procesando…' : 'Generar lote'}</button>
          </form>
        </section>

        <section className="panel">
          <h2>Resultado</h2>
          {!resultado && !lote && <p className="muted">Aquí verás la respuesta del motor de riesgo.</p>}
          {resultado && <ResultadoTransaccion r={resultado} />}
          {lote && (
            <div className="kpis kpis-compactos">
              {[['total', 'Total'], ['aprobadas', 'Aprobadas'], ['enRevision', 'En revisión'], ['bloqueadas', 'Bloqueadas'],
                ['rechazadas', 'Rechazadas'], ['alertasGeneradas', 'Alertas']].map(([k, t]) => (
                <div key={k} className="kpi"><div className="kpi-titulo">{t}</div><div className="kpi-valor">{lote[k] ?? 0}</div></div>
              ))}
            </div>
          )}
        </section>

        <TransaccionManual ocupado={ocupado} ejecutar={ejecutar} alResultado={(d) => { setResultado(d); setLote(null) }} />
      </div>
    </>
  )
}

function ResultadoTransaccion({ r }) {
  // El simulador y el registro manual devuelven { transaccion, alertaGenerada, alertaId, factores, ... }
  const t = r.transaccion || r
  return (
    <div>
      <div className="score-grande"><BarraRiesgo valor={t.scoreRiesgo} /><Badge valor={t.nivelRiesgo} /><Badge valor={t.estado} /></div>
      <p>
        <Link to={`/transacciones/${t.id}`} className="mono">{t.codigo}</Link> · {moneda(t.monto)} en {t.comercio?.nombre} ({t.ciudad}) · {etiqueta(t.canal)}
      </p>
      {r.alertaGenerada && <Aviso tipo="info">Se generó la alerta <Link to={`/alertas/${r.alertaId}`}>{r.alertaCodigo}</Link></Aviso>}
      {r.factores?.length > 0 && (
        <ul className="lista-simple">
          {r.factores.map((f) => <li key={f.factor}>{f.descripcion} <small className="muted">({(f.impacto ?? 0).toFixed(2)})</small></li>)}
        </ul>
      )}
    </div>
  )
}

function TransaccionManual({ ocupado, ejecutar, alResultado }) {
  const tarjetas = useApi('/api/tarjetas', { estado: 'ACTIVA' })
  const comercios = useApi('/api/comercios')
  const [f, setF] = useState({ tarjetaId: '', comercioId: '', monto: '', canal: 'POS', ciudad: '', dispositivo: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const enviar = (e) => {
    e.preventDefault()
    const body = { ...f, tarjetaId: Number(f.tarjetaId), comercioId: Number(f.comercioId), monto: Number(f.monto) }
    if (!body.ciudad) delete body.ciudad
    if (!body.dispositivo) delete body.dispositivo
    ejecutar(() => api.post('/api/transacciones', body), alResultado)
  }

  return (
    <section className="panel panel-ancho">
      <h2>Transacción manual</h2>
      <form onSubmit={enviar} className="form-grid form-grid-3">
        <Campo etiqueta="Tarjeta (activas)">
          <select value={f.tarjetaId} onChange={set('tarjetaId')} required>
            <option value="">Selecciona…</option>
            {(tarjetas.datos || []).map((t) => (
              <option key={t.id} value={t.id}>{t.numeroEnmascarado} — {t.cliente?.nombres} {t.cliente?.apellidos}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Comercio">
          <select value={f.comercioId} onChange={set('comercioId')} required>
            <option value="">Selecciona…</option>
            {(comercios.datos || []).map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.ciudad})</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Monto (S/)">
          <input type="number" step="0.01" min="0.10" value={f.monto} onChange={set('monto')} required />
        </Campo>
        <Campo etiqueta="Canal">
          <SelectEnum valores={ENUMS.canal} valor={f.canal} alCambiar={(v) => setF({ ...f, canal: v })} todos={false} />
        </Campo>
        <Campo etiqueta="Ciudad (opcional)" ayuda="Si se deja vacío se usa la del comercio">
          <input value={f.ciudad} onChange={set('ciudad')} placeholder="Ej. Lima, Miami" />
        </Campo>
        <Campo etiqueta="Dispositivo (opcional)">
          <input value={f.dispositivo} onChange={set('dispositivo')} />
        </Campo>
        <button className="btn btn-primario" disabled={ocupado}>Evaluar transacción</button>
      </form>
    </section>
  )
}
