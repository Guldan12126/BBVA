package pe.bbva.backend.model.ml;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.seguridad.*;
import pe.bbva.backend.model.transaccion.*;

import java.time.LocalDateTime;

/** Etiqueta real que confirma el analista. Se usa para reentrenar el modelo. */
@Entity
@Table(name = "feedback_modelo")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FeedbackModelo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "transaccion_id", nullable = false)
    private Transaccion transaccion;

    private Double scoreModelo;

    @Column(nullable = false)
    private Boolean esFraude;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false)
    private Boolean usadoEnEntrenamiento = false;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    public FeedbackModelo() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Transaccion getTransaccion() {
        return transaccion;
    }

    public void setTransaccion(Transaccion transaccion) {
        this.transaccion = transaccion;
    }

    public Double getScoreModelo() {
        return scoreModelo;
    }

    public void setScoreModelo(Double scoreModelo) {
        this.scoreModelo = scoreModelo;
    }

    public Boolean getEsFraude() {
        return esFraude;
    }

    public void setEsFraude(Boolean esFraude) {
        this.esFraude = esFraude;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public Boolean getUsadoEnEntrenamiento() {
        return usadoEnEntrenamiento;
    }

    public void setUsadoEnEntrenamiento(Boolean usadoEnEntrenamiento) {
        this.usadoEnEntrenamiento = usadoEnEntrenamiento;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }
}
