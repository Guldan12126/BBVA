import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import useTiempoReal from '../hooks/useTiempoReal'
import { MENU } from '../menu'
import { etiqueta, moneda } from '../utils/formato'
import logoBbva from '../assets/images/bbva-logo.webp'
import Icono from './Icono'
import { Badge, Cargando } from './UI'

/** Busca la opción del menú (y su grupo) que corresponde a la ruta actual, para el título de la barra superior. */
function seccionActual(pathname) {
  let grupo = null
  let mejor = null
  for (const m of MENU) {
    if (m.grupo) {
      grupo = m.grupo
      continue
    }
    const coincide = m.ruta === '/' ? pathname === '/' : pathname === m.ruta || pathname.startsWith(`${m.ruta}/`)
    if (coincide && (!mejor || m.ruta.length > mejor.ruta.length)) mejor = { ...m, grupo }
  }
  if (!mejor && pathname.startsWith('/perfil')) return { texto: 'Mi cuenta', grupo: 'Cuenta' }
  return mejor
}

const hoy = () =>
  new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

/** Estructura de todas las pantallas internas: menú lateral + barra superior + contenido. */
export default function Layout() {
  const { usuario, logout, tieneRol, foto } = useAuth()
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
  const seccion = useMemo(() => seccionActual(location.pathname), [location.pathname])
  const esDetalle = seccion && seccion.ruta && location.pathname !== seccion.ruta
  const iniciales = `${usuario.nombres?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase()

  return (
    <div className={`app ${menuAbierto ? 'menu-abierto' : ''}`}>
      <aside className="sidebar">
        <div className="marca">
          <img src={logoBbva} alt="BBVA" className="marca-logo" />
          <div className="marca-texto">
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

        <div className="sidebar-pie">
          <Link to="/perfil" className="sidebar-usuario" title="Mi cuenta / cambiar contraseña">
            <span className="avatar">{foto ? <img src={foto} alt="" /> : iniciales}</span>
            <span className="sidebar-usuario-datos">
              <strong>
                {usuario.nombres} {usuario.apellidos}
              </strong>
              <small>{etiqueta(usuario.rol)}</small>
            </span>
          </Link>
          <button className="sidebar-salir" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
            <Icono nombre="salir" size={17} />
          </button>
        </div>
      </aside>
      <div className="sidebar-fondo" onClick={() => setMenuAbierto(false)} />

      <div className="principal">
        <header className="topbar">
          <button className="btn-icono solo-movil" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
            <Icono nombre="menu" />
          </button>

          <div className="migas">
            {seccion?.grupo && (
              <>
                <span className="migas-grupo">{seccion.grupo}</span>
                <Icono nombre="chevron" size={14} />
              </>
            )}
            {esDetalle ? (
              <>
                <Link to={seccion.ruta}>{seccion.texto}</Link>
                <Icono nombre="chevron" size={14} />
                <span className="migas-actual">Detalle</span>
              </>
            ) : (
              <span className="migas-actual">{seccion?.texto || 'Inicio'}</span>
            )}
          </div>

          <div className="topbar-derecha">
            <span className="topbar-fecha">
              <Icono nombre="calendario" size={15} /> {hoy()}
            </span>
            <div className={`estado-conexion ${conectado ? 'ok' : ''}`} title="Alertas en tiempo real">
              <span className="punto" /> {conectado ? 'En vivo' : 'Sin conexión'}
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
          {/* Mientras se descarga una página, el menú y la barra superior siguen visibles */}
          <Suspense fallback={<Cargando />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <div className="toasts" aria-live="polite">
        {avisos.map((a) => (
          <Link key={a._id} to={`/alertas/${a.id}`} className={`toast toast-${a.nivelRiesgo}`}>
            <span className="toast-icono">
              <Icono nombre="campana" size={16} />
            </span>
            <span className="toast-cuerpo">
              <span className="toast-titulo">
                Nueva alerta <Badge valor={a.nivelRiesgo} />
              </span>
              <span className="toast-texto">
                {moneda(a.monto)} en {a.comercio} ({a.ciudad})
              </span>
              <small className="muted">
                {a.cliente} · {a.tarjeta}
              </small>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
