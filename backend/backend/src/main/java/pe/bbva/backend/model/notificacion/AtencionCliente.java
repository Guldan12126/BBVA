package pe.bbva.backend.model.notificacion;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.seguridad.*;
import pe.bbva.backend.model.fraude.*;

import java.time.LocalDateTime;

/** Registro del contacto del operador con el cliente. */
@Entity
@Table(name = "atenciones_cliente")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AtencionCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "alerta_id", nullable = false)
    @JsonIgnoreProperties({"factores", "caso", "hibernateLazyInitializer", "handler"})
    private Alerta alerta;

    @ManyToOne
    @JoinColumn(name = "operador_id", nullable = false)
    private Usuario operador;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResultadoAtencion resultado;

    @Column(length = 1000)
    private String observacion;

    private Boolean tarjetaBloqueada = false;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    public AtencionCliente() {
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

    public Usuario getOperador() {
        return operador;
    }

    public void setOperador(Usuario operador) {
        this.operador = operador;
    }

    public ResultadoAtencion getResultado() {
        return resultado;
    }

    public void setResultado(ResultadoAtencion resultado) {
        this.resultado = resultado;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public Boolean getTarjetaBloqueada() {
        return tarjetaBloqueada;
    }

    public void setTarjetaBloqueada(Boolean tarjetaBloqueada) {
        this.tarjetaBloqueada = tarjetaBloqueada;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }
}
