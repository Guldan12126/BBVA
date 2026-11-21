import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Icono from '../../components/Icono'
import { Aviso, Cargando, Kpi, Vacio } from '../../components/UI'
import { etiqueta, fechaHora, numero } from '../../utils/formato'
import {
  aLista, AccesosRapidos, CabeceraDashboard, COLOR, COLOR_NIVEL, EJE, GraficoActividad, haceCuanto, pct, Progreso,
  ResumenLeyenda, Sparkline, suma, TituloPanel, TOOLTIP, useDatosDashboard, variacion,
} from './comun'

const META_MS = 3000
const COLOR_ROL = { ADMIN: COLOR.azul, ANALISTA: COLOR.turquesa, SUPERVISOR: COLOR.naranja, OPERADOR: COLOR.verde }

/** Tarjeta de estado de un componente del sistema (verde = ok, naranja = atención). */
function EstadoComponente({ icono, titulo, valor, detalle, ok, to }) {
  return (
    <Link to={to} className={`estado-comp ${ok ? 'ok' : 'atencion'}`}>
      <span className="estado-comp-icono"><Icono nombre={icono} size={18} /></span>
      <span className="estado-comp-texto">
        <small>{titulo}</small>
        <strong>{valor}</strong>
        <span>{detalle}</span>
      </span>
      <span className="estado-comp-punto" />
    </Link>
  )
}

/** Dashboard del Administrador: estado del sistema, configuración y volumen. */
export default function DashboardAdmin() {
  const { rol: r, resumen: d, cargando, error, listo, recargar, enVivo, actualizado } = useDatosDashboard(['rol', 'resumen'])

  if (!listo && cargando) return <Cargando />
  if (error && !(r && d)) return <Aviso>{error}</Aviso>
  if (!r || !d) return null

  const m = r.modelo || {}
  const actividad = d.actividadTransaccional || []
  const hoy = actividad.at(-1) || {}
  const ayer = actividad.at(-2) || {}
  const niveles = aLista(d.operacionesPorNivelRiesgo)
  const totalNiveles = suma(niveles)
  const roles = aLista(r.usuariosPorRol).map((x) => ({ ...x, nombre: etiqueta(x.clave).split(' ')[0] }))
  const tiempo = d.tiempoPromedioMs < 1000 ? `${d.tiempoPromedioMs} ms` : `${d.tiempoPromedioSegundos} s`
  const iaOk = m.disponible && m.habilitado !== false

  return (
    <>
      <CabeceraDashboard etiquetaRol="Administrador" subtitulo="Estado del sistema, configuración y volumen transaccional"
        enVivo={enVivo} actualizado={actualizado} cargando={cargando} alActualizar={recargar} />

      {/* ---------- Estado del sistema ---------- */}
      <div className="estado-sistema">
        <EstadoComponente to="/modelo" icono="ia" titulo="Modelo de IA" ok={iaOk}
          valor={iaOk ? 'En línea' : 'Fuera de línea'}
          detalle={iaOk ? `Versión ${m.versionActiva ?? '—'}` : 'Se usan las reglas de respaldo'} />
        <EstadoComponente to="/reglas" icono="regla" titulo="Motor de reglas" ok={r.reglasActivas > 0}
          valor={`${r.reglasActivas} de ${r.reglasTotal} activas`}
          detalle={r.reglasActivas > 0 ? 'Evaluando cada transacción' : 'Ninguna regla activa'} />
        <EstadoComponente to="/lista-negra" icono="prohibido" titulo="Lista negra" ok
          valor={`${numero(r.listaNegraActivos)} registros`} detalle="Bloqueos vigentes" />
        <EstadoComponente to="/auditoria" icono="candado" titulo="Seguridad" ok={r.accesosFallidos24h < 10}
          valor={`${numero(r.accesosFallidos24h)} accesos fallidos`} detalle="En las últimas 24 horas" />
      </div>

      <div className="kpis dash-kpis">
        <Kpi icono="actividad" titulo="Transacciones hoy" valor={numero(d.transaccionesHoy)}
          tendencia={{ valor: variacion(hoy.total, ayer.total), bueno: 'subir', texto: 'Comparado con ayer' }}
          detalle={`${numero(d.transaccionesAnalizadas)} analizadas en total`}
          extra={<Sparkline datos={actividad} clave="total" color={COLOR.azul} id="sp-adm-total" />} />
        <Kpi icono="rayo" titulo="Tiempo de evaluación" valor={tiempo} tono={d.tiempoPromedioMs > META_MS ? 'naranja' : undefined}
          detalle={d.tiempoPromedioMs <= META_MS ? 'Dentro de la meta (menos de 3 s)' : 'Por encima de la meta de 3 s'}
          extra={<Progreso valor={pct(d.tiempoPromedioMs, META_MS)} color={d.tiempoPromedioMs > META_MS ? COLOR.naranja : COLOR.azul} />} />
        <Kpi icono="campana" titulo="Alertas pendientes" valor={numero(d.alertasPendientes)} tono="naranja" detalle="En todo el sistema" />
        <Kpi icono="tarjeta" titulo="Tarjetas bloqueadas" valor={numero(d.tarjetasBloqueadas)} tono="rojo" detalle="Definitivo o temporal" />
        <Kpi icono="usuarios" titulo="Usuarios activos" valor={numero(r.usuariosActivos)}
          detalle={r.usuariosInactivos ? `${r.usuariosInactivos} inactivos o bloqueados` : 'Todos activos'} />
      </div>

      <div className="dash-fila dash-fila-2-1">
        <section className="panel">
          <TituloPanel titulo="Volumen transaccional" sub="Últimos 7 días">
            <ResumenLeyenda items={[
              { texto: 'Total', valor: actividad.reduce((a, x) => a + x.total, 0), color: COLOR.azul },
              { texto: 'Sospechosas', valor: actividad.reduce((a, x) => a + x.sospechosas, 0), color: COLOR.naranja },
              { texto: 'Fraudulentas', valor: actividad.reduce((a, x) => a + x.fraudulentas, 0), color: COLOR.rojo },
            ]} />
          </TituloPanel>
          <GraficoActividad datos={actividad} />
        </section>

        <section className="panel">
          <TituloPanel titulo="Configuración del modelo" sub="Parámetros con los que se evalúa cada compra">
            <Link to="/modelo" className="btn btn-sec btn-sm">Ajustar</Link>
          </TituloPanel>
          <ul className="parametros-dash">
            <li>
              <span>Umbral de alerta</span>
              <strong>{m.umbralAlerta != null ? `${Math.round(m.umbralAlerta * 100)}%` : '—'}</strong>
              <Progreso valor={(m.umbralAlerta || 0) * 100} color={COLOR.naranja} />
            </li>
            <li>
              <span>Umbral crítico</span>
              <strong>{m.umbralCritico != null ? `${Math.round(m.umbralCritico * 100)}%` : '—'}</strong>
              <Progreso valor={(m.umbralCritico || 0) * 100} color={COLOR.rojo} />
            </li>
            <li>
              <span>Peso de la IA vs. reglas</span>
              <strong>{m.pesoIa != null ? `${Math.round(m.pesoIa * 100)}% / ${100 - Math.round(m.pesoIa * 100)}%` : '—'}</strong>
              <Progreso valor={(m.pesoIa || 0) * 100} color={COLOR.azul} />
            </li>
          </ul>
          <div className={`nota ${m.feedbackPendiente > 0 ? 'nota-info' : ''}`}>
            <Icono nombre="ia" size={16} />
            <span>
              {m.feedbackPendiente > 0
                ? <><strong>{numero(m.feedbackPendiente)} decisiones</strong> de analistas pendientes de usar para reentrenar el modelo. <Link to="/modelo">Reentrenar</Link></>
                : 'No hay decisiones nuevas para reentrenar el modelo.'}
            </span>
          </div>
        </section>
      </div>

      <div className="dash-fila dash-fila-3">
        <section className="panel">
          <TituloPanel titulo="Usuarios por rol" sub={`${numero(r.usuariosActivos)} activos`}>
            <Link to="/usuarios" className="btn btn-sec btn-sm">Gestionar</Link>
          </TituloPanel>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roles} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="nombre" width={92} {...EJE} />
              <Tooltip {...TOOLTIP} formatter={(v) => [numero(v), 'Usuarios']} />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {roles.map((x) => <Cell key={x.clave} fill={COLOR_ROL[x.clave] || COLOR.gris} />)}
                <LabelList dataKey="valor" position="right" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--texto-suave)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <TituloPanel titulo="Operaciones por nivel de riesgo" sub={`${numero(totalNiveles)} evaluadas`} />
          <div className="barra-apilada" aria-hidden="true">
            {niveles.filter((x) => x.valor > 0).map((x) => (
              <span key={x.clave} style={{ width: `${pct(x.valor, totalNiveles)}%`, background: COLOR_NIVEL[x.clave] }} />
            ))}
          </div>
          <ul className="leyenda">
            {niveles.map((x) => (
              <li key={x.clave}>
                <i style={{ background: COLOR_NIVEL[x.clave] }} />
                <span>{x.nombre}</span>
                <strong>{numero(x.valor)}</strong>
                <small>{pct(x.valor, totalNiveles).toFixed(1)}%</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <TituloPanel titulo="Últimos accesos" sub="Inicios de sesión al sistema">
            <Link to="/auditoria" className="btn btn-sec btn-sm">Auditoría</Link>
          </TituloPanel>
          {r.ultimosAccesos?.length ? (
            <ul className="accesos-lista">
              {r.ultimosAccesos.map((a, i) => (
                <li key={i} title={fechaHora(a.fecha)}>
                  <span className={`acceso-estado ${a.exitoso ? 'ok' : 'mal'}`}>
                    <Icono nombre={a.exitoso ? 'check' : 'alerta'} size={14} />
                  </span>
                  <span className="acceso-datos">
                    <strong>{a.correo}</strong>
                    <small>{a.exitoso ? 'Ingreso correcto' : a.detalle || 'Intento fallido'} · <span className="mono">{a.ip || '—'}</span></small>
                  </span>
                  <small className="muted">{haceCuanto(a.fecha)}</small>
                </li>
              ))}
            </ul>
          ) : <Vacio icono="candado">Sin accesos registrados.</Vacio>}
        </section>
      </div>

      <section className="panel">
        <TituloPanel titulo="Administración" />
        <AccesosRapidos items={[
          { to: '/usuarios', icono: 'usuarios', texto: 'Usuarios', sub: 'Altas, roles y contraseñas' },
          { to: '/reglas', icono: 'regla', texto: 'Reglas', sub: 'Umbrales y pesos del motor' },
          { to: '/modelo', icono: 'ia', texto: 'Modelo de IA', sub: 'Parámetros y reentrenamiento' },
          { to: '/simulador', icono: 'simulador', texto: 'Simulador', sub: 'Generar transacciones de prueba' },
        ]} />
      </section>
    </>
  )
}
