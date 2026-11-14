package pe.bbva.backend.model.auditoria;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.seguridad.*;
import pe.bbva.backend.model.fraude.*;

import java.time.LocalDateTime;

/** Auditoría: quién hizo qué y cuándo. */
@Entity
@Table(name = "historial_decisiones")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class HistorialDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "alerta_id")
    @JsonIgnoreProperties({"factores", "caso", "transaccion", "asignadoA", "decididoPor", "hibernateLazyInitializer", "handler"})
    private Alerta alerta;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoAccion accion;

    @Column(length = 1000)
    private String detalle;

    @Column(length = 60)
    private String ip;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    public HistorialDecision() {
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

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public TipoAccion getAccion() {
        return accion;
    }

    public void setAccion(TipoAccion accion) {
        this.accion = accion;
    }

    public String getDetalle() {
        return detalle;
    }

    public void setDetalle(String detalle) {
        this.detalle = detalle;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }
}
