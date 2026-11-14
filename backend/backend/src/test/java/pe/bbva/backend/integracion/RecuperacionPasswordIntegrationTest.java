package pe.bbva.backend.integracion;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pe.bbva.backend.exception.CodigoInvalidoException;
import pe.bbva.backend.service.notificacion.EmailService;
import pe.bbva.backend.service.seguridad.AuthService;
import pe.bbva.backend.service.seguridad.RecuperacionPasswordService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

/** "¿Olvidaste tu contraseña?": código por correo -> verificar -> nueva contraseña -> login. */
@SpringBootTest
class RecuperacionPasswordIntegrationTest {

    @MockitoBean
    private EmailService emailService;

    @Autowired
    private RecuperacionPasswordService recuperacionService;

    @Autowired
    private AuthService authService;

    @Test
    void flujoCompletoDeRecuperacion() {
        recuperacionService.solicitarCodigo("operador@bbva.pe");

        ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
        verify(emailService, timeout(2000)).enviarCodigoVerificacion(eq("operador@bbva.pe"), anyString(),
                codigo.capture(), anyInt());
        assertThat(codigo.getValue()).matches("\\d{6}");

        // Un código incorrecto resta un intento
        String incorrecto = codigo.getValue().equals("000000") ? "111111" : "000000";
        assertThatThrownBy(() -> recuperacionService.verificarCodigo("operador@bbva.pe", incorrecto))
                .isInstanceOf(CodigoInvalidoException.class)
                .hasMessageContaining("2 intento");

        RecuperacionPasswordService.ResultadoVerificacion r =
                recuperacionService.verificarCodigo("operador@bbva.pe", codigo.getValue());
        assertThat(r.resetToken()).isNotBlank();

        recuperacionService.restablecerPassword(r.resetToken(), "NuevaClave2026");
        assertThat(authService.login("operador@bbva.pe", "NuevaClave2026", "127.0.0.1").accessToken()).isNotBlank();

        // El resetToken solo sirve una vez
        assertThatThrownBy(() -> recuperacionService.restablecerPassword(r.resetToken(), "OtraClave2026"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void correoNoRegistradoNoLanzaError() {
        recuperacionService.solicitarCodigo("noexiste@bbva.pe");
    }
}
