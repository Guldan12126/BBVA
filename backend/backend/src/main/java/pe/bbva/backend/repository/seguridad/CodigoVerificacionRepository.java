package pe.bbva.backend.repository.seguridad;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.seguridad.CodigoVerificacion;
import pe.bbva.backend.model.seguridad.Usuario;
import java.time.LocalDateTime;
import java.util.Optional;

public interface CodigoVerificacionRepository extends JpaRepository<CodigoVerificacion, Long> {

    Optional<CodigoVerificacion> findTopByUsuarioAndTipoOrderByFechaCreacionDesc(Usuario usuario, TipoCodigo tipo);

    Optional<CodigoVerificacion> findByResetTokenHash(String resetTokenHash);

    @Modifying
    @Query("update CodigoVerificacion c set c.usado = true where c.usuario = :usuario and c.tipo = :tipo and c.usado = false")
    int invalidarAnteriores(@Param("usuario") Usuario usuario, @Param("tipo") TipoCodigo tipo);

    @Modifying
    @Query("delete from CodigoVerificacion c where c.fechaExpiracion < :limite "
            + "and (c.resetTokenExpiracion is null or c.resetTokenExpiracion < :limite)")
    int eliminarVencidos(@Param("limite") LocalDateTime limite);

}
