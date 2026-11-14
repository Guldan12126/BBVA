# Backend – Sistema de Detección de Fraude en Tarjetas con IA y ML (BBVA Piura)

Spring Boot 4.1 · Java 21 · PostgreSQL · JWT · WebSocket · Microservicio de IA en FastAPI.
Sin Lombok, sin carpeta `dto` (los request/response son `record` dentro de cada controller) y sin Flyway
(Hibernate crea las tablas solo con `ddl-auto=update`).

## 1. Requisitos

- JDK 21 (`java -version`)
- PostgreSQL corriendo en el puerto 5432
- (Opcional) el microservicio `fraude-ml` en http://localhost:8000. Si no está encendido, el sistema
  sigue funcionando con las reglas de respaldo (`ia/ReglasFallback`).

## 2. Crear la base de datos (solo la base, las tablas se crean solas)

```sql
CREATE DATABASE bbva_fraude;
```

Si tu usuario/contraseña de PostgreSQL no es `postgres/postgres`, cámbialo en
`src/main/resources/application-dev.properties`.

## 3. Ejecutar

```powershell
.\mvnw spring-boot:run
```

Al iniciar, `config/DataInitializer` carga: 5 usuarios, 8 clientes con 12 tarjetas, 12 comercios,
6 reglas, parámetros del modelo y ~100 transacciones de ejemplo con alertas.

- Swagger: http://localhost:8080/swagger-ui.html
- Para probar: `POST /api/auth/login`, copia el `accessToken` y pégalo en el botón **Authorize**.

## 4. Usuarios demo (contraseña: `Bbva2026`)

| Correo | Rol |
|---|---|
| admin@bbva.pe | Administrador del Sistema |
| analista@bbva.pe | Analista de Fraude |
| supervisor@bbva.pe | Supervisor de Agencia |
| operador@bbva.pe | Operador de Atención al Cliente |
| analista2@bbva.pe | Analista de Fraude |

## 5. Recuperar contraseña (código de verificación)

1. `POST /api/auth/forgot-password` `{ "correo": "operador@bbva.pe" }`
2. Mientras `app.mail-enabled=false`, el código de 6 dígitos **aparece en la consola**.
   Para enviarlo de verdad por Gmail: pon `app.mail-enabled=true` y la contraseña de aplicación en
   `spring.mail.password` (o variable de entorno `MAIL_PASSWORD`).
3. `POST /api/auth/verify-code` `{ "correo": "...", "codigo": "482913" }` → devuelve `resetToken`
4. `POST /api/auth/reset-password` `{ "resetToken": "...", "nuevaPassword": "Nueva2026", "confirmarPassword": "Nueva2026" }`

Reglas: el código vence en 10 minutos, 3 intentos, 1 solicitud por minuto y se guarda cifrado.

## 6. Flujo de una transacción

`POST /api/transacciones` (o `POST /api/simulador/transaccion?fraude=true`)
→ `MotorRiesgoService`: lista negra + reglas + IA (`/predict` en FastAPI) → score de 0 a 1

| Score | Resultado |
|---|---|
| menor a 0.70 | APROBADA |
| 0.70 a 0.90 | EN_REVISION + alerta + notificación al cliente |
| mayor a 0.90 | BLOQUEADA + bloqueo preventivo de la tarjeta + alerta |

El dashboard en React recibe las alertas en tiempo real por WebSocket:
conectar a `ws://localhost:8080/ws` (STOMP) y suscribirse a `/topic/alertas` y `/topic/transacciones`.

## 7. Endpoints principales

| Módulo | Ruta |
|---|---|
| Autenticación | `/api/auth/login` · `/refresh` · `/logout` · `/me` · `/forgot-password` · `/verify-code` · `/reset-password` |
| Usuarios (Admin) | `/api/usuarios` |
| Clientes / tarjetas / comercios | `/api/clientes` · `/api/tarjetas` · `/api/comercios` |
| Transacciones | `/api/transacciones` · `/api/simulador` |
| Alertas | `/api/alertas` · `/cola` · `/mias` · `/{id}/decision` · `/{id}/escalar` · `/{id}/comentarios` |
| Casos | `/api/casos` |
| Reglas y lista negra | `/api/reglas` · `/api/lista-negra` |
| Portal del cliente (público) | `/api/public/validar-compra/{token}` |
| Atención al cliente | `/api/atencion` · `/api/notificaciones` |
| Modelo ML | `/api/modelo/estado` · `/versiones` · `/reentrenar` · `/api/parametros` |
| Dashboard y reportes | `/api/dashboard/resumen` · `/api/reportes` · `/api/reportes/{id}/descargar` |
| Auditoría | `/api/auditoria` · `/api/auditoria/accesos` |

## 8. Contrato con el microservicio de IA (FastAPI)

`POST /predict` (header `X-API-KEY`):

```json
{ "transaccion_id": "TX-8F3A21C9", "monto": 4850.0, "ratio_monto_promedio": 6.2, "hora": 3,
  "es_madrugada": true, "dia_semana": 2, "canal": "ECOMMERCE", "categoria_comercio": "TECNOLOGIA",
  "riesgo_categoria": 0.45, "distancia_ubicacion_habitual_km": 970.5, "transacciones_ultima_hora": 5,
  "es_comercio_nuevo": true, "es_internacional": false, "es_no_presencial": true }
```

Respuesta esperada:

```json
{ "transaccion_id": "TX-8F3A21C9", "score": 0.94, "nivel_riesgo": "CRITICO", "version_modelo": "xgboost-v1",
  "tiempo_ms": 18, "factores": [ { "factor": "distancia_ubicacion_habitual_km", "descripcion": "Ubicación atípica", "impacto": 0.41 } ] }
```

También se usan `GET /health`, `GET /model/info` y `POST /train` (`{ "muestras": [ ...variables + "es_fraude" ] }`).

## 9. Tests

```powershell
.\mvnw test
```

Los tests usan una base H2 en memoria (solo en `test`), no tocan tu PostgreSQL.
