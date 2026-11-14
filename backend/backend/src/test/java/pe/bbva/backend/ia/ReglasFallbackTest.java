package pe.bbva.backend.ia;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ReglasFallbackTest {

    private final ReglasFallback fallback = new ReglasFallback();

    @Test
    void compraNormalTieneScoreBajo() {
        Map<String, Object> v = new HashMap<>();
        v.put("transaccion_id", "TX-1");
        v.put(FeatureBuilder.RATIO_MONTO, 1.1);
        v.put(FeatureBuilder.DISTANCIA, 5.0);
        v.put(FeatureBuilder.TX_ULTIMA_HORA, 0);
        v.put(FeatureBuilder.ES_MADRUGADA, false);
        assertThat(fallback.evaluar(v).score()).isLessThan(0.40);
    }

    @Test
    void compraAtipicaTieneScoreAlto() {
        Map<String, Object> v = new HashMap<>();
        v.put("transaccion_id", "TX-2");
        v.put(FeatureBuilder.RATIO_MONTO, 7.0);
        v.put(FeatureBuilder.DISTANCIA, 5000.0);
        v.put(FeatureBuilder.TX_ULTIMA_HORA, 5);
        v.put(FeatureBuilder.ES_MADRUGADA, true);
        v.put(FeatureBuilder.INTERNACIONAL, true);
        ModeloIaClient.PrediccionResponse r = fallback.evaluar(v);
        assertThat(r.score()).isGreaterThanOrEqualTo(0.90);
        assertThat(r.factores()).isNotEmpty();
    }
}
