import { Link } from 'react-router-dom'
import Icono from '../../components/Icono'
import { Aviso, Badge, Cargando, Kpi, Vacio } from '../../components/UI'
import { moneda, numero } from '../../utils/formato'
import {
  AccesosRapidos, Banner, BarrasDia, CabeceraDashboard, COLOR, haceCuanto, iniciales, pct, Sparkline, TituloPanel,
  useDatosDashboard, VacioOk,
} from './comun'

const RESULTADOS = [
  { clave: 'CLIENTE_CONFIRMA', texto: 'Confirma la compra', color: COLOR.verde, icono: 'escudo-ok' },
  { clave: 'CLIENTE_NIEGA', texto: 'Niega la compra', color: COLOR.rojo, icono: 'escudo-alerta' },
  { clave: 'NO_CONTESTA', texto: 'No contesta', color: COLOR.naranja, icono: 'reloj' },
]

/** Dashboard del Operador de Atención: clientes por llamar y sus llamadas. */
export default function DashboardOperador() {
  const { rol: r, cargando, error, listo, recargar, enVivo, actualizado } = useDatosDashboard(['rol'])

  if (!listo && cargando) return <Cargando />
  if (error && !r) return <Aviso>{error}</Aviso>
  if (!r) return null

  const totalHoy = r.llamadasHoy || 0

  return (
    <>
      <CabeceraDashboard etiquetaRol="Operador de Atención" subtitulo="Clientes por contactar y tus llamadas de hoy"
        enVivo={enVivo} actualizado={actualizado} cargando={cargando} alActualizar={recargar} />

      {r.noReconocidas > 0 && (
        <Banner to="/atencion" icono="telefono"
          titulo={`${r.noReconocidas} ${r.noReconocidas === 1 ? 'cliente no reconoce' : 'clientes no reconocen'} una compra`}
          texto="Llámalos primero para confirmar el fraude y, si lo piden, bloquear su tarjeta" accion="Ir a llamar" />
      )}

      <div className="kpis dash-kpis">
        <Kpi icono="telefono" titulo="Clientes por llamar" valor={numero(r.porLlamar)} tono="rojo"
          detalle={`${r.noReconocidas} niegan la compra · ${r.porLlamar - r.noReconocidas} sin respuesta a tiempo`} />
        <Kpi icono="correo" titulo="Avisos esperando respuesta" valor={numero(r.sinRespuesta)} tono="naranja"
          detalle="El cliente aún no responde el correo" />
        <Kpi icono="actividad" titulo="Mis llamadas hoy" valor={numero(totalHoy)}
          detalle={`${r.tarjetasBloqueadasHoy} tarjetas bloqueadas a pedido del cliente`}
          extra={<Sparkline datos={r.llamadasSemana} clave="llamadas" color={COLOR.azul} id="sp-llamadas" />} />
        <Kpi icono="campana" titulo="Mis alertas activas" valor={numero(r.misAlertasActivas)}
          detalle="Asignadas a ti para seguimiento" />
      </div>

      <div className="dash-fila dash-fila-2-1">
        <section className="panel dash-prioritarias">
          <TituloPanel titulo="Clientes por contactar" sub="Niegan la compra o no respondieron el aviso a tiempo">
            <Link to="/atencion" className="btn btn-sec btn-sm">Ver todos</Link>
          </TituloPanel>
          {r.clientesPorLlamar?.length ? (
            <ul className="lista-llamar">
              {r.clientesPorLlamar.map((n) => (
                <li key={n.id}>
                  <span className="avatar-mini">{iniciales(n.cliente || '')}</span>
                  <span className="llamar-cuerpo">
                    <span className="prioritaria-linea">
                      <strong>{n.cliente || 'Cliente'}</strong>
                      <Badge valor={n.estado} />
                    </span>
                    <span className="prioritaria-linea muted">
                      <span>{n.alertaCodigo ? <span className="mono">{n.alertaCodigo}</span> : '—'} · {moneda(n.monto)}</span>
                      <span>{haceCuanto(n.fecha)}</span>
                    </span>
                  </span>
                  <span className="llamar-acciones">
                    {n.telefono && (
                      <a href={`tel:${n.telefono}`} className="btn btn-sec btn-sm" title={`Llamar al ${n.telefono}`}>
                        <Icono nombre="telefono" size={14} /> {n.telefono}
                      </a>
                    )}
                    {n.alertaId && (
                      <Link to={`/alertas/${n.alertaId}`} className="btn btn-primario btn-sm">Abrir</Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <VacioOk>No hay clientes pendientes de llamada.</VacioOk>
          )}
        </section>

        <section className="panel">
          <TituloPanel titulo="Resultado de mis llamadas" sub="Hoy" />
          {totalHoy ? (
            <>
              <div className="barra-apilada" aria-hidden="true">
                {RESULTADOS.filter((x) => r.resultadosHoy?.[x.clave]).map((x) => (
                  <span key={x.clave} style={{ width: `${pct(r.resultadosHoy[x.clave], totalHoy)}%`, background: x.color }} />
                ))}
              </div>
              <ul className="leyenda">
                {RESULTADOS.map((x) => (
                  <li key={x.clave}>
                    <i style={{ background: x.color }} />
                    <span>{x.texto}</span>
                    <strong>{numero(r.resultadosHoy?.[x.clave] || 0)}</strong>
                    <small>{pct(r.resultadosHoy?.[x.clave] || 0, totalHoy).toFixed(0)}%</small>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Vacio icono="telefono">Aún no registras llamadas hoy.</Vacio>
          )}
          <div className="separador" />
          <TituloPanel titulo="Llamadas de la semana" sub="Últimos 7 días" />
          <BarrasDia datos={r.llamadasSemana} alto={170} series={[{ clave: 'llamadas', nombre: 'Llamadas', color: COLOR.azul }]} />
        </section>
      </div>

      <div className="dash-fila dash-fila-2-1">
        <section className="panel">
          <TituloPanel titulo="Mis últimas llamadas" />
          {r.ultimasLlamadas?.length ? (
            <ul className="timeline">
              {r.ultimasLlamadas.map((l) => {
                const res = RESULTADOS.find((x) => x.clave === l.resultado)
                const tono = l.resultado === 'CLIENTE_CONFIRMA' ? 'verde' : l.resultado === 'CLIENTE_NIEGA' ? 'rojo' : 'naranja'
                return (
                  <li key={l.id} className={`tono-${tono}`}>
                    <span className="timeline-icono"><Icono nombre={res?.icono || 'telefono'} size={14} /></span>
                    <div>
                      <div className="timeline-linea">
                        <strong>{l.cliente || 'Cliente'}</strong> <Badge valor={l.resultado} />
                        {l.tarjetaBloqueada && <Badge valor="BLOQUEADA" texto="Tarjeta bloqueada" />}
                      </div>
                      <small className="muted">
                        {l.alertaId ? <Link to={`/alertas/${l.alertaId}`}>{l.alertaCodigo}</Link> : '—'} · {haceCuanto(l.fecha)}
                      </small>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Vacio icono="telefono">Todavía no has registrado llamadas.</Vacio>
          )}
        </section>

        <section className="panel">
          <TituloPanel titulo="Accesos rápidos" />
          <AccesosRapidos items={[
            { to: '/atencion', icono: 'telefono', texto: 'Atención al cliente', sub: 'Avisos y llamadas' },
            { to: '/alertas?vista=mias', icono: 'campana', texto: 'Mis alertas', sub: 'Asignadas a ti' },
            { to: '/clientes', icono: 'cliente', texto: 'Clientes', sub: 'Buscar datos de contacto' },
          ]} />
        </section>
      </div>
    </>
  )
}
