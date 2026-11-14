package pe.bbva.backend.service.notificacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.config.properties.AppProperties;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.cliente.Cliente;
import pe.bbva.backend.model.enums.CanalNotificacion;
import pe.bbva.backend.model.enums.EstadoNotificacion;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.notificacion.Notificacion;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.notificacion.NotificacionRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.util.CodigoGenerator;
import pe.bbva.backend.util.Constantes;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Notificaciones:
 * - Al dashboard en tiempo real por WebSocket (/topic/alertas y /topic/transacciones).
 * - Al cliente: enlace seguro "¿Reconoces esta compra?" por correo.
 */
@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);
    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final NotificacionRepository notificacionRepository;
    private final AlertaRepository alertaRepository;
    private final TransaccionRepository transaccionRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;
    private final AppProperties props;

    public NotificacionService(NotificacionRepository notificacionRepository, AlertaRepository alertaRepository,
                               TransaccionRepository transaccionRepository, SimpMessagingTemplate messagingTemplate,
                               EmailService emailService, AppProperties props) {
        this.notificacionRepository = notificacionRepository;
        this.alertaRepository = alertaRepository;
        this.transaccionRepository = transaccionRepository;
        this.messagingTemplate = messagingTemplate;
        this.emailService = emailService;
        this.props = props;
    }

    /** Lo llama NotificacionListener después de que la alerta se guardó en la base de datos. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void procesarAlertaCreada(Long alertaId) {
        alertaRepository.findById(alertaId).ifPresent(alerta -> {
            enviarAlertaDashboard(alerta);
            crearNotificacionCliente(alerta);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void procesarTransaccionEvaluada(Long transaccionId) {
        transaccionRepository.findById(transaccionId).ifPresent(this::enviarTransaccionDashboard);
    }

    public void enviarAlertaDashboard(Alerta a) {
        Transaccion tx = a.getTransaccion();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("codigo", a.getCodigo());
        m.put("nivelRiesgo", a.getNivelRiesgo());
        m.put("probabilidad", a.getProbabilidad());
        m.put("estado", a.getEstado());
        m.put("prioridad", a.getPrioridad());
        m.put("transaccionCodigo", tx.getCodigo());
        m.put("monto", tx.getMonto());
        m.put("comercio", tx.getComercio().getNombre());
        m.put("ciudad", tx.getCiudad());
        m.put("tarjeta", tx.getTarjeta().getNumeroEnmascarado());
        m.put("cliente", tx.getTarjeta().getCliente().getNombreCompleto());
        m.put("factores", a.getFactores().stream().map(f -> f.getDescripcion()).toList());
        m.put("fecha", tx.getFechaHora().toString());
        enviar(Constantes.TOPIC_ALERTAS, m);
    }

    public void enviarTransaccionDashboard(Transaccion tx) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", tx.getId());
        m.put("codigo", tx.getCodigo());
        m.put("monto", tx.getMonto());
        m.put("comercio", tx.getComercio().getNombre());
        m.put("canal", tx.getCanal());
        m.put("ciudad", tx.getCiudad());
        m.put("tarjeta", tx.getTarjeta().getNumeroEnmascarado());
        m.put("scoreRiesgo", tx.getScoreRiesgo());
        m.put("nivelRiesgo", tx.getNivelRiesgo());
        m.put("estado", tx.getEstado());
        m.put("clasificacion", tx.getClasificacion());
        m.put("fecha", tx.getFechaHora().toString());
        enviar(Constantes.TOPIC_TRANSACCIONES, m);
    }

    private void enviar(String destino, Object mensaje) {
        try {
            messagingTemplate.convertAndSend(destino, mensaje);
        } catch (RuntimeException e) {
            log.warn("No se pudo enviar el mensaje WebSocket a {}: {}", destino, e.getMessage());
        }
    }

    /** Crea el enlace "¿Reconoces esta compra?" y lo envía al correo del cliente. */
    @Transactional
    public Notificacion crearNotificacionCliente(Alerta alerta) {
        Transaccion tx = alerta.getTransaccion();
        Cliente cliente = tx.getTarjeta().getCliente();
        boolean tieneCorreo = cliente.getCorreo() != null && !cliente.getCorreo().isBlank();

        Notificacion n = new Notificacion();
        n.setAlerta(alerta);
        n.setCliente(cliente);
        n.setCanal(tieneCorreo ? CanalNotificacion.EMAIL : CanalNotificacion.WEB);
        n.setToken(CodigoGenerator.tokenSeguro());
        n.setEstado(EstadoNotificacion.ENVIADA);
        n.setFechaExpiracion(LocalDateTime.now().plusMinutes(props.notificacionVigenciaMinutos()));
        String detalle = "Compra de " + tx.getMoneda() + " " + tx.getMonto() + " en " + tx.getComercio().getNombre()
                + " (" + tx.getCiudad() + ") el " + tx.getFechaHora().format(FORMATO)
                + " con la tarjeta " + tx.getTarjeta().getNumeroEnmascarado();
        n.setMensaje("¿Reconoces esta compra? " + detalle);
        notificacionRepository.save(n);

        if (tieneCorreo) {
            emailService.enviarValidacionCompra(cliente.getCorreo(), cliente.getNombres(), detalle, enlace(n),
                    props.notificacionVigenciaMinutos());
        }
        log.info("Enlace de validación para el cliente {}: {}", cliente.getNombreCompleto(), enlace(n));
        return n;
    }

    /** Reenvía una nueva notificación al cliente (la anterior queda como expirada). */
    @Transactional
    public Notificacion reenviar(Long alertaId) {
        Alerta alerta = alertaRepository.findById(alertaId)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta", alertaId));
        notificacionRepository.findByAlertaIdOrderByFechaEnvioDesc(alertaId).stream()
                .filter(n -> n.getEstado() == EstadoNotificacion.ENVIADA)
                .forEach(n -> {
                    n.setEstado(EstadoNotificacion.EXPIRADA);
                    notificacionRepository.save(n);
                });
        return crearNotificacionCliente(alerta);
    }

    public String enlace(Notificacion n) {
        return props.frontendUrl() + "/validar-compra/" + n.getToken();
    }

    @Transactional(readOnly = true)
    public List<Notificacion> listar() {
        return notificacionRepository.findAllByOrderByFechaEnvioDesc();
    }

    @Transactional(readOnly = true)
    public Notificacion obtener(Long id) {
        return notificacionRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Notificación", id));
    }

    @Transactional(readOnly = true)
    public List<Notificacion> porAlerta(Long alertaId) {
        return notificacionRepository.findByAlertaIdOrderByFechaEnvioDesc(alertaId);
    }

    @Transactional(readOnly = true)
    public List<Notificacion> porCliente(Long clienteId) {
        return notificacionRepository.findByClienteIdOrderByFechaEnvioDesc(clienteId);
    }

    /** Lo usa NotificacionExpiradaScheduler. */
    @Transactional
    public int expirarVencidas() {
        List<Notificacion> vencidas = notificacionRepository
                .findByEstadoAndFechaExpiracionBefore(EstadoNotificacion.ENVIADA, LocalDateTime.now());
        vencidas.forEach(n -> n.setEstado(EstadoNotificacion.EXPIRADA));
        notificacionRepository.saveAll(vencidas);
        return vencidas.size();
    }
}
