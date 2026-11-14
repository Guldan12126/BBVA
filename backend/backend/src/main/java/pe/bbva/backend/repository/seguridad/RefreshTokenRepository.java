package pe.bbva.backend.repository.seguridad;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.bbva.backend.model.seguridad.RefreshToken;
import pe.bbva.backend.model.seguridad.Usuario;
import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Query("update RefreshToken r set r.revocado = true where r.usuario = :usuario and r.revocado = false")
    int revocarTodos(@Param("usuario") Usuario usuario);

    @Modifying
    @Query("delete from RefreshToken r where r.fechaExpiracion < :limite")
    int eliminarVencidos(@Param("limite") LocalDateTime limite);

}
