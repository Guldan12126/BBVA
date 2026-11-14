package pe.bbva.backend.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.bbva.backend.service.cliente.PerfilClienteService;

/** Todas las noches (2:00 a. m.) recalcula el comportamiento habitual de los clientes. */
@Component
public class PerfilClienteScheduler {

    private static final Logger log = LoggerFactory.getLogger(PerfilClienteScheduler.class);

    private final PerfilClienteService perfilClienteService;

    public PerfilClienteScheduler(PerfilClienteService perfilClienteService) {
        this.perfilClienteService = perfilClienteService;
    }

    @Scheduled(cron = "0 0 2 * * *", zone = "America/Lima")
    public void ejecutar() {
        try {
            int total = perfilClienteService.recalcularTodos();
            log.info("Perfiles de cliente recalculados: {}", total);
        } catch (RuntimeException e) {
            log.error("Error al recalcular perfiles: {}", e.getMessage());
        }
    }
}
