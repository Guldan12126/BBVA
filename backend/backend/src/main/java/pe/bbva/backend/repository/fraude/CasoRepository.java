package pe.bbva.backend.repository.fraude;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.fraude.Caso;

import java.util.List;
import java.util.Optional;

public interface CasoRepository extends JpaRepository<Caso, Long> {

    Optional<Caso> findByCodigo(String codigo);

    List<Caso> findAllByOrderByFechaCreacionDesc();

    List<Caso> findByEstadoOrderByFechaCreacionDesc(EstadoCaso estado);

    List<Caso> findByClienteId(Long clienteId);


    long countByEstadoIn(java.util.Collection<EstadoCaso> estados);

}
