package pe.bbva.backend.util;

/** Valores fijos usados en todo el backend. */
public final class Constantes {

    private Constantes() {
    }

    public static final String ZONA_HORARIA = "America/Lima";

    /** Rutas que no necesitan token. */
    public static final String[] RUTAS_PUBLICAS = {
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/forgot-password",
            "/api/auth/verify-code",
            "/api/auth/reset-password",
            "/api/public/**",
            "/ws/**",
            "/ws-sockjs/**",
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/v3/api-docs/**",
            "/error"
    };

    // Canales WebSocket a los que se suscribe el dashboard (React)
    public static final String TOPIC_ALERTAS = "/topic/alertas";
    public static final String TOPIC_TRANSACCIONES = "/topic/transacciones";

    // Claves de la tabla parametros_modelo
    public static final String PARAM_UMBRAL_ALERTA = "UMBRAL_ALERTA";
    public static final String PARAM_UMBRAL_CRITICO = "UMBRAL_CRITICO";
    public static final String PARAM_PESO_IA = "PESO_IA";
    public static final String PARAM_VERSION_MODELO = "VERSION_MODELO_ACTIVA";

    // Seguridad
    public static final int MAX_INTENTOS_LOGIN = 5;
    public static final int MINUTOS_BLOQUEO_LOGIN = 15;
    public static final String USUARIO_SISTEMA = "SISTEMA";
}
