package pe.bbva.backend.event.listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.bbva.backend.event.AlertaCreadaEvent;
import pe.bbva.backend.event.TransaccionEvaluadaEvent;
import pe.bbva.backend.service.notificacion.NotificacionService;

/**
 * Se ejecuta DESPUÉS de que la transacción de base de datos se confirma (AFTER_COMMIT),
 * así el dashboard nunca recibe una alerta que luego no se guardó.
 */
@Component
public class NotificacionListener {

    private static final Logger log = LoggerFactory.getLogger(NotificacionListener.class);

    private final NotificacionService notificacionService;

    public NotificacionListener(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void alCrearAlerta(AlertaCreadaEvent event) {
        try {
            notificacionService.procesarAlertaCreada(event.alertaId());
        } catch (RuntimeException e) {
            log.error("Error al notificar la alerta {}: {}", event.alertaId(), e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void alEvaluarTransaccion(TransaccionEvaluadaEvent event) {
        try {
            notificacionService.procesarTransaccionEvaluada(event.transaccionId());
        } catch (RuntimeException e) {
            log.error("Error al notificar la transacción {}: {}", event.transaccionId(), e.getMessage());
        }
    }
}
