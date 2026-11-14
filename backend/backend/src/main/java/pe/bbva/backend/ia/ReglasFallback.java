package pe.bbva.backend.ia;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static pe.bbva.backend.ia.FeatureBuilder.*;

/**
 * Respaldo cuando el microservicio de IA no responde: calcula un score aproximado
 * con reglas simples para que el sistema siga funcionando (requisito de disponibilidad).
 */
@Component
public class ReglasFallback {

    public static final String VERSION = "reglas-respaldo";

    public ModeloIaClient.PrediccionResponse evaluar(Map<String, Object> v) {
        List<ModeloIaClient.Factor> factores = new ArrayList<>();
        double score = 0.05;

        double ratio = numero(v, RATIO_MONTO);
        if (ratio >= 3) {
            double aporte = ratio >= 6 ? 0.40 : 0.25;
            score += aporte;
            factores.add(new ModeloIaClient.Factor(RATIO_MONTO, "Importe inusual para el cliente", aporte));
        }
        double distancia = numero(v, DISTANCIA);
        if (distancia >= 300) {
            double aporte = distancia >= 2000 ? 0.30 : 0.20;
            score += aporte;
            factores.add(new ModeloIaClient.Factor(DISTANCIA, "Ubicación atípica", aporte));
        }
        if (numero(v, TX_ULTIMA_HORA) >= 4) {
            score += 0.15;
            factores.add(new ModeloIaClient.Factor(TX_ULTIMA_HORA, "Frecuencia elevada de compras", 0.15));
        }
        if (booleano(v, ES_MADRUGADA)) {
            score += 0.10;
            factores.add(new ModeloIaClient.Factor(HORA, "Compra en horario inusual", 0.10));
        }
        double riesgoCategoria = numero(v, RIESGO_CATEGORIA);
        if (booleano(v, COMERCIO_NUEVO) && riesgoCategoria >= 0.45) {
            score += 0.10;
            factores.add(new ModeloIaClient.Factor(CATEGORIA, "Comercio nuevo de alto riesgo", 0.10));
        }
        if (booleano(v, INTERNACIONAL)) {
            score += 0.10;
            factores.add(new ModeloIaClient.Factor(INTERNACIONAL, "Compra internacional", 0.10));
        }
        score = Math.min(score, 0.99);
        return new ModeloIaClient.PrediccionResponse(String.valueOf(v.get("transaccion_id")), score,
                null, VERSION, 0L, factores);
    }
}
