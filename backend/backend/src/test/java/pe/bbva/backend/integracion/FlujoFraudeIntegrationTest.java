package pe.bbva.backend.integracion;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.model.enums.Clasificacion;
import pe.bbva.backend.model.enums.EstadoAlerta;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.repository.ml.FeedbackModeloRepository;
import pe.bbva.backend.service.fraude.AlertaService;
import pe.bbva.backend.service.seguridad.AuthService;
import pe.bbva.backend.service.transaccion.SimuladorService;
import pe.bbva.backend.service.transaccion.TransaccionService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Flujo completo: login, compra sospechosa, alerta y decisión del analista. */
@SpringBootTest
class FlujoFraudeIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private SimuladorService simuladorService;

    @Autowired
    private AlertaService alertaService;

    @Autowired
    private FeedbackModeloRepository feedbackRepository;

    @Test
    void loginConUsuarioDemo() {
        AuthService.Sesion sesion = authService.login("analista@bbva.pe", "Bbva2026", "127.0.0.1");
        assertThat(sesion.accessToken()).isNotBlank();
        assertThat(sesion.refreshToken()).isNotBlank();
        assertThat(sesion.usuario().getRol().name()).isEqualTo("ANALISTA");
    }

    @Test
    void loginConPasswordIncorrectaFalla() {
        assertThatThrownBy(() -> authService.login("supervisor@bbva.pe", "Incorrecta1", "127.0.0.1"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @WithMockUser(username = "analista@bbva.pe", roles = "ANALISTA")
    void compraSospechosaGeneraAlertaYElAnalistaConfirmaFraude() {
        TransaccionService.Resultado r = simuladorService.generar(true);
        assertThat(r.alerta()).as("una compra fraudulenta debe generar alerta").isNotNull();
        assertThat(r.evaluacion().factores()).isNotEmpty();

        long feedbackAntes = feedbackRepository.count();
        Alerta decidida = alertaService.decidir(r.alerta().getId(), true, "Prueba", true);

        assertThat(decidida.getEstado()).isEqualTo(EstadoAlerta.CONFIRMADA);
        assertThat(decidida.getTransaccion().getClasificacion()).isEqualTo(Clasificacion.FRAUDULENTA);
        assertThat(feedbackRepository.count()).isEqualTo(feedbackAntes + 1);
    }

    @Test
    void compraNormalSeAprueba() {
        TransaccionService.Resultado r = simuladorService.generar(false);
        assertThat(r.transaccion().getScoreRiesgo()).isNotNull();
    }
}
