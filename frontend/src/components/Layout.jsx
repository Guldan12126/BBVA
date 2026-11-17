import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import useTiempoReal from '../hooks/useTiempoReal'
import { MENU } from '../menu'
import { etiqueta, moneda } from '../utils/formato'
import Icono from './Icono'
import { Badge } from './UI'

/** Estructura de todas las pantallas internas: menú lateral + barra superior + contenido. */
export default function Layout() {
  const { usuario, logout, tieneRol } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [avisos, setAvisos] = useState([])
  const location = useLocation()

  // En celular, el menú se cierra al cambiar de página
  useEffect(() => setMenuAbierto(false), [location.pathname])

  // Cada alerta nueva que llega por WebSocket se muestra unos segundos en la esquina
  const alRecibirAlerta = useCallback((alerta) => {
    const id = `${alerta.id}-${Date.now()}`
    setAvisos((lista) => [{ ...alerta, _id: id }, ...lista].slice(0, 3))
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a._id !== id)), 8000)
  }, [])
  const conectado = useTiempoReal('/topic/alertas', alRecibirAlerta)

  const opciones = MENU.filter((m) => m.grupo || tieneRol(...m.roles))

  return (
    <div className={`app ${menuAbierto ? 'menu-abierto' : ''}`}>
      <aside className="sidebar">
        <div className="marca">
          <img src="/escudo.svg" alt="" width="28" height="28" />
          <div>
            <strong>Detección de Fraude</strong>
            <small>Agencia Piura</small>
          </div>
        </div>
        <nav>
          {opciones.map((m, i) =>
            m.grupo ? (
              // Solo se muestra el título del grupo si tiene opciones visibles debajo
              opciones[i + 1] && !opciones[i + 1].grupo ? (
                <div key={m.grupo} className="nav-grupo">
                  {m.grupo}
                </div>
              ) : null
            ) : (
              <NavLink key={m.ruta} to={m.ruta} end={m.ruta === '/'} className="nav-item">
                <Icono nombre={m.icono} />
                <span>{m.texto}</span>
              </NavLink>
            ),
          )}
        </nav>
      </aside>
      <div className="sidebar-fondo" onClick={() => setMenuAbierto(false)} />

      <div className="principal">
        <header className="topbar">
          <button className="btn-icono solo-movil" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
            <Icono nombre="menu" />
          </button>
          <div className={`estado-conexion ${conectado ? 'ok' : ''}`} title="Alertas en tiempo real">
            <span className="punto" /> {conectado ? 'En vivo' : 'Sin conexión en vivo'}
          </div>
          <div className="topbar-usuario">
            <div className="topbar-nombre">
              <strong>
                {usuario.nombres} {usuario.apellidos}
              </strong>
              <small>{etiqueta(usuario.rol)}</small>
            </div>
            <Link to="/perfil" className="btn-icono" title="Mi cuenta / cambiar contraseña">
              <Icono nombre="llave" />
            </Link>
            <button className="btn-icono" onClick={logout} title="Cerrar sesión">
              <Icono nombre="salir" />
            </button>
          </div>
        </header>

        <main className="contenido">
          <Outlet />
        </main>
      </div>

      <div className="toasts" aria-live="polite">
        {avisos.map((a) => (
          <Link key={a._id} to={`/alertas/${a.id}`} className={`toast toast-${a.nivelRiesgo}`}>
            <div className="toast-titulo">
              Nueva alerta <Badge valor={a.nivelRiesgo} />
            </div>
            <div>
              {moneda(a.monto)} en {a.comercio} ({a.ciudad})
            </div>
            <small className="muted">
              {a.cliente} · {a.tarjeta}
            </small>
          </Link>
        ))}
      </div>
    </div>
  )
}
