package pe.bbva.backend.service.fraude;

import jakarta.persistence.criteria.Predicate;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.event.AlertaCreadaEvent;
import pe.bbva.backend.event.DecisionTomadaEvent;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.Clasificacion;
import pe.bbva.backend.model.enums.EstadoAlerta;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.EstadoTransaccion;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.enums.Prioridad;
import pe.bbva.backend.model.enums.Rol;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.fraude.ComentarioAlerta;
import pe.bbva.backend.model.fraude.FactorExplicativo;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.cliente.TarjetaRepository;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.fraude.ComentarioAlertaRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.service.reporte.AuditoriaService;
import pe.bbva.backend.service.seguridad.UsuarioService;
import pe.bbva.backend.util.CodigoGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Cola de alertas: crear, asignar, revisar, confirmar o descartar fraude, escalar y comentar. */
@Service
public class AlertaService {

    /** Estados en los que la alerta todavía necesita atención. */
    public static final Set<EstadoAlerta> ACTIVAS = Set.of(
            EstadoAlerta.PENDIENTE, EstadoAlerta.ASIGNADA, EstadoAlerta.EN_REVISION, EstadoAlerta.ESCALADA);

    private final AlertaRepository alertaRepository;
    private final ComentarioAlertaRepository comentarioRepository;
    private final TransaccionRepository transaccionRepository;
    private final TarjetaRepository tarjetaRepository;
    private final UsuarioService usuarioService;
    private final SecurityUtils securityUtils;
    private final AuditoriaService auditoriaService;
    private final ApplicationEventPublisher eventPublisher;

    public AlertaService(AlertaRepository alertaRepository, ComentarioAlertaRepository comentarioRepository,
                         TransaccionRepository transaccionRepository, TarjetaRepository tarjetaRepository,
                         UsuarioService usuarioService, SecurityUtils securityUtils,
                         AuditoriaService auditoriaService, ApplicationEventPublisher eventPublisher) {
        this.alertaRepository = alertaRepository;
        this.comentarioRepository = comentarioRepository;
        this.transaccionRepository = transaccionRepository;
        this.tarjetaRepository = tarjetaRepository;
        this.usuarioService = usuarioService;
        this.securityUtils = securityUtils;
        this.auditoriaService = auditoriaService;
        this.eventPublisher = eventPublisher;
    }

    /** La llama TransaccionService cuando el score supera el umbral de alerta. */
    @Transactional
    public Alerta crearDesdeEvaluacion(Transaccion tx, MotorRiesgoService.ResultadoEvaluacion resultado) {
        Alerta a = new Alerta();
        a.setCodigo(CodigoGenerator.alerta());
        a.setTransaccion(tx);
        a.setNivelRiesgo(resultado.nivel());
        a.setProbabilidad(resultado.score());
        a.setEstado(EstadoAlerta.PENDIENTE);
        a.setPrioridad(prioridadPorNivel(resultado.nivel()));
        for (FactorExplicativo f : resultado.factores()) {
            a.agregarFactor(new FactorExplicativo(f.getFactor(), f.getDescripcion(), f.getImpacto()));
        }
        alertaRepository.save(a);
        eventPublisher.publishEvent(new AlertaCreadaEvent(a.getId()));
        return a;
    }

    private Prioridad prioridadPorNivel(NivelRiesgo nivel) {
        return switch (nivel) {
            case CRITICO -> Prioridad.URGENTE;
            case ALTO -> Prioridad.ALTA;
            case MEDIO -> Prioridad.MEDIA;
            case BAJO -> Prioridad.BAJA;
        };
    }

    @Transactional(readOnly = true)
    public Page<Alerta> buscar(EstadoAlerta estado, NivelRiesgo nivel, Long asignadoId, Boolean soloActivas,
                               Pageable pageable) {
        Specification<Alerta> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (estado != null) {
                p.add(cb.equal(root.get("estado"), estado));
            } else if (Boolean.TRUE.equals(soloActivas)) {
                p.add(root.get("estado").in(ACTIVAS));
            }
            if (nivel != null) {
                p.add(cb.equal(root.get("nivelRiesgo"), nivel));
            }
            if (asignadoId != null) {
                p.add(cb.equal(root.get("asignadoA").get("id"), asignadoId));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        Pageable orden = pageable.getSort().isSorted() ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "probabilidad"));
        return alertaRepository.findAll(spec, orden);
    }

    /** Cola de trabajo: alertas activas ordenadas de mayor a menor probabilidad de fraude. */
    @Transactional(readOnly = true)
    public Page<Alerta> cola(NivelRiesgo nivel, Pageable pageable) {
        return buscar(null, nivel, null, true, pageable);
    }

    /** Alertas asignadas al usuario logueado (Analista u Operador). */
    @Transactional(readOnly = true)
    public Page<Alerta> mias(Boolean soloActivas, Pageable pageable) {
        Usuario actual = securityUtils.usuarioActual();
        return buscar(null, null, actual.getId(), soloActivas, pageable);
    }

    /** Resumen para la vista administrativa: alertas activas por nivel. */
    @Transactional(readOnly = true)
    public Map<NivelRiesgo, Long> resumenPorNivel() {
        Map<NivelRiesgo, Long> resumen = new EnumMap<>(NivelRiesgo.class);
        for (NivelRiesgo n : NivelRiesgo.values()) {
            resumen.put(n, alertaRepository.countByNivelRiesgoAndEstadoIn(n, ACTIVAS));
        }
        return resumen;
    }

    @Transactional(readOnly = true)
    public Alerta obtener(Long id) {
        return alertaRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Alerta", id));
    }

    @Transactional(readOnly = true)
    public Alerta porTransaccion(Long transaccionId) {
        return alertaRepository.findByTransaccionId(transaccionId)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta de la transacción", transaccionId));
    }

    @Transactional
    public Alerta asignar(Long alertaId, Long usuarioId) {
        Alerta a = obtenerActiva(alertaId);
        Usuario usuario = usuarioService.obtener(usuarioId);
        if (usuario.getRol() != Rol.ANALISTA && usuario.getRol() != Rol.OPERADOR) {
            throw new BusinessException("Solo se pueden asignar alertas a Analistas u Operadores");
        }
        a.setAsignadoA(usuario);
        if (a.getEstado() == EstadoAlerta.PENDIENTE) {
            a.setEstado(EstadoAlerta.ASIGNADA);
        }
        alertaRepository.save(a);
        auditoriaService.registrar(TipoAccion.ASIGNAR_ALERTA, a, "Asignada a " + usuario.getNombreCompleto());
        return a;
    }

    /** El usuario logueado toma la alerta para revisarla. */
    @Transactional
    public Alerta tomar(Long alertaId) {
        Alerta a = obtenerActiva(alertaId);
        Usuario actual = securityUtils.usuarioActual();
        a.setAsignadoA(actual);
        a.setEstado(EstadoAlerta.EN_REVISION);
        alertaRepository.save(a);
        auditoriaService.registrar(actual, a, TipoAccion.ASIGNAR_ALERTA, "Alerta tomada para revisión");
        return a;
    }

    /**
     * Decisión final del Analista de Fraude.
     * esFraude=true: confirma el fraude, la transacción queda BLOQUEADA y (opcional) se bloquea la tarjeta.
     * esFraude=false: falso positivo, la transacción se APRUEBA y se libera el bloqueo preventivo.
     */
    @Transactional
    public Alerta decidir(Long alertaId, boolean esFraude, String comentario, boolean bloquearTarjeta) {
        Alerta a = obtener(alertaId);
        if (a.getEstado() == EstadoAlerta.CONFIRMADA || a.getEstado() == EstadoAlerta.DESCARTADA) {
            throw new BusinessException(ErrorCode.ALERTA_YA_DECIDIDA);
        }
        Usuario analista = securityUtils.usuarioActual();
        LocalDateTime ahora = LocalDateTime.now();

        a.setEstado(esFraude ? EstadoAlerta.CONFIRMADA : EstadoAlerta.DESCARTADA);
        a.setDecididoPor(analista);
        a.setFechaDecision(ahora);
        a.setComentarioDecision(comentario);
        if (a.getAsignadoA() == null) {
            a.setAsignadoA(analista);
        }

        Transaccion tx = a.getTransaccion();
        tx.setClasificacion(esFraude ? Clasificacion.FRAUDULENTA : Clasificacion.LEGITIMA);
        tx.setEstado(esFraude ? EstadoTransaccion.BLOQUEADA : EstadoTransaccion.APROBADA);
        transaccionRepository.save(tx);

        Tarjeta tarjeta = tx.getTarjeta();
        if (esFraude && bloquearTarjeta) {
            tarjeta.setEstado(EstadoTarjeta.BLOQUEADA);
            tarjetaRepository.save(tarjeta);
        } else if (!esFraude && tarjeta.getEstado() == EstadoTarjeta.BLOQUEADA_TEMPORAL) {
            tarjeta.setEstado(EstadoTarjeta.ACTIVA);
            tarjetaRepository.save(tarjeta);
        }
        alertaRepository.save(a);

        // AuditoriaListener guarda el historial y FeedbackListener guarda la etiqueta para el modelo
        eventPublisher.publishEvent(new DecisionTomadaEvent(a.getId(), analista.getId(), esFraude, comentario));
        return a;
    }

    @Transactional
    public Alerta escalar(Long alertaId, String motivo) {
        Alerta a = obtenerActiva(alertaId);
        a.setEstado(EstadoAlerta.ESCALADA);
        a.setPrioridad(Prioridad.URGENTE);
        alertaRepository.save(a);
        auditoriaService.registrar(TipoAccion.ESCALAR_ALERTA, a, motivo);
        return a;
    }

    @Transactional
    public ComentarioAlerta comentar(Long alertaId, String texto) {
        Alerta a = obtener(alertaId);
        ComentarioAlerta c = new ComentarioAlerta();
        c.setAlerta(a);
        c.setUsuario(securityUtils.usuarioActual());
        c.setTexto(texto);
        comentarioRepository.save(c);
        auditoriaService.registrar(c.getUsuario(), a, TipoAccion.COMENTAR_ALERTA, texto);
        return c;
    }

    @Transactional(readOnly = true)
    public List<ComentarioAlerta> comentarios(Long alertaId) {
        return comentarioRepository.findByAlertaIdOrderByFechaAsc(alertaId);
    }

    @Transactional
    public void cambiarPrioridad(Alerta alerta, Prioridad prioridad) {
        alerta.setPrioridad(prioridad);
        alertaRepository.save(alerta);
    }

    private Alerta obtenerActiva(Long id) {
        Alerta a = obtener(id);
        if (!ACTIVAS.contains(a.getEstado())) {
            throw new BusinessException(ErrorCode.ALERTA_YA_DECIDIDA);
        }
        return a;
    }
}
