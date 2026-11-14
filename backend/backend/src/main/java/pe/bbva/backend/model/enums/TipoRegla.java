package pe.bbva.backend.model.enums;

public enum TipoRegla {
    MONTO("Monto mayor al umbral"),
    RATIO_MONTO("Monto muy superior al promedio del cliente"),
    UBICACION("Distancia a la ciudad habitual mayor al umbral (km)"),
    FRECUENCIA("Cantidad de transacciones en la última hora"),
    HORARIO("Compra en madrugada (hora menor al umbral)"),
    COMERCIO_RIESGO("Comercio de categoría o nivel de riesgo alto");

    private final String descripcion;

    TipoRegla(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getDescripcion() {
        return descripcion;
    }
}
