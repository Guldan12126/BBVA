package pe.bbva.backend.repository.notificacion;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.notificacion.Notificacion;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    Optional<Notificacion> findByToken(String token);

    List<Notificacion> findByAlertaIdOrderByFechaEnvioDesc(Long alertaId);

    List<Notificacion> findByClienteIdOrderByFechaEnvioDesc(Long clienteId);

    List<Notificacion> findAllByOrderByFechaEnvioDesc();

    List<Notificacion> findByEstadoAndFechaExpiracionBefore(EstadoNotificacion estado, LocalDateTime limite);

}
