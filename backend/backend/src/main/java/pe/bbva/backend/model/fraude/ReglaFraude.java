package pe.bbva.backend.model.fraude;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.base.Auditable;
import pe.bbva.backend.model.enums.*;

/** Regla configurable del motor de riesgo. 'peso' es lo que suma al score si se cumple. */
@Entity
@Table(name = "reglas_fraude")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ReglaFraude extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 300)
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoRegla tipo;

    @Column(nullable = false)
    private Double valorUmbral;

    @Column(nullable = false)
    private Double peso;

    @Column(nullable = false)
    private Boolean activa = true;

    public ReglaFraude() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public TipoRegla getTipo() {
        return tipo;
    }

    public void setTipo(TipoRegla tipo) {
        this.tipo = tipo;
    }

    public Double getValorUmbral() {
        return valorUmbral;
    }

    public void setValorUmbral(Double valorUmbral) {
        this.valorUmbral = valorUmbral;
    }

    public Double getPeso() {
        return peso;
    }

    public void setPeso(Double peso) {
        this.peso = peso;
    }

    public Boolean getActiva() {
        return activa;
    }

    public void setActiva(Boolean activa) {
        this.activa = activa;
    }
}
