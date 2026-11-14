package pe.bbva.backend.model.cliente;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Comportamiento habitual del cliente: base para detectar compras atípicas. */
@Entity
@Table(name = "perfiles_cliente")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PerfilCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "cliente_id", nullable = false, unique = true)
    @JsonIgnore
    private Cliente cliente;

    @Column(precision = 12, scale = 2)
    private BigDecimal montoPromedio = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    private BigDecimal montoMaximo = BigDecimal.ZERO;

    @Column(length = 80)
    private String ciudadHabitual;

    private Double latitudHabitual;

    private Double longitudHabitual;

    private Integer horaHabitualInicio = 8;

    private Integer horaHabitualFin = 22;

    private Long totalTransacciones = 0L;

    private LocalDateTime ultimaActualizacion;

    public PerfilCliente() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public BigDecimal getMontoPromedio() {
        return montoPromedio;
    }

    public void setMontoPromedio(BigDecimal montoPromedio) {
        this.montoPromedio = montoPromedio;
    }

    public BigDecimal getMontoMaximo() {
        return montoMaximo;
    }

    public void setMontoMaximo(BigDecimal montoMaximo) {
        this.montoMaximo = montoMaximo;
    }

    public String getCiudadHabitual() {
        return ciudadHabitual;
    }

    public void setCiudadHabitual(String ciudadHabitual) {
        this.ciudadHabitual = ciudadHabitual;
    }

    public Double getLatitudHabitual() {
        return latitudHabitual;
    }

    public void setLatitudHabitual(Double latitudHabitual) {
        this.latitudHabitual = latitudHabitual;
    }

    public Double getLongitudHabitual() {
        return longitudHabitual;
    }

    public void setLongitudHabitual(Double longitudHabitual) {
        this.longitudHabitual = longitudHabitual;
    }

    public Integer getHoraHabitualInicio() {
        return horaHabitualInicio;
    }

    public void setHoraHabitualInicio(Integer horaHabitualInicio) {
        this.horaHabitualInicio = horaHabitualInicio;
    }

    public Integer getHoraHabitualFin() {
        return horaHabitualFin;
    }

    public void setHoraHabitualFin(Integer horaHabitualFin) {
        this.horaHabitualFin = horaHabitualFin;
    }

    public Long getTotalTransacciones() {
        return totalTransacciones;
    }

    public void setTotalTransacciones(Long totalTransacciones) {
        this.totalTransacciones = totalTransacciones;
    }

    public LocalDateTime getUltimaActualizacion() {
        return ultimaActualizacion;
    }

    public void setUltimaActualizacion(LocalDateTime ultimaActualizacion) {
        this.ultimaActualizacion = ultimaActualizacion;
    }
}
