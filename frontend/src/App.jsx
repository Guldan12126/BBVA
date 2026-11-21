import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import { Cargando } from './components/UI'
import { MENU } from './menu'
import Login from './pages/Login'
import NoEncontrado from './pages/NoEncontrado'

// Las demás páginas se cargan bajo demanda
const AlertaDetalle = lazy(() => import('./pages/AlertaDetalle'))
const Alertas = lazy(() => import('./pages/Alertas'))
const Atencion = lazy(() => import('./pages/Atencion'))
const Auditoria = lazy(() => import('./pages/Auditoria'))
const CasoDetalle = lazy(() => import('./pages/CasoDetalle'))
const Casos = lazy(() => import('./pages/Casos'))
const ClienteDetalle = lazy(() => import('./pages/ClienteDetalle'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Comercios = lazy(() => import('./pages/Comercios'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ListaNegra = lazy(() => import('./pages/ListaNegra'))
const Modelo = lazy(() => import('./pages/Modelo'))
const Perfil = lazy(() => import('./pages/Perfil'))
const RecuperarPassword = lazy(() => import('./pages/RecuperarPassword'))
const Reglas = lazy(() => import('./pages/Reglas'))
const Reportes = lazy(() => import('./pages/Reportes'))
const Simulador = lazy(() => import('./pages/Simulador'))
const TransaccionDetalle = lazy(() => import('./pages/TransaccionDetalle'))
const Transacciones = lazy(() => import('./pages/Transacciones'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const ValidarCompra = lazy(() => import('./pages/ValidarCompra'))

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
  // Cada página se descarga solo cuando se abre por primera vez (carga inicial más rápida)
  return (
    <Suspense fallback={<Cargando />}>
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
    </Suspense>
  )
}
