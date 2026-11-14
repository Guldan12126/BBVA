package pe.bbva.backend.repository.transaccion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.transaccion.Transaccion;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TransaccionRepository extends JpaRepository<Transaccion, Long>, JpaSpecificationExecutor<Transaccion> {

    Optional<Transaccion> findByCodigo(String codigo);

    long countByTarjetaIdAndFechaHoraBetween(Long tarjetaId, LocalDateTime desde, LocalDateTime hasta);

    boolean existsByTarjetaClienteIdAndComercioIdAndIdNot(Long clienteId, Long comercioId, Long id);

    List<Transaccion> findTop100ByTarjetaClienteIdOrderByFechaHoraDesc(Long clienteId);

    List<Transaccion> findTop10ByOrderByFechaHoraDesc();

    List<Transaccion> findByFechaHoraBetweenOrderByFechaHoraAsc(LocalDateTime desde, LocalDateTime hasta);

    long countByFechaHoraBetween(LocalDateTime desde, LocalDateTime hasta);

    long countByNivelRiesgo(NivelRiesgo nivelRiesgo);

    long countByClasificacion(Clasificacion clasificacion);

    long countByEstado(EstadoTransaccion estado);

    long countByClasificacionAndFechaHoraBetween(Clasificacion clasificacion, LocalDateTime desde, LocalDateTime hasta);

    @Query("select avg(t.tiempoEvaluacionMs) from Transaccion t where t.tiempoEvaluacionMs is not null")
    Double promedioTiempoEvaluacion();

    @Query("select coalesce(sum(t.monto), 0) from Transaccion t where t.clasificacion = :clasificacion "
            + "and t.fechaHora between :desde and :hasta")
    BigDecimal sumarMontoPorClasificacion(@Param("clasificacion") Clasificacion clasificacion,
                                          @Param("desde") LocalDateTime desde,
                                          @Param("hasta") LocalDateTime hasta);

}
