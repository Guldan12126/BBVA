package pe.bbva.backend.repository.auditoria;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.auditoria.HistorialDecision;

import java.util.List;

public interface HistorialDecisionRepository extends JpaRepository<HistorialDecision, Long>, JpaSpecificationExecutor<HistorialDecision> {

    List<HistorialDecision> findByFechaGreaterThanEqual(java.time.LocalDateTime desde);

    Page<HistorialDecision> findAllByOrderByFechaDesc(Pageable pageable);

    Page<HistorialDecision> findByUsuarioIdOrderByFechaDesc(Long usuarioId, Pageable pageable);

    Page<HistorialDecision> findByAccionOrderByFechaDesc(TipoAccion accion, Pageable pageable);

    List<HistorialDecision> findByAlertaIdOrderByFechaAsc(Long alertaId);

}
