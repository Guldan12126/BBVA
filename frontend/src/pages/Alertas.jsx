import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, BarraRiesgo, Encabezado, Paginacion, SelectEnum, TablaCargando, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import useTiempoReal from '../hooks/useTiempoReal'
import { ENUMS, fechaHora, moneda } from '../utils/formato'

const PESTANAS = [
  { id: 'cola', texto: 'Cola de trabajo', url: '/api/alertas/cola' },
  { id: 'mias', texto: 'Asignadas a mí', url: '/api/alertas/mias', roles: ['ANALISTA', 'OPERADOR'] },
  { id: 'todas', texto: 'Todas', url: '/api/alertas' },
]

export default function Alertas() {
  const { tieneRol } = useAuth()
  const navigate = useNavigate()
  // Los filtros se guardan en la URL (?vista=cola&nivel=ALTO&page=0) para poder compartir el enlace
  const [sp, setSp] = useSearchParams()
  const vista = sp.get('vista') || 'cola'
  const nivel = sp.get('nivel') || ''
  const estado = sp.get('estado') || ''
  const page = Number(sp.get('page') || 0)

  const pestanas = PESTANAS.filter((p) => !p.roles || tieneRol(...p.roles))
  const actual = pestanas.find((p) => p.id === vista) || pestanas[0]

  const params = { page, size: 15, nivel }
  if (actual.id === 'todas') params.estado = estado
  const { datos, cargando, error, recargar } = useApi(actual.url, params)

  // Nuevas alertas en vivo: recarga la lista (agrupando varias seguidas)
  const espera = useRef(null)
  const alNueva = useCallback(() => {
    clearTimeout(espera.current)
    espera.current = setTimeout(recargar, 1500)
  }, [recargar])
  useEffect(() => () => clearTimeout(espera.current), [])
  useTiempoReal('/topic/alertas', alNueva)

  function cambiar(cambios) {
    const nuevo = new URLSearchParams(sp)
    Object.entries(cambios).forEach(([k, v]) => (v === '' || v === null ? nuevo.delete(k) : nuevo.set(k, v)))
    if (!('page' in cambios)) nuevo.delete('page')
    setSp(nuevo)
  }

  return (
    <>
      <Encabezado titulo="Alertas de fraude" descripcion="Ordenadas de mayor a menor probabilidad de fraude" />

      <div className="pestanas">
        {pestanas.map((p) => (
          <button key={p.id} className={p.id === actual.id ? 'activa' : ''} onClick={() => cambiar({ vista: p.id, estado: '' })}>
            {p.texto}
          </button>
        ))}
      </div>

      <div className="filtros">
        <SelectEnum valores={ENUMS.nivelRiesgo} valor={nivel} alCambiar={(v) => cambiar({ nivel: v })} todos="Todos los niveles" aria-label="Nivel de riesgo" />
        {actual.id === 'todas' && (
          <SelectEnum valores={ENUMS.estadoAlerta} valor={estado} alCambiar={(v) => cambiar({ estado: v })} todos="Todos los estados" aria-label="Estado" />
        )}
        <button className="btn btn-sec" onClick={recargar}>Actualizar</button>
      </div>

      <Aviso>{error}</Aviso>
      {cargando && !datos && <TablaCargando columnas={10} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.content.length === 0 ? (
            (nivel || estado) ? (
              <Vacio icono="buscar" titulo="Sin resultados"
                accion={<button className="btn btn-sec btn-sm" onClick={() => cambiar({ nivel: '', estado: '' })}>Limpiar filtros</button>}>
                No hay alertas que coincidan con los filtros seleccionados.
              </Vacio>
            ) : (
              <Vacio icono="escudo-ok" titulo={actual.id === 'mias' ? 'No tienes alertas asignadas' : 'Todo al día'}>
                {actual.id === 'cola' ? 'No hay alertas pendientes de revisión.' : 'No hay alertas para mostrar.'}
              </Vacio>
            )
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Alerta</th><th>Fecha</th><th>Cliente</th><th>Comercio</th><th className="der">Monto</th>
                    <th>Probabilidad</th><th>Nivel</th><th>Prioridad</th><th>Estado</th><th>Asignada a</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.content.map((a) => {
                    const tx = a.transaccion || {}
                    const cliente = tx.tarjeta?.cliente
                    return (
                      <tr key={a.id} className="fila-click" onClick={() => navigate(`/alertas/${a.id}`)}>
                        <td className="mono">{a.codigo}</td>
                        <td className="nowrap">{fechaHora(tx.fechaHora || a.fechaCreacion)}</td>
                        <td>{cliente ? `${cliente.nombres} ${cliente.apellidos}` : '—'}</td>
                        <td>{tx.comercio?.nombre}</td>
                        <td className="der">{moneda(tx.monto)}</td>
                        <td><BarraRiesgo valor={a.probabilidad} /></td>
                        <td><Badge valor={a.nivelRiesgo} /></td>
                        <td><Badge valor={a.prioridad} /></td>
                        <td><Badge valor={a.estado} /></td>
                        <td>{a.asignadoA ? `${a.asignadoA.nombres} ${a.asignadoA.apellidos}` : <span className="muted">Sin asignar</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion pagina={datos.page} alCambiar={(p) => cambiar({ page: p })} />
        </section>
      )}
    </>
  )
}
