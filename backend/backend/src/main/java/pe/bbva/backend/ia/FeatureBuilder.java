package pe.bbva.backend.ia;

import org.springframework.stereotype.Component;
import pe.bbva.backend.model.cliente.Comercio;
import pe.bbva.backend.model.cliente.PerfilCliente;
import pe.bbva.backend.model.enums.Canal;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.util.GeoUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Arma las variables que recibe el modelo de Machine Learning.
 * Los nombres deben coincidir con los que usa fraude-ml (Python).
 */
@Component
public class FeatureBuilder {

    public static final String MONTO = "monto";
    public static final String RATIO_MONTO = "ratio_monto_promedio";
    public static final String HORA = "hora";
    public static final String ES_MADRUGADA = "es_madrugada";
    public static final String DIA_SEMANA = "dia_semana";
    public static final String CANAL = "canal";
    public static final String CATEGORIA = "categoria_comercio";
    public static final String DISTANCIA = "distancia_ubicacion_habitual_km";
    public static final String TX_ULTIMA_HORA = "transacciones_ultima_hora";
    public static final String COMERCIO_NUEVO = "es_comercio_nuevo";
    public static final String INTERNACIONAL = "es_internacional";
    public static final String RIESGO_CATEGORIA = "riesgo_categoria";

    public Map<String, Object> construir(Transaccion tx, PerfilCliente perfil,
                                         long transaccionesUltimaHora, boolean comercioNuevo) {
        Comercio comercio = tx.getComercio();
        double monto = tx.getMonto().doubleValue();
        double promedio = perfil.getMontoPromedio() == null ? 0 : perfil.getMontoPromedio().doubleValue();
        double ratio = promedio > 0 ? monto / promedio : 1.0;
        int hora = tx.getFechaHora().getHour();
        double distancia = GeoUtils.distanciaKm(tx.getLatitud(), tx.getLongitud(),
                perfil.getLatitudHabitual(), perfil.getLongitudHabitual());

        Map<String, Object> v = new LinkedHashMap<>();
        v.put("transaccion_id", tx.getCodigo());
        v.put(MONTO, monto);
        v.put(RATIO_MONTO, redondear(ratio));
        v.put(HORA, hora);
        v.put(ES_MADRUGADA, hora < 6);
        v.put(DIA_SEMANA, tx.getFechaHora().getDayOfWeek().getValue());
        v.put(CANAL, tx.getCanal().name());
        v.put(CATEGORIA, comercio.getCategoria().name());
        v.put(RIESGO_CATEGORIA, comercio.getCategoria().getRiesgoBase());
        v.put(DISTANCIA, redondear(distancia));
        v.put(TX_ULTIMA_HORA, transaccionesUltimaHora);
        v.put(COMERCIO_NUEVO, comercioNuevo);
        v.put(INTERNACIONAL, Boolean.TRUE.equals(comercio.getInternacional()));
        v.put("es_no_presencial", tx.getCanal() == Canal.ECOMMERCE || tx.getCanal() == Canal.APP_MOVIL);
        return v;
    }

    private static double redondear(double valor) {
        return BigDecimal.valueOf(valor).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    public static double numero(Map<String, Object> v, String clave) {
        Object o = v.get(clave);
        return o instanceof Number n ? n.doubleValue() : 0.0;
    }

    public static boolean booleano(Map<String, Object> v, String clave) {
        return Boolean.TRUE.equals(v.get(clave));
    }
}
