/**
 * Opciones del menú lateral y qué roles pueden ver cada una.
 * Los permisos son los mismos que define el backend en SecurityConfig.java:
 * si cambian allá, hay que actualizarlos aquí.
 */
export const TODOS = ['ADMIN', 'ANALISTA', 'SUPERVISOR', 'OPERADOR']

export const MENU = [
  { grupo: 'Monitoreo' },
  { ruta: '/', texto: 'Dashboard', icono: 'dashboard', roles: TODOS },
  { ruta: '/alertas', texto: 'Alertas', icono: 'alerta', roles: TODOS },
  { ruta: '/transacciones', texto: 'Transacciones', icono: 'transaccion', roles: TODOS },
  { ruta: '/casos', texto: 'Casos', icono: 'caso', roles: ['ANALISTA', 'SUPERVISOR'] },
  { ruta: '/atencion', texto: 'Atención al cliente', icono: 'telefono', roles: ['OPERADOR', 'ANALISTA'] },

  { grupo: 'Catálogos' },
  { ruta: '/clientes', texto: 'Clientes y tarjetas', icono: 'cliente', roles: TODOS },
  { ruta: '/comercios', texto: 'Comercios', icono: 'comercio', roles: TODOS },

  { grupo: 'Motor de riesgo' },
  { ruta: '/reglas', texto: 'Reglas', icono: 'regla', roles: ['ADMIN', 'ANALISTA', 'SUPERVISOR'] },
  { ruta: '/lista-negra', texto: 'Lista negra', icono: 'prohibido', roles: ['ADMIN', 'ANALISTA', 'SUPERVISOR'] },
  { ruta: '/modelo', texto: 'Modelo de IA', icono: 'ia', roles: ['ADMIN', 'ANALISTA', 'SUPERVISOR'] },
  { ruta: '/simulador', texto: 'Simulador', icono: 'simulador', roles: ['ADMIN'] },

  { grupo: 'Gestión' },
  { ruta: '/reportes', texto: 'Reportes', icono: 'reporte', roles: ['ADMIN', 'SUPERVISOR'] },
  { ruta: '/auditoria', texto: 'Auditoría', icono: 'auditoria', roles: ['ADMIN', 'SUPERVISOR', 'ANALISTA'] },
  { ruta: '/usuarios', texto: 'Usuarios', icono: 'usuarios', roles: ['ADMIN'] },
]

/** Permisos de acciones concretas (botones), también tomados de SecurityConfig.java. */
export const PERMISOS = {
  decidirAlerta: ['ANALISTA'],
  escalarAlerta: ['ANALISTA', 'SUPERVISOR'],
  asignarAlerta: ['ADMIN', 'SUPERVISOR', 'ANALISTA'],
  tomarAlerta: ['ANALISTA', 'OPERADOR'],
  comentarAlerta: ['ANALISTA', 'SUPERVISOR'],
  registrarAtencion: ['OPERADOR'],
  reenviarNotificacion: ['OPERADOR', 'ANALISTA'],
  editarCatalogos: ['ADMIN'],
  editarReglas: ['ADMIN'],
  agregarListaNegra: ['ADMIN', 'ANALISTA'],
  gestionarListaNegra: ['ADMIN'],
  editarModelo: ['ADMIN'],
  verAccesos: ['ADMIN'],
  crearCaso: ['ANALISTA', 'SUPERVISOR'],
}
