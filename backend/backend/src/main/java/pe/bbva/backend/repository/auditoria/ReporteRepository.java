package pe.bbva.backend.repository.auditoria;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.auditoria.Reporte;

import java.util.List;

public interface ReporteRepository extends JpaRepository<Reporte, Long> {

    List<Reporte> findAllByOrderByFechaGeneracionDesc();

}
