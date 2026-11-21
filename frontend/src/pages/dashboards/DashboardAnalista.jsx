import { Link } from 'react-router-dom'
import { Aviso, Cargando, Kpi, Vacio } from '../../components/UI'
import { numero } from '../../utils/formato'
import {
  AccesosRapidos, BarrasDia, CabeceraDashboard, COLOR, ListaAlertas, minutosATexto, Progreso, ResumenLeyenda,
  TituloPanel, useDatosDashboard,
} from './comun'

/** Dashboard del Analista de Fraude: su cola de trabajo y su productividad. */
export default function DashboardAnalista() {
  const { rol: r, cargando, error, listo, recargar, enVivo, actualizado } = useDatosDashboard(['rol'])

  if (!listo && cargando) return <Cargando />
  if (error && !r) return <Aviso>{error}</Aviso>
  if (!r) return null

  const semana = (r.productividad || []).reduce(
    (a, x) => ({ confirmadas: a.confirmadas + x.confirmadas, descartadas: a.descartadas + x.descartadas }),
    { confirmadas: 0, descartadas: 0 },
  )

  return (
    <>
      <CabeceraDashboard etiquetaRol="Analista de Fraude" subtitulo="Tu cola de trabajo y tu avance de hoy"
        enVivo={enVivo} actualizado={actualizado} cargando={cargando} alActualizar={recargar}
        foco={r.misCriticas > 0 ? {
          to: '/alertas?vista=mias&nivel=CRITICO', accion: 'Atender',
          titulo: `${r.misCriticas} ${r.misCriticas === 1 ? 'alerta crítica asignada' : 'alertas críticas asignadas'}`,
          texto: 'Tienen la mayor probabilidad de fraude',
        } : r.misPendientes > 0 ? {
          to: '/alertas?vista=mias', icono: 'campana', tono: 'naranja', accion: 'Ver mi cola',
          titulo: `${r.misPendientes} ${r.misPendientes === 1 ? 'alerta pendiente' : 'alertas pendientes'} en tu cola`,
          texto: 'Empieza por la de mayor probabilidad',
        } : r.sinAsignar > 0 ? {
          to: '/alertas', icono: 'bandeja', tono: 'azul', accion: 'Tomar alertas',
          titulo: `${r.sinAsignar} ${r.sinAsignar === 1 ? 'alerta sin asignar' : 'alertas sin asignar'}`,
          texto: 'Tu cola está vacía: toma una de la cola general',
        } : null}
        focoOk={{ titulo: 'Cola al día', texto: 'No tienes alertas pendientes ni hay alertas sin asignar.' }} />

      <div className="kpis dash-kpis">
        <Kpi icono="campana" titulo="Mis alertas pendientes" valor={numero(r.misPendientes)} tono="naranja"
          detalle={r.misCriticas ? `${r.misCriticas} críticas` : 'Ninguna crítica'} />
        <Kpi icono="check" titulo="Resueltas hoy" valor={numero(r.resueltasHoy)} tono="verde"
          detalle={`${r.confirmadasHoy} fraudes · ${r.descartadasHoy} falsos positivos`} />
        <Kpi icono="reloj" titulo="Tiempo de resolución" valor={minutosATexto(r.tiempoPromedioMin)}
          detalle="Promedio desde que se crea hasta que decides (30 días)" />
        <Kpi icono="escudo-ok" titulo="Precisión" tono="verde"
          valor={r.precision30d === null ? '—' : `${r.precision30d.toFixed(0)}%`}
          detalle="De tus decisiones, cuántas fueron fraude real"
          extra={<Progreso valor={r.precision30d} color={COLOR.verde} />} />
        <Kpi icono="bandeja" titulo="Sin asignar en la cola" valor={numero(r.sinAsignar)}
          detalle={r.sinAsignar ? 'Disponibles para tomar' : 'La cola está al día'} />
      </div>

      <div className="dash-fila dash-fila-2-1">
        <section className="panel dash-prioritarias">
          <TituloPanel titulo="Mi cola de trabajo" sub="Tus alertas activas, de mayor a menor probabilidad de fraude">
            <Link to="/alertas?vista=mias" className="btn btn-sec btn-sm">Ver todas</Link>
          </TituloPanel>
          <ListaAlertas alertas={r.miCola} vacio={
            <Vacio icono="escudo-ok" titulo="No tienes alertas asignadas"
              accion={r.sinAsignar > 0 && <Link to="/alertas" className="btn btn-primario btn-sm">Tomar de la cola ({r.sinAsignar})</Link>}>
              {r.sinAsignar > 0 ? 'Hay alertas sin asignar esperando revisión.' : 'La cola general también está al día.'}
            </Vacio>
          } />
        </section>

        <section className="panel">
          <TituloPanel titulo="Mi productividad" sub="Alertas que decidiste en los últimos 7 días" />
          <ResumenLeyenda items={[
            { texto: 'Fraude', valor: semana.confirmadas, color: COLOR.rojo },
            { texto: 'Falso positivo', valor: semana.descartadas, color: COLOR.verde },
          ]} />
          <BarrasDia datos={r.productividad} series={[
            { clave: 'confirmadas', nombre: 'Fraude confirmado', color: COLOR.rojo },
            { clave: 'descartadas', nombre: 'Falso positivo', color: COLOR.verde },
          ]} />
        </section>
      </div>

      <section className="panel">
        <TituloPanel titulo="Accesos rápidos" />
        <AccesosRapidos items={[
          { to: '/alertas', icono: 'alerta', texto: 'Cola general', sub: 'Todas las alertas activas' },
          { to: '/casos', icono: 'caso', texto: 'Casos', sub: 'Investigaciones abiertas' },
          { to: '/transacciones', icono: 'transaccion', texto: 'Transacciones', sub: 'Buscar operaciones' },
          { to: '/lista-negra', icono: 'prohibido', texto: 'Lista negra', sub: 'Bloquear tarjetas o comercios' },
        ]} />
      </section>
    </>
  )
}
