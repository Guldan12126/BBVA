package pe.bbva.backend.repository.cliente;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.enums.*;
import pe.bbva.backend.model.cliente.Tarjeta;

import java.util.List;

public interface TarjetaRepository extends JpaRepository<Tarjeta, Long> {

    List<Tarjeta> findByClienteId(Long clienteId);

    List<Tarjeta> findByEstado(EstadoTarjeta estado);

    long countByEstado(EstadoTarjeta estado);

}
