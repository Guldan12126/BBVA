package pe.bbva.backend.event.listener;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import pe.bbva.backend.event.DecisionTomadaEvent;
import pe.bbva.backend.service.ml.FeedbackService;

/** Cada decisión del analista se guarda como dato etiquetado para reentrenar el modelo. */
@Component
public class FeedbackListener {

    private final FeedbackService feedbackService;

    public FeedbackListener(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @EventListener
    public void alDecidir(DecisionTomadaEvent event) {
        feedbackService.registrarDesdeDecision(event.alertaId(), event.usuarioId(), event.esFraude());
    }
}
