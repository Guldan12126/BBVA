package pe.bbva.backend.repository.cliente;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.bbva.backend.model.cliente.PerfilCliente;

import java.util.Optional;

public interface PerfilClienteRepository extends JpaRepository<PerfilCliente, Long> {

    Optional<PerfilCliente> findByClienteId(Long clienteId);

}
