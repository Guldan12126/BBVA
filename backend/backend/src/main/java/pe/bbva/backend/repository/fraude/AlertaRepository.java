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


    // ---------- Dashboards por rol ----------

    long countByAsignadoAIdAndNivelRiesgoAndEstadoIn(Long usuarioId, NivelRiesgo nivelRiesgo, Collection<EstadoAlerta> estados);

    long countByAsignadoAIsNullAndEstadoIn(Collection<EstadoAlerta> estados);

    List<Alerta> findTop8ByAsignadoAIdAndEstadoInOrderByProbabilidadDesc(Long usuarioId, Collection<EstadoAlerta> estados);

    List<Alerta> findTop8ByEstadoOrderByProbabilidadDesc(EstadoAlerta estado);

    long countByDecididoPorIdAndFechaDecisionBetween(Long usuarioId, LocalDateTime desde, LocalDateTime hasta);

    long countByDecididoPorIdAndEstadoAndFechaDecisionBetween(Long usuarioId, EstadoAlerta estado, LocalDateTime desde, LocalDateTime hasta);

    List<Alerta> findByFechaDecisionBetween(LocalDateTime desde, LocalDateTime hasta);


    /** Alertas por comercio: [comercioId, total]. */
    @org.springframework.data.jpa.repository.Query(
            "select a.transaccion.comercio.id, count(a) from Alerta a group by a.transaccion.comercio.id")
    List<Object[]> alertasPorComercio();
}
