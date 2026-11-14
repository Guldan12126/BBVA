package pe.bbva.backend.model.notificacion;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.cliente.*;
import pe.bbva.backend.model.fraude.*;

import java.time.LocalDateTime;

/** Aviso al cliente con enlace seguro '¿Reconoces esta compra?'. */
@Entity
@Table(name = "notificaciones")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "alerta_id", nullable = false)
    @JsonIgnoreProperties({"factores", "caso", "asignadoA", "decididoPor", "hibernateLazyInitializer", "handler"})
    private Alerta alerta;

    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CanalNotificacion canal;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoNotificacion estado = EstadoNotificacion.ENVIADA;

    @Column(length = 500)
    private String mensaje;

    @Column(nullable = false)
    private LocalDateTime fechaEnvio = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime fechaExpiracion;

    private LocalDateTime fechaRespuesta;

    private Boolean reconocida;

    public Notificacion() {
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

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public CanalNotificacion getCanal() {
        return canal;
    }

    public void setCanal(CanalNotificacion canal) {
        this.canal = canal;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public EstadoNotificacion getEstado() {
        return estado;
    }

    public void setEstado(EstadoNotificacion estado) {
        this.estado = estado;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public LocalDateTime getFechaEnvio() {
        return fechaEnvio;
    }

    public void setFechaEnvio(LocalDateTime fechaEnvio) {
        this.fechaEnvio = fechaEnvio;
    }

    public LocalDateTime getFechaExpiracion() {
        return fechaExpiracion;
    }

    public void setFechaExpiracion(LocalDateTime fechaExpiracion) {
        this.fechaExpiracion = fechaExpiracion;
    }

    public LocalDateTime getFechaRespuesta() {
        return fechaRespuesta;
    }

    public void setFechaRespuesta(LocalDateTime fechaRespuesta) {
        this.fechaRespuesta = fechaRespuesta;
    }

    public Boolean getReconocida() {
        return reconocida;
    }

    public void setReconocida(Boolean reconocida) {
        this.reconocida = reconocida;
    }
}
