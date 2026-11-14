package pe.bbva.backend.repository.notificacion;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.notificacion.AtencionCliente;

import java.util.List;

public interface AtencionClienteRepository extends JpaRepository<AtencionCliente, Long> {

    List<AtencionCliente> findByAlertaIdOrderByFechaDesc(Long alertaId);

    List<AtencionCliente> findByOperadorIdOrderByFechaDesc(Long operadorId);

}
