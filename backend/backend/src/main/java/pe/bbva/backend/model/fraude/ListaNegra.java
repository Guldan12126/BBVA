package pe.bbva.backend.model.fraude;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.base.Auditable;
import pe.bbva.backend.model.enums.*;

import java.time.LocalDateTime;

/** Tarjetas, comercios, IPs o dispositivos bloqueados. */
@Entity
@Table(name = "lista_negra")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ListaNegra extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private TipoListaNegra tipo;

    @Column(nullable = false, length = 120)
    private String valor;

    @Column(length = 300)
    private String motivo;

    @Column(nullable = false)
    private Boolean activo = true;

    private LocalDateTime fechaExpiracion;

    public ListaNegra() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TipoListaNegra getTipo() {
        return tipo;
    }

    public void setTipo(TipoListaNegra tipo) {
        this.tipo = tipo;
    }

    public String getValor() {
        return valor;
    }

    public void setValor(String valor) {
        this.valor = valor;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }

    public LocalDateTime getFechaExpiracion() {
        return fechaExpiracion;
    }

    public void setFechaExpiracion(LocalDateTime fechaExpiracion) {
        this.fechaExpiracion = fechaExpiracion;
    }
}
