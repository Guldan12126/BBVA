package pe.bbva.backend.repository.notificacion;

import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.notificacion.AtencionCliente;

import java.util.List;

public interface AtencionClienteRepository extends JpaRepository<AtencionCliente, Long> {

    List<AtencionCliente> findByAlertaIdOrderByFechaDesc(Long alertaId);

    List<AtencionCliente> findByOperadorIdOrderByFechaDesc(Long operadorId);


    List<AtencionCliente> findByOperadorIdAndFechaBetweenOrderByFechaDesc(Long operadorId, LocalDateTime desde, LocalDateTime hasta);

    long countByOperadorIdAndFechaBetween(Long operadorId, LocalDateTime desde, LocalDateTime hasta);

}
