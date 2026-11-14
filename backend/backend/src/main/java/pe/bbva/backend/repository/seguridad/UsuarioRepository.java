package pe.bbva.backend.repository.seguridad;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.seguridad.Usuario;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByCorreoIgnoreCase(String correo);

    boolean existsByCorreoIgnoreCase(String correo);

    List<Usuario> findByRol(Rol rol);

    List<Usuario> findByRolAndEstado(Rol rol, EstadoUsuario estado);

    long countByEstado(EstadoUsuario estado);

}
