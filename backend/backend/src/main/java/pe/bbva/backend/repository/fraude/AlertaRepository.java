package pe.bbva.backend.repository.fraude;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.fraude.Alerta;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AlertaRepository extends JpaRepository<Alerta, Long>, JpaSpecificationExecutor<Alerta> {

    Optional<Alerta> findByCodigo(String codigo);

    Optional<Alerta> findByTransaccionId(Long transaccionId);

    List<Alerta> findByCasoId(Long casoId);

    long countByEstado(EstadoAlerta estado);

    long countByEstadoIn(Collection<EstadoAlerta> estados);

    long countByAsignadoAIdAndEstadoIn(Long usuarioId, Collection<EstadoAlerta> estados);

    long countByFechaCreacionBetween(LocalDateTime desde, LocalDateTime hasta);

    long countByEstadoAndFechaDecisionBetween(EstadoAlerta estado, LocalDateTime desde, LocalDateTime hasta);

    long countByNivelRiesgoAndEstadoIn(NivelRiesgo nivelRiesgo, Collection<EstadoAlerta> estados);

}
