import { Link, useNavigate, useParams } from 'react-router-dom'
import { Aviso, Badge, BarraRiesgo, Cargando, Detalles, Encabezado } from '../components/UI'
import useApi from '../hooks/useApi'
import { etiqueta, fechaHora, moneda } from '../utils/formato'

export default function TransaccionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { datos: t, cargando, error } = useApi(`/api/transacciones/${id}`)
  // Si la transacción generó alerta, se busca para enlazarla (404 = no tiene alerta)
  const alerta = useApi(t && t.scoreRiesgo != null ? `/api/alertas/transaccion/${id}` : null)

  if (cargando) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!t) return null
  const cliente = t.tarjeta?.cliente

  return (
    <>
      <Encabezado titulo={`Transacción ${t.codigo}`} descripcion={fechaHora(t.fechaHora)}>
        <button className="btn btn-sec" onClick={() => navigate(-1)}>← Volver</button>
      </Encabezado>

      {alerta.datos && (
        <Aviso tipo="info">
          Esta transacción generó la alerta <Link to={`/alertas/${alerta.datos.id}`}>{alerta.datos.codigo}</Link> ({etiqueta(alerta.datos.estado)}).
        </Aviso>
      )}

      <div className="grid-2">
        <section className="panel">
          <h2>Operación</h2>
          <Detalles items={[
            ['Monto', <strong key="m" className="monto-grande">{moneda(t.monto, t.moneda)}</strong>],
            ['Estado', <Badge key="e" valor={t.estado} />],
            ['Clasificación', <Badge key="c" valor={t.clasificacion} />],
            ['Canal', etiqueta(t.canal)],
            ['Ciudad', t.ciudad],
            ['Coordenadas', t.latitud != null ? `${t.latitud.toFixed(4)}, ${t.longitud.toFixed(4)}` : null],
            ['IP', t.ip],
            ['Dispositivo', t.dispositivo],
          ]} />
        </section>
        <section className="panel">
          <h2>Evaluación de riesgo</h2>
          <div className="score-grande"><BarraRiesgo valor={t.scoreRiesgo} /><Badge valor={t.nivelRiesgo} /></div>
          <Detalles items={[
            ['Evaluado por', t.scoreRiesgo == null ? 'No evaluada (tarjeta no activa)' : t.evaluadoPorIa ? 'Modelo de IA' : 'Reglas de respaldo'],
            ['Versión del modelo', t.versionModelo],
            ['Tiempo de evaluación', t.tiempoEvaluacionMs != null ? `${t.tiempoEvaluacionMs} ms` : null],
          ]} />
        </section>
        <section className="panel">
          <h2>Comercio</h2>
          <Detalles items={[
            ['Nombre', t.comercio?.nombre],
            ['Categoría', etiqueta(t.comercio?.categoria)],
            ['Ciudad', t.comercio?.ciudad],
            ['Nivel de riesgo', <Badge key="n" valor={t.comercio?.nivelRiesgo} />],
            ['Internacional', t.comercio?.internacional ? 'Sí' : 'No'],
          ]} />
        </section>
        <section className="panel">
          <h2>Tarjeta y cliente</h2>
          <Detalles items={[
            ['Tarjeta', t.tarjeta?.numeroEnmascarado],
            ['Tipo', etiqueta(t.tarjeta?.tipo)],
            ['Estado de la tarjeta', <Badge key="t" valor={t.tarjeta?.estado} />],
            ['Cliente', cliente && <Link key="c" to={`/clientes/${cliente.id}`}>{cliente.nombres} {cliente.apellidos}</Link>],
            ['DNI', cliente?.dni],
            ['Ciudad del cliente', cliente?.ciudad],
          ]} />
        </section>
      </div>
    </>
  )
}
