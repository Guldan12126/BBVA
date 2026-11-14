package pe.bbva.backend.model.ml;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.enums.*;

import java.time.LocalDateTime;

/** Versiones del modelo de Machine Learning y sus métricas. */
@Entity
@Table(name = "versiones_modelo")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class VersionModelo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String version;

    @Column(nullable = false, length = 60)
    private String algoritmo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoModelo estado;

    private Double precisionScore;

    private Double recallScore;

    private Double f1Score;

    private Double aucRoc;

    private Integer muestrasEntrenamiento;

    private LocalDateTime fechaEntrenamiento;

    @Column(length = 500)
    private String observaciones;

    public VersionModelo() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getAlgoritmo() {
        return algoritmo;
    }

    public void setAlgoritmo(String algoritmo) {
        this.algoritmo = algoritmo;
    }

    public EstadoModelo getEstado() {
        return estado;
    }

    public void setEstado(EstadoModelo estado) {
        this.estado = estado;
    }

    public Double getPrecisionScore() {
        return precisionScore;
    }

    public void setPrecisionScore(Double precisionScore) {
        this.precisionScore = precisionScore;
    }

    public Double getRecallScore() {
        return recallScore;
    }

    public void setRecallScore(Double recallScore) {
        this.recallScore = recallScore;
    }

    public Double getF1Score() {
        return f1Score;
    }

    public void setF1Score(Double f1Score) {
        this.f1Score = f1Score;
    }

    public Double getAucRoc() {
        return aucRoc;
    }

    public void setAucRoc(Double aucRoc) {
        this.aucRoc = aucRoc;
    }

    public Integer getMuestrasEntrenamiento() {
        return muestrasEntrenamiento;
    }

    public void setMuestrasEntrenamiento(Integer muestrasEntrenamiento) {
        this.muestrasEntrenamiento = muestrasEntrenamiento;
    }

    public LocalDateTime getFechaEntrenamiento() {
        return fechaEntrenamiento;
    }

    public void setFechaEntrenamiento(LocalDateTime fechaEntrenamiento) {
        this.fechaEntrenamiento = fechaEntrenamiento;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}
