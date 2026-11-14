package pe.bbva.backend.model.fraude;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.base.Auditable;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.seguridad.*;
import pe.bbva.backend.model.transaccion.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Alerta generada cuando el score supera el umbral de riesgo. */
@Entity
@Table(name = "alertas")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Alerta extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 25)
    private String codigo;

    @OneToOne
    @JoinColumn(name = "transaccion_id", nullable = false, unique = true)
    private Transaccion transaccion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private NivelRiesgo nivelRiesgo;

    @Column(nullable = false)
    private Double probabilidad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoAlerta estado = EstadoAlerta.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Prioridad prioridad = Prioridad.MEDIA;

    @ManyToOne
    @JoinColumn(name = "asignado_a_id")
    private Usuario asignadoA;

    @ManyToOne
    @JoinColumn(name = "caso_id")
    @JsonIgnoreProperties({"cliente", "responsable", "hibernateLazyInitializer", "handler"})
    private Caso caso;

    @OneToMany(mappedBy = "alerta", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<FactorExplicativo> factores = new ArrayList<>();

    private LocalDateTime fechaDecision;

    @Column(length = 500)
    private String comentarioDecision;

    @ManyToOne
    @JoinColumn(name = "decidido_por_id")
    private Usuario decididoPor;

    public Alerta() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public Transaccion getTransaccion() {
        return transaccion;
    }

    public void setTransaccion(Transaccion transaccion) {
        this.transaccion = transaccion;
    }

    public NivelRiesgo getNivelRiesgo() {
        return nivelRiesgo;
    }

    public void setNivelRiesgo(NivelRiesgo nivelRiesgo) {
        this.nivelRiesgo = nivelRiesgo;
    }

    public Double getProbabilidad() {
        return probabilidad;
    }

    public void setProbabilidad(Double probabilidad) {
        this.probabilidad = probabilidad;
    }

    public EstadoAlerta getEstado() {
        return estado;
    }

    public void setEstado(EstadoAlerta estado) {
        this.estado = estado;
    }

    public Prioridad getPrioridad() {
        return prioridad;
    }

    public void setPrioridad(Prioridad prioridad) {
        this.prioridad = prioridad;
    }

    public Usuario getAsignadoA() {
        return asignadoA;
    }

    public void setAsignadoA(Usuario asignadoA) {
        this.asignadoA = asignadoA;
    }

    public Caso getCaso() {
        return caso;
    }

    public void setCaso(Caso caso) {
        this.caso = caso;
    }

    public List<FactorExplicativo> getFactores() {
        return factores;
    }

    public void setFactores(List<FactorExplicativo> factores) {
        this.factores = factores;
    }

    public LocalDateTime getFechaDecision() {
        return fechaDecision;
    }

    public void setFechaDecision(LocalDateTime fechaDecision) {
        this.fechaDecision = fechaDecision;
    }

    public String getComentarioDecision() {
        return comentarioDecision;
    }

    public void setComentarioDecision(String comentarioDecision) {
        this.comentarioDecision = comentarioDecision;
    }

    public Usuario getDecididoPor() {
        return decididoPor;
    }

    public void setDecididoPor(Usuario decididoPor) {
        this.decididoPor = decididoPor;
    }

    public void agregarFactor(FactorExplicativo factor) {
        factor.setAlerta(this);
        this.factores.add(factor);
    }
}
