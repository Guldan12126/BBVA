/** Íconos simples en SVG (trazos de 24x24). */
const TRAZOS = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  alerta: 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
  transaccion: 'M3 6h18v12H3zM3 10h18M7 15h4',
  caso: 'M4 7h16v13H4zM9 7V4h6v3',
  telefono: 'M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z',
  cliente: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  comercio: 'M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6',
  regla: 'M4 6h16M4 12h10M4 18h6M18 14l2 2-4 4-2-2z',
  prohibido: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8',
  ia: 'M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3M6 6h12v12H6zM10 10h4v4h-4z',
  simulador: 'M5 3l14 9-14 9V3z',
  reporte: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  auditoria: 'M12 3l8 3v6c0 5-3.5 8.5-8 9.5C7.5 20.5 4 17 4 12V6l8-3zM9 12l2 2 4-4',
  usuarios: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  salir: 'M15 3h4v18h-4M10 17l5-5-5-5M15 12H3',
  menu: 'M3 6h18M3 12h18M3 18h18',
  llave: 'M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7z',
}

export default function Icono({ nombre, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={TRAZOS[nombre] || ''} />
    </svg>
  )
}
