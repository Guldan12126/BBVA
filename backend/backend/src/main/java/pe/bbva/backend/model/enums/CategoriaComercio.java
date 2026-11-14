package pe.bbva.backend.model.enums;

/** Categorías de comercio con un riesgo base usado por el motor de reglas. */
public enum CategoriaComercio {
    SUPERMERCADO(0.05),
    RESTAURANTE(0.05),
    FARMACIA(0.05),
    COMBUSTIBLE(0.10),
    ROPA(0.15),
    SERVICIOS(0.10),
    ENTRETENIMIENTO(0.25),
    TECNOLOGIA(0.45),
    VIAJES(0.50),
    CASINO(0.70);

    private final double riesgoBase;

    CategoriaComercio(double riesgoBase) {
        this.riesgoBase = riesgoBase;
    }

    public double getRiesgoBase() {
        return riesgoBase;
    }

    public boolean esAltoRiesgo() {
        return riesgoBase >= 0.45;
    }
}
