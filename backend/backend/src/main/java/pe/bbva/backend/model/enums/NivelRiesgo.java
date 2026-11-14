package pe.bbva.backend.model.enums;

public enum NivelRiesgo {
    BAJO, MEDIO, ALTO, CRITICO;

    /**
     * Convierte un score (0 a 1) en nivel de riesgo.
     * BAJO: menor a 0.40 | MEDIO: menor al umbral de alerta | ALTO: menor al umbral crítico | CRITICO: el resto
     */
    public static NivelRiesgo desdeScore(double score, double umbralAlerta, double umbralCritico) {
        if (score >= umbralCritico) return CRITICO;
        if (score >= umbralAlerta) return ALTO;
        if (score >= 0.40) return MEDIO;
        return BAJO;
    }
}
