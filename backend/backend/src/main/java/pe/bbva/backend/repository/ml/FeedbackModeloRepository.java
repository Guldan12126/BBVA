package pe.bbva.backend.repository.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.ml.FeedbackModelo;

import java.util.List;
import java.util.Optional;

public interface FeedbackModeloRepository extends JpaRepository<FeedbackModelo, Long> {

    List<FeedbackModelo> findByUsadoEnEntrenamientoFalse();

    long countByUsadoEnEntrenamientoFalse();

    Optional<FeedbackModelo> findFirstByTransaccionId(Long transaccionId);

}
