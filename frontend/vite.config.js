import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El "proxy" reenvía /api y /ws al backend de Spring Boot (puerto 8080).
// Así el navegador cree que todo viene del mismo servidor y no hay problemas de CORS.
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: false },
      '/ws': { target: BACKEND, ws: true, changeOrigin: false },
    },
  },
})
