import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Aviso, Badge, BarraRiesgo, Cargando, Encabezado, Paginacion, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { ENUMS, etiqueta, fechaHora, moneda } from '../utils/formato'

const FILTROS = ['texto', 'nivel', 'canal', 'estado', 'clasificacion', 'desde', 'hasta', 'clienteId']

export default function Transacciones() {
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const filtros = Object.fromEntries(FILTROS.map((k) => [k, sp.get(k) || '']))
  const page = Number(sp.get('page') || 0)
  const [texto, setTexto] = useState(filtros.texto)

  const { datos, cargando, error, recargar } = useApi('/api/transacciones', { ...filtros, page, size: 20 })

  function cambiar(cambios) {
    const nuevo = new URLSearchParams(sp)
    Object.entries(cambios).forEach(([k, v]) => (v === '' ? nuevo.delete(k) : nuevo.set(k, v)))
    if (!('page' in cambios)) nuevo.delete('page')
    setSp(nuevo)
  }

  return (
    <>
      <Encabezado titulo="Transacciones" descripcion="Todas las operaciones evaluadas por el motor de riesgo" />

      <div className="filtros">
        <form onSubmit={(e) => { e.preventDefault(); cambiar({ texto }) }} className="buscador">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Código TX o últimos 4 dígitos" aria-label="Buscar" />
          <button className="btn btn-sec">Buscar</button>
        </form>
        <SelectEnum valores={ENUMS.nivelRiesgo} valor={filtros.nivel} alCambiar={(v) => cambiar({ nivel: v })} todos="Nivel" aria-label="Nivel" />
        <SelectEnum valores={ENUMS.canal} valor={filtros.canal} alCambiar={(v) => cambiar({ canal: v })} todos="Canal" aria-label="Canal" />
        <SelectEnum valores={ENUMS.estadoTransaccion} valor={filtros.estado} alCambiar={(v) => cambiar({ estado: v })} todos="Estado" aria-label="Estado" />
        <SelectEnum valores={ENUMS.clasificacion} valor={filtros.clasificacion} alCambiar={(v) => cambiar({ clasificacion: v })} todos="Clasificación" aria-label="Clasificación" />
        <label className="filtro-fecha">Desde <input type="date" value={filtros.desde} onChange={(e) => cambiar({ desde: e.target.value })} /></label>
        <label className="filtro-fecha">Hasta <input type="date" value={filtros.hasta} onChange={(e) => cambiar({ hasta: e.target.value })} /></label>
        {sp.toString() && <button className="btn btn-link" onClick={() => { setTexto(''); setSp({}) }}>Limpiar</button>}
        <button className="btn btn-sec" onClick={recargar}>Actualizar</button>
      </div>

      <Aviso>{error}</Aviso>
      {cargando && !datos && <Cargando />}
      {datos && (
        <section className="panel sin-padding">
          {datos.content.length === 0 ? <Vacio>No se encontraron transacciones</Vacio> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead>
                  <tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Tarjeta</th><th>Comercio</th><th>Canal</th><th>Ciudad</th>
                    <th className="der">Monto</th><th>Riesgo</th><th>Clasificación</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {datos.content.map((t) => (
                    <tr key={t.id} className="fila-click" onClick={() => navigate(`/transacciones/${t.id}`)}>
                      <td className="mono">{t.codigo}</td>
                      <td className="nowrap">{fechaHora(t.fechaHora)}</td>
                      <td>{t.tarjeta?.cliente ? `${t.tarjeta.cliente.nombres} ${t.tarjeta.cliente.apellidos}` : '—'}</td>
                      <td className="mono">{t.tarjeta?.numeroEnmascarado}</td>
                      <td>{t.comercio?.nombre}</td>
                      <td>{etiqueta(t.canal)}</td>
                      <td>{t.ciudad}</td>
                      <td className="der">{moneda(t.monto, t.moneda)}</td>
                      <td><BarraRiesgo valor={t.scoreRiesgo} /></td>
                      <td><Badge valor={t.clasificacion} /></td>
                      <td><Badge valor={t.estado} /></td>
                    </tr>
                  ))}
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
