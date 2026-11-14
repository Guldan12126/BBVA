package pe.bbva.backend.repository.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.ml.VersionModelo;

import java.util.List;
import java.util.Optional;

public interface VersionModeloRepository extends JpaRepository<VersionModelo, Long> {

    Optional<VersionModelo> findByVersion(String version);

    Optional<VersionModelo> findFirstByEstadoOrderByFechaEntrenamientoDesc(EstadoModelo estado);

    List<VersionModelo> findByEstado(EstadoModelo estado);

    List<VersionModelo> findAllByOrderByFechaEntrenamientoDesc();

}
