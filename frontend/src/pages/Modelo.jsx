import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, Cargando, Detalles, Encabezado, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { fechaHora, porcentaje } from '../utils/formato'

/** Estado del microservicio de IA, parámetros del motor (umbrales) y versiones del modelo. */
export default function Modelo() {
  const { tieneRol } = useAuth()
  const estado = useApi('/api/modelo/estado')
  const parametros = useApi('/api/parametros')
  const versiones = useApi('/api/modelo/versiones')
  const [aviso, setAviso] = useState(null)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const esAdmin = tieneRol(...PERMISOS.editarModelo)
  const e = estado.datos

  async function ejecutar(peticion, msg) {
    setError(null)
    setAviso(null)
    setOcupado(true)
    try {
      const { data } = await peticion()
      setAviso(typeof msg === 'function' ? msg(data) : msg)
      estado.recargar()
      parametros.recargar()
      versiones.recargar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <Encabezado titulo="Modelo de IA" descripcion="Microservicio de Machine Learning (FastAPI) y parámetros del motor de riesgo">
        {esAdmin && (
          <>
            <button className="btn btn-sec" disabled={ocupado} onClick={() => ejecutar(() => api.post('/api/modelo/verificar'), 'Verificación completada')}>
              Verificar conexión
            </button>
            <button className="btn btn-primario" disabled={ocupado || !e?.feedbackPendiente}
              onClick={() => window.confirm('¿Reentrenar el modelo con las decisiones de los analistas?') &&
                ejecutar(() => api.post('/api/modelo/reentrenar'), (v) => `Nueva versión ${v.version} activa`)}>
              {ocupado ? 'Procesando…' : 'Reentrenar modelo'}
            </button>
          </>
        )}
      </Encabezado>
      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso alCerrar={() => setError(null)}>{error || estado.error}</Aviso>

      <div className="grid-2">
        <section className="panel">
          <h2>Estado del servicio</h2>
          {!e ? <Cargando /> : (
            <>
              <div className={`estado-servicio ${e.disponible ? 'ok' : 'caido'}`}>
                <span className="punto" />
                {!e.habilitado ? 'Integración desactivada' : e.disponible ? 'Modelo de IA en línea' : 'Fuera de línea: se usan las reglas de respaldo'}
              </div>
              <Detalles items={[
                ['Versión activa', e.versionActiva],
                ['URL del servicio', <span key="u" className="mono">{e.url}</span>],
                ['Última verificación', fechaHora(e.ultimaVerificacion)],
                ['Umbral de alerta', porcentaje(e.umbralAlerta)],
                ['Umbral crítico (bloqueo)', porcentaje(e.umbralCritico)],
                ['Peso de la IA en el score', porcentaje(e.pesoIa)],
                ['Decisiones pendientes para reentrenar', e.feedbackPendiente],
              ]} />
            </>
          )}
        </section>

        <section className="panel">
          <h2>Parámetros del motor</h2>
          <p className="muted texto-pequeno">
            score = peso IA × score del modelo + (1 − peso IA) × score de reglas. Menor al umbral de alerta → aprobada;
            entre ambos umbrales → en revisión; mayor o igual al crítico → bloqueada.
          </p>
          {parametros.datos ? (
            <div className="parametros">
              {parametros.datos.map((p) => (
                <Parametro key={p.clave} p={p} editable={esAdmin && p.clave !== 'VERSION_MODELO_ACTIVA'}
                  alGuardar={(valor) => ejecutar(() => api.put(`/api/parametros/${p.clave}`, { valor }), `${p.clave} actualizado`)} />
              ))}
            </div>
          ) : <Cargando />}
        </section>

        <section className="panel panel-ancho">
          <h2>Versiones del modelo</h2>
          {versiones.datos?.length ? (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Versión</th><th>Algoritmo</th><th>Estado</th><th className="der">Precisión</th><th className="der">Recall</th>
                  <th className="der">AUC-ROC</th><th className="der">Muestras</th><th>Entrenado</th><th>Observaciones</th></tr></thead>
                <tbody>
                  {versiones.datos.map((v) => (
                    <tr key={v.id}>
                      <td className="mono">{v.version}</td>
                      <td>{v.algoritmo}</td>
                      <td><Badge valor={v.estado} /></td>
                      <td className="der">{porcentaje(v.precisionScore, 1)}</td>
                      <td className="der">{porcentaje(v.recallScore, 1)}</td>
                      <td className="der">{v.aucRoc?.toFixed(3) ?? '—'}</td>
                      <td className="der">{v.muestrasEntrenamiento ?? '—'}</td>
                      <td>{fechaHora(v.fechaEntrenamiento)}</td>
                      <td className="texto-pequeno">{v.observaciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Vacio>Sin versiones registradas</Vacio>}
        </section>
      </div>
    </>
  )
}

function Parametro({ p, editable, alGuardar }) {
  const [valor, setValor] = useState(p.valor)
  const cambiado = valor !== p.valor
  return (
    <form className="parametro" onSubmit={(e) => { e.preventDefault(); alGuardar(valor) }}>
      <div>
        <strong className="mono">{p.clave}</strong>
        <div className="muted texto-pequeno">{p.descripcion}</div>
        {p.modificadoPor && <div className="muted texto-pequeno">Modificado por {p.modificadoPor} · {fechaHora(p.fechaModificacion)}</div>}
      </div>
      {editable ? (
        <div className="parametro-input">
          <input value={valor} onChange={(e) => setValor(e.target.value)} aria-label={p.clave} />
          <button className="btn btn-primario btn-sm" disabled={!cambiado}>Guardar</button>
        </div>
      ) : <span className="mono">{p.valor}</span>}
    </form>
  )
}
