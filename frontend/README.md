# Frontend – Sistema de Detección de Fraude (Agencia Piura)

React 18 + Vite · React Router · Axios · STOMP (WebSocket) · Recharts.
Escrito en JavaScript simple (sin TypeScript) y con CSS propio, sin librerías de componentes.

## 1. Requisitos

- **Node.js 18 o superior** (`node -v`). Descárgalo de https://nodejs.org (versión LTS).
- El **backend** corriendo en http://localhost:8080 (ver `backend/backend/README.md`).

## 2. Instalar y ejecutar

```powershell
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 e inicia sesión con un usuario demo (contraseña `Bbva2026`):

| Correo | Rol | Qué puede hacer |
|---|---|---|
| admin@bbva.pe | Administrador | Todo: usuarios, simulador, reglas, parámetros del modelo, catálogos |
| analista@bbva.pe | Analista de Fraude | Revisar alertas, decidir fraude / falso positivo, casos, comentarios |
| supervisor@bbva.pe | Supervisor | Dashboard, reportes, asignar y escalar alertas, casos |
| operador@bbva.pe | Operador de Atención | Llamar a clientes, registrar la llamada, bloquear tarjetas |

> **Para la demo:** entra como admin, ve a **Simulador** y genera un lote con 20 % de fraude.
> Verás llegar las alertas en vivo (avisos abajo a la derecha). Luego entra como analista
> y decide sobre ellas desde **Alertas**.

## 3. ¿Cómo se conecta con el backend?

- En desarrollo, Vite reenvía todo lo que empieza con `/api` y `/ws` al backend (ver `vite.config.js`).
  Por eso en el código las URLs son relativas, por ejemplo `api.get('/api/alertas/cola')`.
- Si el backend está en otra dirección: `BACKEND_URL=http://otra-ip:8080 npm run dev`.
- Al hacer login se guardan el `accessToken` y el `refreshToken`. Cuando el token vence,
  `src/api/client.js` pide uno nuevo automáticamente con `/api/auth/refresh`.
- Las alertas en tiempo real llegan por WebSocket (STOMP en `/ws`, canales `/topic/alertas`
  y `/topic/transacciones`), en `src/hooks/useTiempoReal.js`.

## 4. Estructura del proyecto

```
src/
├── main.jsx              Punto de entrada
├── App.jsx               Rutas (qué página se muestra en cada URL) y protección por rol
├── menu.js               Opciones del menú y permisos por rol (copiados de SecurityConfig.java)
├── styles.css            Todos los estilos (colores en variables al inicio)
├── api/client.js         Axios: token, renovación automática y mensajes de error
├── auth/AuthContext.jsx  Usuario logueado: login(), logout(), tieneRol()
├── hooks/
│   ├── useApi.js         Cargar datos de un GET con "cargando" y "error"
│   └── useTiempoReal.js  Conexión WebSocket
├── components/
│   ├── Layout.jsx        Menú lateral, barra superior y avisos en vivo
│   ├── UI.jsx            Piezas reutilizables: Badge, Modal, Paginacion, Campo, Kpi…
│   └── Icono.jsx         Íconos SVG
├── utils/formato.js      Formato de soles y fechas, textos de los enums, colores
└── pages/                Una pantalla por archivo
    ├── Login, RecuperarPassword, Perfil
    ├── Dashboard
    ├── Alertas, AlertaDetalle        (cola de trabajo y decisión del analista)
    ├── Transacciones, TransaccionDetalle
    ├── Casos, CasoDetalle
    ├── Atencion                      (operador: clientes por llamar)
    ├── Clientes, ClienteDetalle, Comercios
    ├── Reglas, ListaNegra, Modelo, Simulador
    ├── Reportes, Auditoria, Usuarios
    └── ValidarCompra                 (página PÚBLICA "¿Reconoces esta compra?")
```

## 5. Cómo agregar una pantalla nueva

1. Crea `src/pages/MiPantalla.jsx`. Para leer datos usa el hook:
   ```jsx
   const { datos, cargando, error, recargar } = useApi('/api/lo-que-sea', { filtro: 'x' })
   ```
   Para guardar: `await api.post('/api/lo-que-sea', cuerpo)` dentro de un `try/catch`,
   y muestra el error con `mensajeError(e)`.
2. Agrégala en `PAGINAS` dentro de `src/App.jsx`.
3. Agrégala al menú en `src/menu.js` con los roles que pueden verla.

## 6. Portal del cliente

Cuando una compra genera alerta, el backend envía al cliente un enlace
`http://localhost:5173/validar-compra/<token>`. Mientras `app.mail-enabled=false`, ese enlace
aparece en la consola del backend (línea "Enlace de validación para el cliente…"). Ábrelo en
el navegador para probar las respuestas "Sí, fui yo" / "No la reconozco".

## 7. Compilar para producción

```powershell
npm run build
```

Genera la carpeta `dist/` con archivos estáticos. En producción hay que servirlos detrás del
mismo dominio que el backend (o configurar `VITE_API_URL` y `VITE_WS_URL` antes de compilar).
