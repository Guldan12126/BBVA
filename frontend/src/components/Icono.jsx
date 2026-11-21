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
  sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  luna: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  llave: 'M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7z',
  correo: 'M3 5h18v14H3zM3 6l9 7 9-7',
  candado: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'ojo-cerrado': 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  flecha: 'M5 12h14M13 6l6 6-6 6',
  'flecha-izq': 'M19 12H5M11 6l-6 6 6 6',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12l3 3 5-6',
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  actividad: 'M3 12h4l3-8 4 16 3-8h4',
  campana: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0',
  'escudo-alerta': 'M12 3l8 3v6c0 5-3.5 8.5-8 9.5C7.5 20.5 4 17 4 12V6l8-3zM12 8v4M12 15.5h.01',
  'escudo-ok': 'M12 3l8 3v6c0 5-3.5 8.5-8 9.5C7.5 20.5 4 17 4 12V6l8-3zM9 12l2 2 4-4',
  rayo: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  tarjeta: 'M3 6h18v12H3zM3 10h18M7 15h3M16 4.5 8 19.5',
  actualizar: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4',
  calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chevron: 'M9 6l6 6-6 6',
  camara: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  subir: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  basura: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  buscar: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  documento: 'M3 5h18v14H3zM9 9.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5.5 16.5a3.5 3.5 0 0 1 7 0M15 10h3M15 13h3',
  bandeja: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5',
  circulo: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
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
