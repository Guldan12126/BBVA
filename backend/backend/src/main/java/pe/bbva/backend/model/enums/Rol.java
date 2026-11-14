package pe.bbva.backend.model.enums;

public enum Rol {
    ADMIN("Administrador del Sistema"),
    ANALISTA("Analista de Fraude"),
    SUPERVISOR("Supervisor de Agencia"),
    OPERADOR("Operador de Atención al Cliente");

    private final String descripcion;

    Rol(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getDescripcion() {
        return descripcion;
    }
}
