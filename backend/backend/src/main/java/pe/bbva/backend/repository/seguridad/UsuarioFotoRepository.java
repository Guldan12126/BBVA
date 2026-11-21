package pe.bbva.backend.repository.seguridad;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.seguridad.UsuarioFoto;

public interface UsuarioFotoRepository extends JpaRepository<UsuarioFoto, Long> {
}
