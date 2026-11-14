package pe.bbva.backend.service.ml;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.ml.FeedbackModelo;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.ml.FeedbackModeloRepository;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;

import java.time.LocalDateTime;
import java.util.List;

/** Guarda la etiqueta real (fraude / no fraude) que confirma el analista, para reentrenar el modelo. */
@Service
public class FeedbackService {

    private final FeedbackModeloRepository feedbackRepository;
    private final AlertaRepository alertaRepository;
    private final UsuarioRepository usuarioRepository;

    public FeedbackService(FeedbackModeloRepository feedbackRepository, AlertaRepository alertaRepository,
                           UsuarioRepository usuarioRepository) {
        this.feedbackRepository = feedbackRepository;
        this.alertaRepository = alertaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public void registrarDesdeDecision(Long alertaId, Long usuarioId, boolean esFraude) {
        Alerta alerta = alertaRepository.findById(alertaId).orElse(null);
        if (alerta == null) {
            return;
        }
        FeedbackModelo f = feedbackRepository.findFirstByTransaccionId(alerta.getTransaccion().getId())
                .orElseGet(FeedbackModelo::new);
        f.setTransaccion(alerta.getTransaccion());
        f.setScoreModelo(alerta.getProbabilidad());
        f.setEsFraude(esFraude);
        f.setUsuario(usuarioId == null ? null : usuarioRepository.findById(usuarioId).orElse(null));
        f.setUsadoEnEntrenamiento(false);
        f.setFecha(LocalDateTime.now());
        feedbackRepository.save(f);
    }

    @Transactional(readOnly = true)
    public List<FeedbackModelo> pendientes() {
        return feedbackRepository.findByUsadoEnEntrenamientoFalse();
    }

    @Transactional(readOnly = true)
    public long contarPendientes() {
        return feedbackRepository.countByUsadoEnEntrenamientoFalse();
    }

    @Transactional
    public void marcarUsados(List<FeedbackModelo> feedback) {
        feedback.forEach(f -> f.setUsadoEnEntrenamiento(true));
        feedbackRepository.saveAll(feedback);
    }
}
