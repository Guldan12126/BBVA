package pe.bbva.backend.model.auditoria;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.seguridad.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Reporte generado (resumen). El detalle se descarga en CSV/Excel. */
@Entity
@Table(name = "reportes")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Reporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private TipoReporte tipo;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false)
    private LocalDate fechaInicio;

    @Column(nullable = false)
    private LocalDate fechaFin;

    private Long totalTransacciones;

    private Long totalAlertas;

    private Long fraudesConfirmados;

    private Long falsosPositivos;

    @Column(precision = 14, scale = 2)
    private BigDecimal montoTotalFraude;

    @ManyToOne
    @JoinColumn(name = "generado_por_id")
    private Usuario generadoPor;

    @Column(nullable = false)
    private LocalDateTime fechaGeneracion = LocalDateTime.now();

    public Reporte() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TipoReporte getTipo() {
        return tipo;
    }

    public void setTipo(TipoReporte tipo) {
        this.tipo = tipo;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public LocalDate getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDate fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDate getFechaFin() {
        return fechaFin;
    }

    public void setFechaFin(LocalDate fechaFin) {
        this.fechaFin = fechaFin;
    }

    public Long getTotalTransacciones() {
        return totalTransacciones;
    }

    public void setTotalTransacciones(Long totalTransacciones) {
        this.totalTransacciones = totalTransacciones;
    }

    public Long getTotalAlertas() {
        return totalAlertas;
    }

    public void setTotalAlertas(Long totalAlertas) {
        this.totalAlertas = totalAlertas;
    }

    public Long getFraudesConfirmados() {
        return fraudesConfirmados;
    }

    public void setFraudesConfirmados(Long fraudesConfirmados) {
        this.fraudesConfirmados = fraudesConfirmados;
    }

    public Long getFalsosPositivos() {
        return falsosPositivos;
    }

    public void setFalsosPositivos(Long falsosPositivos) {
        this.falsosPositivos = falsosPositivos;
    }

    public BigDecimal getMontoTotalFraude() {
        return montoTotalFraude;
    }

    public void setMontoTotalFraude(BigDecimal montoTotalFraude) {
        this.montoTotalFraude = montoTotalFraude;
    }

    public Usuario getGeneradoPor() {
        return generadoPor;
    }

    public void setGeneradoPor(Usuario generadoPor) {
        this.generadoPor = generadoPor;
    }

    public LocalDateTime getFechaGeneracion() {
        return fechaGeneracion;
    }

    public void setFechaGeneracion(LocalDateTime fechaGeneracion) {
        this.fechaGeneracion = fechaGeneracion;
    }
}
