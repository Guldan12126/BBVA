package pe.bbva.backend.repository.notificacion;

import java.util.Collection;
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


    long countByEstado(EstadoNotificacion estado);

    long countByEstadoIn(Collection<EstadoNotificacion> estados);

    List<Notificacion> findTop8ByEstadoInOrderByFechaEnvioDesc(Collection<EstadoNotificacion> estados);

}
