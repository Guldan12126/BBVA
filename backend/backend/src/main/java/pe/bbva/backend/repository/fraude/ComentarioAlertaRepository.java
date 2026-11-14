package pe.bbva.backend.repository.fraude;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.fraude.ComentarioAlerta;

import java.util.List;

public interface ComentarioAlertaRepository extends JpaRepository<ComentarioAlerta, Long> {

    List<ComentarioAlerta> findByAlertaIdOrderByFechaAsc(Long alertaId);

}
