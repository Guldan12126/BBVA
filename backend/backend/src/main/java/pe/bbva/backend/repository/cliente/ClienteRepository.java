package pe.bbva.backend.repository.cliente;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.bbva.backend.model.cliente.Cliente;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    Optional<Cliente> findByDni(String dni);

    boolean existsByDni(String dni);

    @Query("select c from Cliente c where lower(c.nombres) like lower(concat('%', :q, '%')) "
            + "or lower(c.apellidos) like lower(concat('%', :q, '%')) or c.dni like concat('%', :q, '%')")
    Page<Cliente> buscar(@Param("q") String q, Pageable pageable);

}
