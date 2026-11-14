package pe.bbva.backend.model.cliente;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.base.Auditable;
import pe.bbva.backend.model.enums.*;

import java.math.BigDecimal;

/** Tarjeta de crédito o débito. El número completo nunca se guarda. */
@Entity
@Table(name = "tarjetas")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Tarjeta extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 25)
    private String numeroEnmascarado;

    @Column(nullable = false, length = 4)
    private String ultimosDigitos;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoTarjeta tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoTarjeta estado = EstadoTarjeta.ACTIVA;

    @Column(length = 5)
    private String fechaVencimiento;

    @Column(precision = 12, scale = 2)
    private BigDecimal limiteCredito;

    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    public Tarjeta() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNumeroEnmascarado() {
        return numeroEnmascarado;
    }

    public void setNumeroEnmascarado(String numeroEnmascarado) {
        this.numeroEnmascarado = numeroEnmascarado;
    }

    public String getUltimosDigitos() {
        return ultimosDigitos;
    }

    public void setUltimosDigitos(String ultimosDigitos) {
        this.ultimosDigitos = ultimosDigitos;
    }

    public TipoTarjeta getTipo() {
        return tipo;
    }

    public void setTipo(TipoTarjeta tipo) {
        this.tipo = tipo;
    }

    public EstadoTarjeta getEstado() {
        return estado;
    }

    public void setEstado(EstadoTarjeta estado) {
        this.estado = estado;
    }

    public String getFechaVencimiento() {
        return fechaVencimiento;
    }

    public void setFechaVencimiento(String fechaVencimiento) {
        this.fechaVencimiento = fechaVencimiento;
    }

    public BigDecimal getLimiteCredito() {
        return limiteCredito;
    }

    public void setLimiteCredito(BigDecimal limiteCredito) {
        this.limiteCredito = limiteCredito;
    }

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }
}
