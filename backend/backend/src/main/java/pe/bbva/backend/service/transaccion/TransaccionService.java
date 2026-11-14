package pe.bbva.backend.service.transaccion;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.event.TransaccionEvaluadaEvent;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.cliente.Comercio;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.Canal;
import pe.bbva.backend.model.enums.Clasificacion;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.EstadoTransaccion;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.cliente.TarjetaRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.service.cliente.ComercioService;
import pe.bbva.backend.service.cliente.PerfilClienteService;
import pe.bbva.backend.service.cliente.TarjetaService;
import pe.bbva.backend.service.fraude.AlertaService;
import pe.bbva.backend.service.fraude.MotorRiesgoService;
import pe.bbva.backend.service.ml.ParametroModeloService;
import pe.bbva.backend.util.CodigoGenerator;
import pe.bbva.backend.util.FechaUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Recibe las transacciones del simulador POS/App, las evalúa y decide qué hacer con cada una. */
@Service
public class TransaccionService {

    /** Resultado de registrar una transacción. */
    public record Resultado(Transaccion transaccion, Alerta alerta, MotorRiesgoService.ResultadoEvaluacion evaluacion) {
    }

    private final TransaccionRepository transaccionRepository;
    private final TarjetaRepository tarjetaRepository;
    private final TarjetaService tarjetaService;
    private final ComercioService comercioService;
    private final PerfilClienteService perfilClienteService;
    private final MotorRiesgoService motorRiesgoService;
    private final AlertaService alertaService;
    private final ParametroModeloService parametroService;
    private final ApplicationEventPublisher eventPublisher;

    public TransaccionService(TransaccionRepository transaccionRepository, TarjetaRepository tarjetaRepository,
                              TarjetaService tarjetaService, ComercioService comercioService,
                              PerfilClienteService perfilClienteService, MotorRiesgoService motorRiesgoService,
                              AlertaService alertaService, ParametroModeloService parametroService,
                              ApplicationEventPublisher eventPublisher) {
        this.transaccionRepository = transaccionRepository;
        this.tarjetaRepository = tarjetaRepository;
        this.tarjetaService = tarjetaService;
        this.comercioService = comercioService;
        this.perfilClienteService = perfilClienteService;
        this.motorRiesgoService = motorRiesgoService;
        this.alertaService = alertaService;
        this.parametroService = parametroService;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Flujo completo:
     * score < umbral de alerta              -> APROBADA
     * umbral de alerta <= score < crítico  -> EN_REVISION + alerta
     * score >= umbral crítico              -> BLOQUEADA + bloqueo preventivo de la tarjeta + alerta
     */
    @Transactional
    public Resultado registrar(Long tarjetaId, Long comercioId, BigDecimal monto, Canal canal, String ciudad,
                               Double latitud, Double longitud, String ip, String dispositivo,
                               LocalDateTime fechaHora) {
        Tarjeta tarjeta = tarjetaService.obtener(tarjetaId);
        Comercio comercio = comercioService.obtener(comercioId);

        Transaccion tx = new Transaccion();
        tx.setCodigo(CodigoGenerator.transaccion());
        tx.setTarjeta(tarjeta);
        tx.setComercio(comercio);
        tx.setMonto(monto);
        tx.setCanal(canal);
        tx.setCiudad(ciudad != null ? ciudad : comercio.getCiudad());
        tx.setLatitud(latitud != null ? latitud : comercio.getLatitud());
        tx.setLongitud(longitud != null ? longitud : comercio.getLongitud());
        tx.setIp(ip);
        tx.setDispositivo(dispositivo);
        tx.setFechaHora(fechaHora != null ? fechaHora : FechaUtils.ahora());

        // Tarjeta bloqueada o cancelada: se rechaza sin evaluar
        if (tarjeta.getEstado() != EstadoTarjeta.ACTIVA) {
            tx.setEstado(EstadoTransaccion.RECHAZADA);
            tx.setClasificacion(Clasificacion.SOSPECHOSA);
            transaccionRepository.save(tx);
            eventPublisher.publishEvent(new TransaccionEvaluadaEvent(tx.getId()));
            return new Resultado(tx, null, null);
        }

        MotorRiesgoService.ResultadoEvaluacion ev = motorRiesgoService.evaluar(tx);
        tx.setScoreRiesgo(ev.score());
        tx.setNivelRiesgo(ev.nivel());
        tx.setEvaluadoPorIa(ev.evaluadoPorIa());
        tx.setVersionModelo(ev.versionModelo());
        tx.setTiempoEvaluacionMs(ev.tiempoMs());

        double umbralAlerta = parametroService.umbralAlerta();
        double umbralCritico = parametroService.umbralCritico();
        boolean generaAlerta = ev.score() >= umbralAlerta;

        if (ev.score() >= umbralCritico) {
            tx.setEstado(EstadoTransaccion.BLOQUEADA);
            tx.setClasificacion(Clasificacion.SOSPECHOSA);
            tarjeta.setEstado(EstadoTarjeta.BLOQUEADA_TEMPORAL);
            tarjetaRepository.save(tarjeta);
        } else if (generaAlerta) {
            tx.setEstado(EstadoTransaccion.EN_REVISION);
            tx.setClasificacion(Clasificacion.SOSPECHOSA);
        } else {
            tx.setEstado(EstadoTransaccion.APROBADA);
            tx.setClasificacion(Clasificacion.LEGITIMA);
        }
        transaccionRepository.save(tx);

        if (tx.getEstado() == EstadoTransaccion.APROBADA) {
            perfilClienteService.actualizarConTransaccion(tx);
        }
        Alerta alerta = generaAlerta ? alertaService.crearDesdeEvaluacion(tx, ev) : null;
        eventPublisher.publishEvent(new TransaccionEvaluadaEvent(tx.getId()));
        return new Resultado(tx, alerta, ev);
    }

    /** Búsqueda con filtros para la pantalla "Transacciones". */
    @Transactional(readOnly = true)
    public Page<Transaccion> buscar(String texto, NivelRiesgo nivel, Canal canal, EstadoTransaccion estado,
                                    Clasificacion clasificacion, Long clienteId, LocalDate desde, LocalDate hasta,
                                    Pageable pageable) {
        Specification<Transaccion> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            Join<Object, Object> tarjeta = root.join("tarjeta");
            if (texto != null && !texto.isBlank()) {
                String t = texto.trim().toUpperCase();
                p.add(cb.or(
                        cb.like(cb.upper(root.get("codigo")), "%" + t + "%"),
                        cb.like(tarjeta.get("ultimosDigitos"), "%" + t + "%")));
            }
            if (nivel != null) {
                p.add(cb.equal(root.get("nivelRiesgo"), nivel));
            }
            if (canal != null) {
                p.add(cb.equal(root.get("canal"), canal));
            }
            if (estado != null) {
                p.add(cb.equal(root.get("estado"), estado));
            }
            if (clasificacion != null) {
                p.add(cb.equal(root.get("clasificacion"), clasificacion));
            }
            if (clienteId != null) {
                p.add(cb.equal(tarjeta.get("cliente").get("id"), clienteId));
            }
            if (desde != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("fechaHora"), FechaUtils.inicioDelDia(desde)));
            }
            if (hasta != null) {
                p.add(cb.lessThanOrEqualTo(root.get("fechaHora"), FechaUtils.finDelDia(hasta)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        Pageable orden = pageable.getSort().isSorted() ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "fechaHora"));
        return transaccionRepository.findAll(spec, orden);
    }

    @Transactional(readOnly = true)
    public Transaccion obtener(Long id) {
        return transaccionRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Transacción", id));
    }

    @Transactional(readOnly = true)
    public Transaccion porCodigo(String codigo) {
        return transaccionRepository.findByCodigo(codigo)
                .orElseThrow(() -> new ResourceNotFoundException("Transacción", codigo));
    }

    @Transactional(readOnly = true)
    public List<Transaccion> recientes() {
        return transaccionRepository.findTop10ByOrderByFechaHoraDesc();
    }
}
