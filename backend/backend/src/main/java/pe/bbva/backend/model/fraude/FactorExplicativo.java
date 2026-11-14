package pe.bbva.backend.model.fraude;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;

/** Motivo que explica la alerta (por ejemplo: ubicación atípica, importe inusual). */
@Entity
@Table(name = "factores_explicativos")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FactorExplicativo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alerta_id", nullable = false)
    @JsonBackReference
    private Alerta alerta;

    @Column(nullable = false, length = 60)
    private String factor;

    @Column(nullable = false, length = 200)
    private String descripcion;

    private Double impacto;

    public FactorExplicativo() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Alerta getAlerta() {
        return alerta;
    }

    public void setAlerta(Alerta alerta) {
        this.alerta = alerta;
    }

    public String getFactor() {
        return factor;
    }

    public void setFactor(String factor) {
        this.factor = factor;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Double getImpacto() {
        return impacto;
    }

    public void setImpacto(Double impacto) {
        this.impacto = impacto;
    }

    public FactorExplicativo(String factor, String descripcion, Double impacto) {
        this.factor = factor;
        this.descripcion = descripcion;
        this.impacto = impacto;
    }
}
