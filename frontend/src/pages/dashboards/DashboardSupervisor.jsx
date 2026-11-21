import { Link } from 'react-router-dom'
import { Aviso, Cargando, Kpi, Vacio } from '../../components/UI'
import { numero } from '../../utils/formato'
import {
  aLista, AccesosRapidos, Banner, BarrasDia, CabeceraDashboard, COLOR, COLOR_NIVEL, GraficoActividad, iniciales,
  ListaAlertas, minutosATexto, pct, Progreso, ResumenLeyenda, suma, TituloPanel, useDatosDashboard, VacioOk,
} from './comun'

/** Dashboard del Supervisor de Agencia: escaladas, rendimiento del equipo e indicadores de fraude. */
export default function DashboardSupervisor() {
  const { rol: r, resumen: d, cargando, error, listo, recargar, enVivo, actualizado } = useDatosDashboard(['rol', 'resumen'])

  if (!listo && cargando) return <Cargando />
  if (error && !(r && d)) return <Aviso>{error}</Aviso>
  if (!r || !d) return null

  const semana = (r.decisionesSemana || []).reduce(
    (a, x) => ({ confirmadas: a.confirmadas + x.confirmadas, descartadas: a.descartadas + x.descartadas }),
    { confirmadas: 0, descartadas: 0 },
  )
  const alertasNivel = aLista(d.alertasActivasPorNivel)
  const totalAlertas = suma(alertasNivel)
  const actividad = d.actividadTransaccional || []
  const totSemana = actividad.reduce((a, x) => a + x.total, 0)
  const maxCarga = Math.max(1, ...(r.equipo || []).map((e) => e.activas))

  return (
    <>
      <CabeceraDashboard etiquetaRol="Supervisor de Agencia" subtitulo="Escaladas, rendimiento del equipo y situación del fraude"
        enVivo={enVivo} actualizado={actualizado} cargando={cargando} alActualizar={recargar} />

      {r.escaladas > 0 && (
        <Banner to="/alertas?vista=todas&estado=ESCALADA" icono="flecha" tono="naranja"
          titulo={`${r.escaladas} ${r.escaladas === 1 ? 'alerta escalada espera' : 'alertas escaladas esperan'} tu decisión`}
          texto="Los analistas te pidieron revisar estos casos" accion="Decidir" />
      )}

      <div className="kpis dash-kpis">
        <Kpi icono="flecha" titulo="Escaladas a ti" valor={numero(r.escaladas)} tono="naranja" detalle="Requieren tu decisión" />
        <Kpi icono="campana" titulo="Alertas activas" valor={numero(r.alertasActivas)}
          detalle={`${r.sinAsignar} sin asignar · ${r.criticasActivas} críticas`} />
        <Kpi icono="escudo-alerta" titulo="Tasa de fraude" tono="rojo"
          valor={r.tasaFraude30d === null ? '—' : `${r.tasaFraude30d.toFixed(0)}%`}
          detalle={`De ${numero(r.decididas30d)} alertas resueltas en 30 días`}
          extra={<Progreso valor={r.tasaFraude30d} color={COLOR.rojo} />} />
        <Kpi icono="reloj" titulo="Tiempo de respuesta" valor={minutosATexto(r.tiempoRespuestaMin)}
          detalle="Promedio desde la alerta hasta la decisión" />
        <Kpi icono="caso" titulo="Casos abiertos" valor={numero(r.casosAbiertos)} detalle="Abiertos o en investigación" />
      </div>

      <div className="dash-fila dash-fila-2-1">
        <section className="panel dash-prioritarias">
          <TituloPanel titulo="Alertas escaladas" sub="Ordenadas por probabilidad de fraude">
            <Link to="/alertas?vista=todas&estado=ESCALADA" className="btn btn-sec btn-sm">Ver todas</Link>
          </TituloPanel>
          <ListaAlertas alertas={r.alertasEscaladas} mostrarAsignado vacio={<VacioOk>No hay alertas escaladas pendientes.</VacioOk>} />
        </section>

        <section className="panel">
          <TituloPanel titulo="Decisiones del equipo" sub="Últimos 7 días" />
          <ResumenLeyenda items={[
            { texto: 'Fraude', valor: semana.confirmadas, color: COLOR.rojo },
            { texto: 'Falso positivo', valor: semana.descartadas, color: COLOR.verde },
          ]} />
          <BarrasDia datos={r.decisionesSemana} series={[
            { clave: 'confirmadas', nombre: 'Fraude confirmado', color: COLOR.rojo },
            { clave: 'descartadas', nombre: 'Falso positivo', color: COLOR.verde },
          ]} />
        </section>
      </div>

      <section className="panel sin-padding">
        <div className="panel-cabecera">
          <TituloPanel titulo="Rendimiento del equipo" sub="Analistas activos · resueltas en los últimos 7 días" />
        </div>
        {r.equipo?.length ? (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr><th>Analista</th><th>Carga actual</th><th className="der">Resueltas</th><th className="der">Fraudes</th><th className="der">Tiempo promedio</th></tr>
              </thead>
              <tbody>
                {r.equipo.map((e) => (
                  <tr key={e.id}>
                    <td><span className="persona-mini"><span className="avatar-mini">{iniciales(e.nombre)}</span>{e.nombre}</span></td>
                    <td>
                      <span className="carga">
                        <span className="carga-barra"><span style={{ width: `${pct(e.activas, maxCarga)}%` }} className={e.activas >= 10 ? 'alta' : ''} /></span>
                        <span>{e.activas} activas</span>
                      </span>
                    </td>
                    <td className="der">{numero(e.resueltas)}</td>
                    <td className="der">{numero(e.confirmadas)}</td>
                    <td className="der">{minutosATexto(e.tiempoPromedioMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Vacio icono="usuarios">No hay analistas activos.</Vacio>}
      </section>

      <div className="dash-fila dash-fila-2-1">
        <section className="panel">
          <TituloPanel titulo="Actividad transaccional" sub="Últimos 7 días">
            <ResumenLeyenda items={[
              { texto: 'Total', valor: totSemana, color: COLOR.azul },
              { texto: 'Sospechosas', valor: actividad.reduce((a, x) => a + x.sospechosas, 0), color: COLOR.naranja },
              { texto: 'Fraudulentas', valor: actividad.reduce((a, x) => a + x.fraudulentas, 0), color: COLOR.rojo },
            ]} />
          </TituloPanel>
          <GraficoActividad datos={actividad} alto={250} />
        </section>

        <section className="panel">
          <TituloPanel titulo="Alertas activas por nivel" sub={`${numero(totalAlertas)} pendientes de resolución`} />
          <div className="barra-apilada" aria-hidden="true">
            {alertasNivel.filter((x) => x.valor > 0).map((x) => (
              <span key={x.clave} style={{ width: `${pct(x.valor, totalAlertas)}%`, background: COLOR_NIVEL[x.clave] }} />
            ))}
          </div>
          <div className="lista-niveles">
            {[...alertasNivel].reverse().map((x) => (
              <Link key={x.clave} to={`/alertas?nivel=${x.clave}`} className="nivel-fila">
                <span className="nivel-nombre"><i style={{ background: COLOR_NIVEL[x.clave] }} /> {x.nombre}</span>
                <span className="nivel-valores"><small>{pct(x.valor, totalAlertas).toFixed(0)}%</small><strong>{numero(x.valor)}</strong></span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <TituloPanel titulo="Accesos rápidos" />
        <AccesosRapidos items={[
          { to: '/reportes', icono: 'reporte', texto: 'Reportes', sub: 'Diarios, semanales y mensuales' },
          { to: '/casos', icono: 'caso', texto: 'Casos', sub: 'Investigaciones del equipo' },
          { to: '/auditoria', icono: 'auditoria', texto: 'Auditoría', sub: 'Historial de decisiones' },
          { to: '/alertas?vista=todas', icono: 'alerta', texto: 'Todas las alertas', sub: 'Con filtros por estado' },
        ]} />
      </section>
    </>
  )
}
