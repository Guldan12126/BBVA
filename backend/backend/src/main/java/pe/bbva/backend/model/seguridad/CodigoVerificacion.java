package pe.bbva.backend.model.seguridad;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.enums.*;

import java.time.LocalDateTime;

/** Código de 6 dígitos enviado al correo para recuperar la contraseña (se guarda cifrado). */
@Entity
@Table(name = "codigos_verificacion")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CodigoVerificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    @JsonIgnore
    private Usuario usuario;

    @Column(nullable = false)
    private String codigoHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoCodigo tipo;

    @Column(nullable = false)
    private LocalDateTime fechaExpiracion;

    @Column(nullable = false)
    private Integer intentos = 0;

    @Column(nullable = false)
    private Boolean usado = false;

    @Column(length = 100)
    private String resetTokenHash;

    private LocalDateTime resetTokenExpiracion;

    @Column(nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public CodigoVerificacion() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getCodigoHash() {
        return codigoHash;
    }

    public void setCodigoHash(String codigoHash) {
        this.codigoHash = codigoHash;
    }

    public TipoCodigo getTipo() {
        return tipo;
    }

    public void setTipo(TipoCodigo tipo) {
        this.tipo = tipo;
    }

    public LocalDateTime getFechaExpiracion() {
        return fechaExpiracion;
    }

    public void setFechaExpiracion(LocalDateTime fechaExpiracion) {
        this.fechaExpiracion = fechaExpiracion;
    }

    public Integer getIntentos() {
        return intentos;
    }

    public void setIntentos(Integer intentos) {
        this.intentos = intentos;
    }

    public Boolean getUsado() {
        return usado;
    }

    public void setUsado(Boolean usado) {
        this.usado = usado;
    }

    public String getResetTokenHash() {
        return resetTokenHash;
    }

    public void setResetTokenHash(String resetTokenHash) {
        this.resetTokenHash = resetTokenHash;
    }

    public LocalDateTime getResetTokenExpiracion() {
        return resetTokenExpiracion;
    }

    public void setResetTokenExpiracion(LocalDateTime resetTokenExpiracion) {
        this.resetTokenExpiracion = resetTokenExpiracion;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public boolean estaVencido() {
        return fechaExpiracion.isBefore(LocalDateTime.now());
    }
}
