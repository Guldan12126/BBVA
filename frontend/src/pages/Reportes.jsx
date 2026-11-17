import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { Aviso, Campo, Cargando, Encabezado, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { ENUMS, descargarArchivo, etiqueta, fecha, fechaHora, hoyISO, moneda, numero } from '../utils/formato'

export default function Reportes() {
  const { datos, cargando, error, recargar } = useApi('/api/reportes')
  const [f, setF] = useState({ tipo: 'DIARIO', desde: '', hasta: hoyISO() })
  const [errorAccion, setErrorAccion] = useState(null)
  const [aviso, setAviso] = useState(null)

  async function generar(e) {
    e.preventDefault()
    setErrorAccion(null)
    try {
      const body = { tipo: f.tipo, hasta: f.hasta || null, desde: f.tipo === 'PERSONALIZADO' ? f.desde : null }
      const { data } = await api.post('/api/reportes', body)
      setAviso(`Se generó "${data.nombre}"`)
      recargar()
    } catch (err) {
      setErrorAccion(mensajeError(err))
    }
  }

  async function descargar(r) {
    setErrorAccion(null)
    try {
      const { data } = await api.get(`/api/reportes/${r.id}/descargar`, { responseType: 'blob' })
      descargarArchivo(data, `${r.nombre.replaceAll(' ', '_')}.csv`)
    } catch (err) {
      setErrorAccion(mensajeError(err))
    }
  }

  return (
    <>
      <Encabezado titulo="Reportes" descripcion="Resumen de fraude por periodo. El detalle se descarga en CSV (se abre en Excel)." />
      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso alCerrar={() => setErrorAccion(null)}>{errorAccion || error}</Aviso>

      <form className="panel form-grid form-grid-4" onSubmit={generar}>
        <Campo etiqueta="Tipo de reporte">
          <SelectEnum valores={ENUMS.tipoReporte} valor={f.tipo} alCambiar={(v) => setF({ ...f, tipo: v })} todos={false} />
        </Campo>
        {f.tipo === 'PERSONALIZADO' && (
          <Campo etiqueta="Desde"><input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} required /></Campo>
        )}
        <Campo etiqueta={f.tipo === 'PERSONALIZADO' ? 'Hasta' : 'Fecha de corte'}>
          <input type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} />
        </Campo>
        <button className="btn btn-primario">Generar reporte</button>
      </form>

      {cargando && !datos && <Cargando />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? <Vacio>Aún no hay reportes. El sistema genera uno diario a las 23:55.</Vacio> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Reporte</th><th>Tipo</th><th>Periodo</th><th className="der">Transacciones</th><th className="der">Alertas</th>
                  <th className="der">Fraudes</th><th className="der">Falsos +</th><th className="der">Monto en fraude</th><th>Generado</th><th /></tr></thead>
                <tbody>
                  {datos.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.nombre}</strong></td>
                      <td>{etiqueta(r.tipo)}</td>
                      <td className="nowrap">{fecha(r.fechaInicio)} – {fecha(r.fechaFin)}</td>
                      <td className="der">{numero(r.totalTransacciones)}</td>
                      <td className="der">{numero(r.totalAlertas)}</td>
                      <td className="der">{numero(r.fraudesConfirmados)}</td>
                      <td className="der">{numero(r.falsosPositivos)}</td>
                      <td className="der">{moneda(r.montoTotalFraude)}</td>
                      <td className="texto-pequeno">{fechaHora(r.fechaGeneracion)}<br /><span className="muted">{r.generadoPor ? r.generadoPor.nombres : 'Automático'}</span></td>
                      <td className="der"><button className="btn btn-sec btn-sm" onClick={() => descargar(r)}>CSV</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  )
}
