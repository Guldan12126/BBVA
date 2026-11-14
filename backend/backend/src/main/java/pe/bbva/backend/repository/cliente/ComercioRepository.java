package pe.bbva.backend.repository.cliente;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.cliente.Comercio;

import java.util.List;

public interface ComercioRepository extends JpaRepository<Comercio, Long> {

    List<Comercio> findByCategoria(CategoriaComercio categoria);

    List<Comercio> findByInternacional(Boolean internacional);

}
