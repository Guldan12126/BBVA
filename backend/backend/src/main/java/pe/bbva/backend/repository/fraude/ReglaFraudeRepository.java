package pe.bbva.backend.repository.fraude;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.fraude.ReglaFraude;

import java.util.List;

public interface ReglaFraudeRepository extends JpaRepository<ReglaFraude, Long> {

    List<ReglaFraude> findByActivaTrue();

    List<ReglaFraude> findAllByOrderByIdAsc();

}
