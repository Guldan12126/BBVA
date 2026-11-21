package pe.bbva.backend.repository.seguridad;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.seguridad.RegistroAcceso;

public interface RegistroAccesoRepository extends JpaRepository<RegistroAcceso, Long> {

    Page<RegistroAcceso> findAllByOrderByFechaDesc(Pageable pageable);

    Page<RegistroAcceso> findByCorreoIgnoreCaseOrderByFechaDesc(String correo, Pageable pageable);


    long countByExitosoFalseAndFechaAfter(java.time.LocalDateTime desde);

    java.util.List<RegistroAcceso> findTop6ByOrderByFechaDesc();

}
