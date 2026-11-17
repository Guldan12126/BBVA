import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import { MENU } from './menu'
import AlertaDetalle from './pages/AlertaDetalle'
import Alertas from './pages/Alertas'
import Atencion from './pages/Atencion'
import Auditoria from './pages/Auditoria'
import CasoDetalle from './pages/CasoDetalle'
import Casos from './pages/Casos'
import ClienteDetalle from './pages/ClienteDetalle'
import Clientes from './pages/Clientes'
import Comercios from './pages/Comercios'
import Dashboard from './pages/Dashboard'
import ListaNegra from './pages/ListaNegra'
import Login from './pages/Login'
import Modelo from './pages/Modelo'
import NoEncontrado from './pages/NoEncontrado'
import Perfil from './pages/Perfil'
import RecuperarPassword from './pages/RecuperarPassword'
import Reglas from './pages/Reglas'
import Reportes from './pages/Reportes'
import Simulador from './pages/Simulador'
import TransaccionDetalle from './pages/TransaccionDetalle'
import Transacciones from './pages/Transacciones'
import Usuarios from './pages/Usuarios'
import ValidarCompra from './pages/ValidarCompra'

/** Si no hay sesión, manda al login (y recuerda a dónde quería ir el usuario). */
function RequiereSesion({ children }) {
  const { usuario } = useAuth()
  const location = useLocation()
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  return children
}

/** Muestra la página solo si el rol del usuario tiene permiso para esa sección del menú. */
function RequiereRol({ ruta, children }) {
  const { tieneRol } = useAuth()
  const opcion = MENU.find((m) => m.ruta === ruta)
  if (opcion && !tieneRol(...opcion.roles)) {
    return <NoEncontrado mensaje="Tu rol no tiene acceso a esta sección." />
  }
  return children
}

const PAGINAS = [
  ['/', Dashboard],
  ['/alertas', Alertas],
  ['/transacciones', Transacciones],
  ['/casos', Casos],
  ['/atencion', Atencion],
  ['/clientes', Clientes],
  ['/comercios', Comercios],
  ['/reglas', Reglas],
  ['/lista-negra', ListaNegra],
  ['/modelo', Modelo],
  ['/simulador', Simulador],
  ['/reportes', Reportes],
  ['/auditoria', Auditoria],
  ['/usuarios', Usuarios],
]

export default function App() {
  const { usuario } = useAuth()
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/recuperar" element={<RecuperarPassword />} />
      <Route path="/validar-compra/:token" element={<ValidarCompra />} />

      {/* Privadas (con menú) */}
      <Route
        element={
          <RequiereSesion>
            <Layout />
          </RequiereSesion>
        }
      >
        {PAGINAS.map(([ruta, Pagina]) => (
          <Route
            key={ruta}
            path={ruta}
            element={
              <RequiereRol ruta={ruta}>
                <Pagina />
              </RequiereRol>
            }
          />
        ))}
        <Route path="/alertas/:id" element={<AlertaDetalle />} />
        <Route path="/transacciones/:id" element={<TransaccionDetalle />} />
        <Route path="/clientes/:id" element={<ClienteDetalle />} />
        <Route
          path="/casos/:id"
          element={
            <RequiereRol ruta="/casos">
              <CasoDetalle />
            </RequiereRol>
          }
        />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}
