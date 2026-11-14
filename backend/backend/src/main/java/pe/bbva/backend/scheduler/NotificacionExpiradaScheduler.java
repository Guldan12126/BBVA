package pe.bbva.backend.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.bbva.backend.service.notificacion.NotificacionService;

/** Cada minuto marca como EXPIRADA las notificaciones que el cliente no respondió a tiempo. */
@Component
public class NotificacionExpiradaScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificacionExpiradaScheduler.class);

    private final NotificacionService notificacionService;

    public NotificacionExpiradaScheduler(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void ejecutar() {
        try {
            int total = notificacionService.expirarVencidas();
            if (total > 0) {
                log.info("Notificaciones expiradas: {}", total);
            }
        } catch (RuntimeException e) {
            log.error("Error al expirar notificaciones: {}", e.getMessage());
        }
    }
}
