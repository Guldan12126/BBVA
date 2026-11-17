import { useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Aviso, Badge, BarraRiesgo, Cargando, Encabezado, Kpi } from '../components/UI'
import useApi from '../hooks/useApi'
import useTiempoReal from '../hooks/useTiempoReal'
import { etiqueta, fechaHora, moneda, numero } from '../utils/formato'

const COLOR_NIVEL = { BAJO: '#2e9d5b', MEDIO: '#d9a400', ALTO: '#e07b00', CRITICO: '#d0343c' }
const COLOR_CLASIF = { LEGITIMA: '#2e9d5b', SOSPECHOSA: '#e07b00', FRAUDULENTA: '#d0343c' }

/** Convierte { BAJO: 10, MEDIO: 3 } en [{ nombre: 'Bajo', valor: 10, clave: 'BAJO' }, ...] */
const aLista = (obj) => Object.entries(obj || {}).map(([clave, valor]) => ({ clave, nombre: etiqueta(clave), valor }))

export default function Dashboard() {
  const { datos: d, cargando, error, recargar } = useApi('/api/dashboard/resumen')
  const navigate = useNavigate()

  // Cuando llegan transacciones nuevas por WebSocket se recargan los números.
  // Se espera 2 s para agrupar varias (el simulador puede mandar cientos seguidas).
  const espera = useRef(null)
  const refrescar = useCallback(() => {
    clearTimeout(espera.current)
    espera.current = setTimeout(recargar, 2000)
  }, [recargar])
  useEffect(() => () => clearTimeout(espera.current), [])
  useTiempoReal('/topic/transacciones', refrescar)

  if (cargando && !d) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!d) return null

  const totalClasif = Object.values(d.clasificacionOperaciones || {}).reduce((a, b) => a + b, 0)

  return (
    <>
      <Encabezado titulo={`Hola, ${d.usuario?.split(' ')[0] || ''}`} descripcion="Resumen del sistema de detección de fraude">
        <button className="btn btn-sec" onClick={recargar}>Actualizar</button>
      </Encabezado>

      <div className="kpis">
        <Kpi titulo="Transacciones analizadas" valor={numero(d.transaccionesAnalizadas)} detalle={`${numero(d.transaccionesHoy)} hoy`} />
        <Kpi titulo="Alertas pendientes" valor={numero(d.alertasPendientes)} tono="naranja"
          detalle={d.misAlertasPendientes !== undefined ? `${d.misAlertasPendientes} asignadas a mí` : 'Requieren revisión'} />
        <Kpi titulo="Fraudes confirmados" valor={numero(d.fraudesConfirmados)} tono="rojo" />
        <Kpi titulo="Falsos positivos" valor={numero(d.falsosPositivos)} tono="verde" />
        <Kpi titulo="Tiempo de evaluación" detalle="Promedio por transacción (meta: menos de 3 s)"
          valor={d.tiempoPromedioMs < 1000 ? `${d.tiempoPromedioMs} ms` : `${d.tiempoPromedioSegundos} s`} />
        {d.tarjetasBloqueadas !== undefined && (
          <Kpi titulo="Tarjetas bloqueadas" valor={numero(d.tarjetasBloqueadas)}
            detalle={d.servicioIaDisponible ? 'Modelo de IA en línea' : 'IA fuera de línea (reglas de respaldo)'}
            tono={d.servicioIaDisponible ? undefined : 'naranja'} />
        )}
      </div>

      <div className="grid-2">
        <section className="panel panel-ancho">
          <h2>Actividad transaccional (últimos días)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={(d.actividadTransaccional || []).map((x) => ({ ...x, dia: x.fecha.slice(8, 10) + '/' + x.fecha.slice(5, 7) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
              <XAxis dataKey="dia" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} width={36} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="total" name="Total" stroke="#1464a5" fill="#1464a5" fillOpacity={0.15} />
              <Area type="monotone" dataKey="sospechosas" name="Sospechosas" stroke="#e07b00" fill="#e07b00" fillOpacity={0.15} />
              <Area type="monotone" dataKey="fraudulentas" name="Fraudulentas" stroke="#d0343c" fill="#d0343c" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <h2>Operaciones por nivel de riesgo</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={aLista(d.operacionesPorNivelRiesgo)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
              <XAxis dataKey="nombre" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} width={36} />
              <Tooltip />
              <Bar dataKey="valor" name="Operaciones" radius={[4, 4, 0, 0]}>
                {aLista(d.operacionesPorNivelRiesgo).map((x) => <Cell key={x.clave} fill={COLOR_NIVEL[x.clave]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <h2>Clasificación de operaciones</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={aLista(d.clasificacionOperaciones)} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {aLista(d.clasificacionOperaciones).map((x) => <Cell key={x.clave} fill={COLOR_CLASIF[x.clave]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v} (${totalClasif ? Math.round((v / totalClasif) * 100) : 0}%)`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <h2>Alertas activas por nivel</h2>
          <div className="lista-niveles">
            {aLista(d.alertasActivasPorNivel).map((x) => (
              <Link key={x.clave} to={`/alertas?nivel=${x.clave}`} className="nivel-fila">
                <Badge valor={x.clave} />
                <strong>{x.valor}</strong>
              </Link>
            ))}
          </div>
          <Link to="/alertas" className="btn btn-primario btn-bloque">Ir a la cola de alertas</Link>
        </section>

        <section className="panel panel-ancho">
          <h2>Transacciones recientes</h2>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr><th>Código</th><th>Fecha</th><th>Tarjeta</th><th>Comercio</th><th className="der">Monto</th><th>Riesgo</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {(d.transaccionesRecientes || []).map((t) => (
                  <tr key={t.id} className="fila-click" onClick={() => navigate(`/transacciones/${t.id}`)}>
                    <td className="mono">{t.codigo}</td>
                    <td className="nowrap">{fechaHora(t.fecha)}</td>
                    <td className="mono">{t.tarjeta}</td>
                    <td>{t.comercio}</td>
                    <td className="der">{moneda(t.monto)}</td>
                    <td><BarraRiesgo valor={t.scoreRiesgo} /></td>
                    <td><Badge valor={t.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}
