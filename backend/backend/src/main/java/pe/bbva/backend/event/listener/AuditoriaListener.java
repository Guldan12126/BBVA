package pe.bbva.backend.event.listener;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import pe.bbva.backend.event.DecisionTomadaEvent;
import pe.bbva.backend.event.PasswordCambiadaEvent;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.service.reporte.AuditoriaService;

/** Registra en el historial las decisiones y los cambios de contraseña (dentro de la misma transacción). */
@Component
public class AuditoriaListener {

    private final AuditoriaService auditoriaService;

    public AuditoriaListener(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @EventListener
    public void alDecidir(DecisionTomadaEvent event) {
        TipoAccion accion = event.esFraude() ? TipoAccion.CONFIRMAR_FRAUDE : TipoAccion.DESCARTAR_ALERTA;
        String detalle = (event.esFraude() ? "Fraude confirmado" : "Falso positivo")
                + (event.comentario() != null && !event.comentario().isBlank() ? ": " + event.comentario() : "");
        auditoriaService.registrarPorIds(event.usuarioId(), event.alertaId(), accion, detalle);
    }

    @EventListener
    public void alCambiarPassword(PasswordCambiadaEvent event) {
        auditoriaService.registrarPorIds(event.usuarioId(), null, TipoAccion.CAMBIO_PASSWORD,
                "Contraseña actualizada" + (event.ip() != null ? " desde " + event.ip() : ""));
    }
}
