/** Funciones para mostrar datos de forma legible. */

const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

export function moneda(valor, codigo = 'PEN') {
  if (valor === null || valor === undefined) return '—'
  if (codigo && codigo !== 'PEN') {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: codigo }).format(valor)
  }
  return soles.format(valor)
}

export function fechaHora(valor) {
  if (!valor) return '—'
  const d = new Date(valor)
  if (isNaN(d)) return valor
  return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

export function fecha(valor) {
  if (!valor) return '—'
  // "2026-11-15" se interpreta como fecha local, no UTC
  const d = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor)
  if (isNaN(d)) return valor
  return d.toLocaleDateString('es-PE')
}

export function porcentaje(valor, decimales = 0) {
  if (valor === null || valor === undefined) return '—'
  return `${(valor * 100).toFixed(decimales)}%`
}

export function numero(valor) {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('es-PE').format(valor)
}

/** Textos amigables para los valores de los enums del backend. */
export const ETIQUETAS = {
  // Roles
  ADMIN: 'Administrador',
  ANALISTA: 'Analista de Fraude',
  SUPERVISOR: 'Supervisor de Agencia',
  OPERADOR: 'Operador de Atención',
  // Niveles de riesgo
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  CRITICO: 'Crítico',
  // Estados de alerta
  PENDIENTE: 'Pendiente',
  ASIGNADA: 'Asignada',
  EN_REVISION: 'En revisión',
  CONFIRMADA: 'Fraude confirmado',
  DESCARTADA: 'Falso positivo',
  ESCALADA: 'Escalada',
  // Prioridad
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
  // Transacciones
  APROBADA: 'Aprobada',
  BLOQUEADA: 'Bloqueada',
  RECHAZADA: 'Rechazada',
  LEGITIMA: 'Legítima',
  SOSPECHOSA: 'Sospechosa',
  FRAUDULENTA: 'Fraudulenta',
  // Canales
  POS: 'POS',
  ATM: 'Cajero',
  ECOMMERCE: 'E-commerce',
  APP_MOVIL: 'App móvil',
  // Tarjetas
  ACTIVA: 'Activa',
  BLOQUEADA_TEMPORAL: 'Bloqueo temporal',
  CANCELADA: 'Cancelada',
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  // Usuarios
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  BLOQUEADO: 'Bloqueado',
  // Casos
  ABIERTO: 'Abierto',
  EN_INVESTIGACION: 'En investigación',
  CERRADO: 'Cerrado',
  // Notificaciones
  ENVIADA: 'Enviada',
  RECONOCIDA: 'Reconocida',
  NO_RECONOCIDA: 'No reconocida',
  EXPIRADA: 'Expirada',
  // Atención
  CLIENTE_CONFIRMA: 'Cliente confirma la compra',
  CLIENTE_NIEGA: 'Cliente niega la compra',
  NO_CONTESTA: 'No contesta',
  // Modelo
  ENTRENANDO: 'Entrenando',
  RETIRADO: 'Retirado',
}

export function etiqueta(valor) {
  if (valor === null || valor === undefined) return '—'
  return ETIQUETAS[valor] || String(valor).replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

/** Valores de los enums (para llenar los <select>). */
export const ENUMS = {
  nivelRiesgo: ['BAJO', 'MEDIO', 'ALTO', 'CRITICO'],
  estadoAlerta: ['PENDIENTE', 'ASIGNADA', 'EN_REVISION', 'ESCALADA', 'CONFIRMADA', 'DESCARTADA'],
  estadoTransaccion: ['APROBADA', 'PENDIENTE', 'EN_REVISION', 'BLOQUEADA', 'RECHAZADA'],
  clasificacion: ['LEGITIMA', 'SOSPECHOSA', 'FRAUDULENTA'],
  canal: ['POS', 'ATM', 'ECOMMERCE', 'APP_MOVIL'],
  prioridad: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'],
  estadoCaso: ['ABIERTO', 'EN_INVESTIGACION', 'CERRADO'],
  estadoTarjeta: ['ACTIVA', 'BLOQUEADA_TEMPORAL', 'BLOQUEADA', 'CANCELADA'],
  tipoTarjeta: ['CREDITO', 'DEBITO'],
  categoriaComercio: ['SUPERMERCADO', 'RESTAURANTE', 'FARMACIA', 'COMBUSTIBLE', 'ROPA', 'SERVICIOS',
    'ENTRETENIMIENTO', 'TECNOLOGIA', 'VIAJES', 'CASINO'],
  rol: ['ADMIN', 'ANALISTA', 'SUPERVISOR', 'OPERADOR'],
  estadoUsuario: ['ACTIVO', 'INACTIVO', 'BLOQUEADO'],
  tipoListaNegra: ['TARJETA', 'COMERCIO', 'IP', 'DISPOSITIVO'],
  tipoReporte: ['DIARIO', 'SEMANAL', 'MENSUAL', 'PERSONALIZADO'],
  resultadoAtencion: ['CLIENTE_CONFIRMA', 'CLIENTE_NIEGA', 'NO_CONTESTA'],
  tipoAccion: ['LOGIN', 'LOGOUT', 'CAMBIO_PASSWORD', 'CREAR_USUARIO', 'ACTUALIZAR_USUARIO', 'ASIGNAR_ALERTA',
    'CONFIRMAR_FRAUDE', 'DESCARTAR_ALERTA', 'ESCALAR_ALERTA', 'COMENTAR_ALERTA', 'BLOQUEAR_TARJETA',
    'DESBLOQUEAR_TARJETA', 'ATENCION_CLIENTE', 'RESPUESTA_CLIENTE', 'ACTUALIZAR_PARAMETRO', 'ACTUALIZAR_REGLA',
    'LISTA_NEGRA', 'REENTRENAR_MODELO', 'GENERAR_REPORTE', 'CREAR_CASO', 'CERRAR_CASO'],
}

/** Clase de color (badge) para cada valor. */
export function tono(valor) {
  switch (valor) {
    case 'CRITICO': case 'URGENTE': case 'BLOQUEADA': case 'FRAUDULENTA': case 'CONFIRMADA':
    case 'NO_RECONOCIDA': case 'CLIENTE_NIEGA': case 'BLOQUEADO': case 'CANCELADA': case 'RECHAZADA':
      return 'rojo'
    case 'ALTO': case 'ALTA': case 'ESCALADA': case 'BLOQUEADA_TEMPORAL': case 'SOSPECHOSA':
      return 'naranja'
    case 'MEDIO': case 'MEDIA': case 'EN_REVISION': case 'PENDIENTE': case 'ASIGNADA': case 'ENVIADA':
    case 'EN_INVESTIGACION': case 'ENTRENANDO': case 'NO_CONTESTA':
      return 'amarillo'
    case 'BAJO': case 'BAJA': case 'APROBADA': case 'LEGITIMA': case 'ACTIVA': case 'ACTIVO': case 'DESCARTADA':
    case 'RECONOCIDA': case 'CLIENTE_CONFIRMA':
      return 'verde'
    default:
      return 'gris'
  }
}

/** Para enviar fechas a la API en formato yyyy-mm-dd. */
export function hoyISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Descarga un archivo binario que devolvió la API. */
export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
