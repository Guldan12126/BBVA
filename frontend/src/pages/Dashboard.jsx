import { useAuth } from '../auth/AuthContext'
import DashboardAdmin from './dashboards/DashboardAdmin'
import DashboardAnalista from './dashboards/DashboardAnalista'
import DashboardOperador from './dashboards/DashboardOperador'
import DashboardSupervisor from './dashboards/DashboardSupervisor'

/**
 * Página de inicio: cada rol tiene su propio dashboard con lo que necesita para su trabajo.
 *   ANALISTA   -> dashboard-analista   (su cola de trabajo y productividad)
 *   OPERADOR   -> dashboard-operador   (clientes por llamar y sus llamadas)
 *   SUPERVISOR -> dashboard-supervisor (escaladas, equipo y tasa de fraude)
 *   ADMIN      -> dashboard-admin      (estado del sistema y configuración)
 */
const POR_ROL = {
  ANALISTA: DashboardAnalista,
  OPERADOR: DashboardOperador,
  SUPERVISOR: DashboardSupervisor,
  ADMIN: DashboardAdmin,
}

export default function Dashboard() {
  const { usuario } = useAuth()
  const Pagina = POR_ROL[usuario.rol] || DashboardAnalista
  return (
    <div className={`dashboard dashboard-${usuario.rol.toLowerCase()}`}>
      <Pagina />
    </div>
  )
}
