package pe.bbva.backend.model.seguridad;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Foto de perfil de un usuario. Está en una tabla aparte para que la imagen
 * no viaje en cada JSON que incluye un Usuario (alertas, listas, etc.).
 * Se guarda como data URL ("data:image/jpeg;base64,...") ya reducida por el frontend.
 */
@Entity
@Table(name = "usuario_fotos")
public class UsuarioFoto {

    /** Mismo id que el usuario. */
    @Id
    private Long usuarioId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String imagen;

    @Column(nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now();

    public UsuarioFoto() {
    }

    public UsuarioFoto(Long usuarioId, String imagen) {
        this.usuarioId = usuarioId;
        this.imagen = imagen;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getImagen() {
        return imagen;
    }

    public void setImagen(String imagen) {
        this.imagen = imagen;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }
}
