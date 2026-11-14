package pe.bbva.backend.scheduler;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.bbva.backend.service.ml.ModeloIaService;

/** Cada minuto revisa si el microservicio de IA (FastAPI) está respondiendo. */
@Component
public class SaludIaScheduler {

    private final ModeloIaService modeloIaService;

    public SaludIaScheduler(ModeloIaService modeloIaService) {
        this.modeloIaService = modeloIaService;
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 5_000)
    public void ejecutar() {
        modeloIaService.verificarSalud();
    }
}
