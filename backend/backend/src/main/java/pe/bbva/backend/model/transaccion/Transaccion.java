package pe.bbva.backend.model.transaccion;

import com.fasterxml.jackson.annotation.*;
import jakarta.persistence.*;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.cliente.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Operación con tarjeta evaluada por el motor de riesgo. */
@Entity
@Table(name = "transacciones")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Transaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @ManyToOne
    @JoinColumn(name = "tarjeta_id", nullable = false)
    private Tarjeta tarjeta;

    @ManyToOne
    @JoinColumn(name = "comercio_id", nullable = false)
    private Comercio comercio;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal monto;

    @Column(length = 3)
    private String moneda = "PEN";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Canal canal;

    @Column(length = 80)
    private String ciudad;

    private Double latitud;

    private Double longitud;

    @Column(length = 60)
    private String ip;

    @Column(length = 120)
    private String dispositivo;

    @Column(nullable = false)
    private LocalDateTime fechaHora;

    private Double scoreRiesgo;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private NivelRiesgo nivelRiesgo;

    @Enumerated(EnumType.STRING)
    @Column(length = 15)
    private Clasificacion clasificacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoTransaccion estado = EstadoTransaccion.PENDIENTE;

    @Column(length = 40)
    private String versionModelo;

    private Boolean evaluadoPorIa = false;

    private Long tiempoEvaluacionMs;

    public Transaccion() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public Tarjeta getTarjeta() {
        return tarjeta;
    }

    public void setTarjeta(Tarjeta tarjeta) {
        this.tarjeta = tarjeta;
    }

    public Comercio getComercio() {
        return comercio;
    }

    public void setComercio(Comercio comercio) {
        this.comercio = comercio;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public void setMonto(BigDecimal monto) {
        this.monto = monto;
    }

    public String getMoneda() {
        return moneda;
    }

    public void setMoneda(String moneda) {
        this.moneda = moneda;
    }

    public Canal getCanal() {
        return canal;
    }

    public void setCanal(Canal canal) {
        this.canal = canal;
    }

    public String getCiudad() {
        return ciudad;
    }

    public void setCiudad(String ciudad) {
        this.ciudad = ciudad;
    }

    public Double getLatitud() {
        return latitud;
    }

    public void setLatitud(Double latitud) {
        this.latitud = latitud;
    }

    public Double getLongitud() {
        return longitud;
    }

    public void setLongitud(Double longitud) {
        this.longitud = longitud;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getDispositivo() {
        return dispositivo;
    }

    public void setDispositivo(String dispositivo) {
        this.dispositivo = dispositivo;
    }

    public LocalDateTime getFechaHora() {
        return fechaHora;
    }

    public void setFechaHora(LocalDateTime fechaHora) {
        this.fechaHora = fechaHora;
    }

    public Double getScoreRiesgo() {
        return scoreRiesgo;
    }

    public void setScoreRiesgo(Double scoreRiesgo) {
        this.scoreRiesgo = scoreRiesgo;
    }

    public NivelRiesgo getNivelRiesgo() {
        return nivelRiesgo;
    }

    public void setNivelRiesgo(NivelRiesgo nivelRiesgo) {
        this.nivelRiesgo = nivelRiesgo;
    }

    public Clasificacion getClasificacion() {
        return clasificacion;
    }

    public void setClasificacion(Clasificacion clasificacion) {
        this.clasificacion = clasificacion;
    }

    public EstadoTransaccion getEstado() {
        return estado;
    }

    public void setEstado(EstadoTransaccion estado) {
        this.estado = estado;
    }

    public String getVersionModelo() {
        return versionModelo;
    }

    public void setVersionModelo(String versionModelo) {
        this.versionModelo = versionModelo;
    }

    public Boolean getEvaluadoPorIa() {
        return evaluadoPorIa;
    }

    public void setEvaluadoPorIa(Boolean evaluadoPorIa) {
        this.evaluadoPorIa = evaluadoPorIa;
    }

    public Long getTiempoEvaluacionMs() {
        return tiempoEvaluacionMs;
    }

    public void setTiempoEvaluacionMs(Long tiempoEvaluacionMs) {
        this.tiempoEvaluacionMs = tiempoEvaluacionMs;
    }
}
