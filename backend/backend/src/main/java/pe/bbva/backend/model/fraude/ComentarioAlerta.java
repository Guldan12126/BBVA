package pe.bbva.backend.model.fraude;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.seguridad.*;

import java.time.LocalDateTime;

/** Nota interna del analista sobre una alerta. */
@Entity
@Table(name = "comentarios_alerta")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ComentarioAlerta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alerta_id", nullable = false)
    @JsonIgnore
    private Alerta alerta;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 1000)
    private String texto;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    public ComentarioAlerta() {
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

    public String getTexto() {
        return texto;
    }

    public void setTexto(String texto) {
        this.texto = texto;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public void setFecha(LocalDateTime fecha) {
        this.fecha = fecha;
    }
}
