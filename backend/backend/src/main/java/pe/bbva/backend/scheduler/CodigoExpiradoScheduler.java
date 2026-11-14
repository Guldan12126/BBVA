package pe.bbva.backend.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.bbva.backend.service.seguridad.RecuperacionPasswordService;

/** Cada hora borra los códigos de verificación y refresh tokens vencidos. */
@Component
public class CodigoExpiradoScheduler {

    private static final Logger log = LoggerFactory.getLogger(CodigoExpiradoScheduler.class);

    private final RecuperacionPasswordService recuperacionService;

    public CodigoExpiradoScheduler(RecuperacionPasswordService recuperacionService) {
        this.recuperacionService = recuperacionService;
    }

    @Scheduled(cron = "0 0 * * * *", zone = "America/Lima")
    public void ejecutar() {
        try {
            int total = recuperacionService.limpiarVencidos();
            log.info("Limpieza de códigos y tokens vencidos: {} registros eliminados", total);
        } catch (RuntimeException e) {
            log.error("Error en la limpieza de códigos: {}", e.getMessage());
        }
    }
}
