package pe.bbva.backend.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.bbva.backend.model.enums.TipoReporte;
import pe.bbva.backend.service.reporte.ReporteService;
import pe.bbva.backend.util.FechaUtils;

/** Genera el reporte diario automáticamente a las 23:55. */
@Component
public class ReporteDiarioScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReporteDiarioScheduler.class);

    private final ReporteService reporteService;

    public ReporteDiarioScheduler(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    @Scheduled(cron = "0 55 23 * * *", zone = "America/Lima")
    public void ejecutar() {
        try {
            reporteService.generar(TipoReporte.DIARIO, null, FechaUtils.hoy(), null);
            log.info("Reporte diario generado");
        } catch (RuntimeException e) {
            log.error("Error al generar el reporte diario: {}", e.getMessage());
        }
    }
}
