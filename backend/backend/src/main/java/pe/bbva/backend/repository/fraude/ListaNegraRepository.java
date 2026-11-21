package pe.bbva.backend.repository.fraude;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.fraude.ListaNegra;

import java.util.List;

public interface ListaNegraRepository extends JpaRepository<ListaNegra, Long> {

    List<ListaNegra> findByTipoAndValorAndActivoTrue(TipoListaNegra tipo, String valor);

    List<ListaNegra> findAllByOrderByFechaCreacionDesc();


    long countByActivoTrue();

}
