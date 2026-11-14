package pe.bbva.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pe.bbva.backend.repository.cliente.ClienteRepository;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;

import static org.assertj.core.api.Assertions.assertThat;

/** Levanta toda la aplicación con H2 en memoria y verifica que el DataInitializer cargó los datos demo. */
@SpringBootTest
class BackendApplicationTests {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private TransaccionRepository transaccionRepository;

    @Test
    void contextLoadsYCargaDatosDemo() {
        assertThat(usuarioRepository.findByCorreoIgnoreCase("admin@bbva.pe")).isPresent();
        assertThat(usuarioRepository.count()).isGreaterThanOrEqualTo(4);
        assertThat(clienteRepository.count()).isEqualTo(8);
        assertThat(transaccionRepository.count()).isGreaterThan(50);
    }
}
