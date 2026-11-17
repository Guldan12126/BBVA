import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, Cargando, Encabezado, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { etiqueta, fechaHora, moneda } from '../utils/formato'

/**
 * Pantalla del Operador de Atención al Cliente:
 * - Clientes que respondieron "No reconozco" o no respondieron (hay que llamarlos).
 * - Alertas asignadas a mí.
 * - Mis llamadas registradas.
 */
export default function Atencion() {
  const navigate = useNavigate()
  const { tieneRol } = useAuth()
  const notificaciones = useApi('/api/notificaciones')
  const mias = useApi('/api/alertas/mias', { activas: true, size: 50 })
  const atenciones = useApi(tieneRol('OPERADOR') ? '/api/atencion/mias' : null)

  // Prioridad: clientes que NO reconocen la compra, luego avisos expirados sin respuesta
  const porLlamar = (notificaciones.datos || []).filter((n) => n.estado === 'NO_RECONOCIDA' || n.estado === 'EXPIRADA')

  return (
    <>
      <Encabezado titulo="Atención al cliente" descripcion="Seguimiento de las respuestas de los clientes y llamadas" />
      <Aviso>{notificaciones.error || mias.error}</Aviso>

      <div className="grid-2">
        <section className="panel panel-ancho">
          <h2>Clientes por contactar</h2>
          {notificaciones.cargando && !notificaciones.datos ? <Cargando /> : porLlamar.length === 0 ? (
            <Vacio>No hay clientes pendientes de llamada</Vacio>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Cliente</th><th>Teléfono</th><th>Respuesta</th><th>Compra</th><th>Enviado</th><th /></tr></thead>
                <tbody>
                  {porLlamar.map((n) => (
                    <tr key={n.id}>
                      <td><strong>{n.cliente?.nombres} {n.cliente?.apellidos}</strong></td>
                      <td className="mono">{n.cliente?.telefono || '—'}</td>
                      <td><Badge valor={n.estado} /></td>
                      <td>{moneda(n.alerta?.transaccion?.monto)} · {n.alerta?.transaccion?.comercio?.nombre}</td>
                      <td>{fechaHora(n.fechaEnvio)}</td>
                      <td className="der">{n.alerta && <Link to={`/alertas/${n.alerta.id}`} className="btn btn-sec btn-sm">Atender</Link>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Alertas asignadas a mí</h2>
          {mias.datos?.content?.length ? (
            <ul className="lista-alertas">
              {mias.datos.content.map((a) => (
                <li key={a.id} className="fila-click" onClick={() => navigate(`/alertas/${a.id}`)}>
                  <span className="mono">{a.codigo}</span>
                  <span>{moneda(a.transaccion?.monto)}</span>
                  <Badge valor={a.nivelRiesgo} />
                  <Badge valor={a.estado} />
                </li>
              ))}
            </ul>
          ) : <Vacio>No tienes alertas asignadas</Vacio>}
        </section>

        {atenciones.datos && (
          <section className="panel">
            <h2>Mis llamadas registradas</h2>
            {atenciones.datos.length ? (
              <ul className="linea-tiempo">
                {atenciones.datos.map((t) => (
                  <li key={t.id}>
                    <div><Badge valor={t.resultado} /> <Link to={`/alertas/${t.alerta?.id}`}>{t.alerta?.codigo}</Link></div>
                    {t.observacion && <div>{t.observacion}</div>}
                    <small className="muted">{fechaHora(t.fecha)}{t.tarjetaBloqueada ? ' · tarjeta bloqueada' : ''}</small>
                  </li>
                ))}
              </ul>
            ) : <Vacio>Aún no registras llamadas</Vacio>}
          </section>
        )}

        <section className="panel panel-ancho">
          <h2>Todos los avisos enviados</h2>
          {notificaciones.datos?.length ? (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Cliente</th><th>Canal</th><th>Estado</th><th>Enviado</th><th>Respondido</th><th>Alerta</th></tr></thead>
                <tbody>
                  {notificaciones.datos.slice(0, 50).map((n) => (
                    <tr key={n.id}>
                      <td>{n.cliente?.nombres} {n.cliente?.apellidos}</td>
                      <td>{etiqueta(n.canal)}</td>
                      <td><Badge valor={n.estado} /></td>
                      <td>{fechaHora(n.fechaEnvio)}</td>
                      <td>{fechaHora(n.fechaRespuesta)}</td>
                      <td>{n.alerta && <Link to={`/alertas/${n.alerta.id}`} className="mono">{n.alerta.codigo}</Link>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Vacio>Sin avisos</Vacio>}
        </section>
      </div>
    </>
  )
}
