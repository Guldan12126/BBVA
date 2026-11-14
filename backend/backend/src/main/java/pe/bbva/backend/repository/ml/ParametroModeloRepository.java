package pe.bbva.backend.repository.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.ml.ParametroModelo;

import java.util.List;
import java.util.Optional;

public interface ParametroModeloRepository extends JpaRepository<ParametroModelo, Long> {

    Optional<ParametroModelo> findByClave(String clave);

    List<ParametroModelo> findAllByOrderByClaveAsc();

}
