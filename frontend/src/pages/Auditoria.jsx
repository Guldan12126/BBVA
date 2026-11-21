import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, Encabezado, Paginacion, SelectEnum, TablaCargando, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, etiqueta, fechaHora } from '../utils/formato'

/** Historial de acciones (quién hizo qué) y, para el Administrador, los intentos de inicio de sesión. */
export default function Auditoria() {
  const { tieneRol } = useAuth()
  const [vista, setVista] = useState('acciones')
  return (
    <>
      <Encabezado titulo="Auditoría" descripcion="Registro de todas las acciones realizadas en el sistema" />
      {tieneRol(...PERMISOS.verAccesos) && (
        <div className="pestanas">
          <button className={vista === 'acciones' ? 'activa' : ''} onClick={() => setVista('acciones')}>Acciones</button>
          <button className={vista === 'accesos' ? 'activa' : ''} onClick={() => setVista('accesos')}>Inicios de sesión</button>
        </div>
      )}
      {vista === 'acciones' ? <Acciones /> : <Accesos />}
    </>
  )
}

function Acciones() {
  const [accion, setAccion] = useState('')
  const [page, setPage] = useState(0)
  const { datos, cargando, error } = useApi('/api/auditoria', { accion, page, size: 25 })
  return (
    <>
      <div className="filtros">
        <SelectEnum valores={ENUMS.tipoAccion} valor={accion} alCambiar={(v) => { setAccion(v); setPage(0) }} todos="Todas las acciones" aria-label="Acción" />
      </div>
      <Aviso>{error}</Aviso>
      {cargando && !datos && <TablaCargando columnas={5} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.content.length === 0 ? <Vacio /> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>Alerta</th><th>IP</th></tr></thead>
                <tbody>
                  {datos.content.map((h) => (
                    <tr key={h.id}>
                      <td className="nowrap">{fechaHora(h.fecha)}</td>
                      <td>{h.usuario ? `${h.usuario.nombres} ${h.usuario.apellidos}` : <span className="muted">Sistema</span>}</td>
                      <td><span className="badge badge-gris">{etiqueta(h.accion)}</span></td>
                      <td className="texto-pequeno">{h.detalle}</td>
                      <td>{h.alerta && <Link to={`/alertas/${h.alerta.id}`} className="mono">{h.alerta.codigo}</Link>}</td>
                      <td className="mono texto-pequeno">{h.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion pagina={datos.page} alCambiar={setPage} />
        </section>
      )}
    </>
  )
}

function Accesos() {
  const [correo, setCorreo] = useState('')
  const [buscar, setBuscar] = useState('')
  const [page, setPage] = useState(0)
  const { datos, cargando, error } = useApi('/api/auditoria/accesos', { correo: buscar, page, size: 25 })
  return (
    <>
      <div className="filtros">
        <form className="buscador" onSubmit={(e) => { e.preventDefault(); setBuscar(correo); setPage(0) }}>
          <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Filtrar por correo" aria-label="Correo" />
          <button className="btn btn-sec">Buscar</button>
        </form>
      </div>
      <Aviso>{error}</Aviso>
      {cargando && !datos && <TablaCargando columnas={5} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.content.length === 0 ? <Vacio /> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Fecha</th><th>Correo</th><th>Resultado</th><th>Detalle</th><th>IP</th></tr></thead>
                <tbody>
                  {datos.content.map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap">{fechaHora(r.fecha)}</td>
                      <td>{r.correo}</td>
                      <td><Badge valor={r.exitoso ? 'APROBADA' : 'RECHAZADA'} texto={r.exitoso ? 'Exitoso' : 'Fallido'} /></td>
                      <td>{r.detalle}</td>
                      <td className="mono texto-pequeno">{r.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion pagina={datos.page} alCambiar={setPage} />
        </section>
      )}
    </>
  )
}
