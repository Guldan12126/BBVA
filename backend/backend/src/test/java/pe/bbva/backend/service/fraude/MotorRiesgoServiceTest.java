package pe.bbva.backend.service.fraude;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.bbva.backend.ia.FeatureBuilder;
import pe.bbva.backend.ia.ModeloIaClient;
import pe.bbva.backend.ia.ReglasFallback;
import pe.bbva.backend.model.cliente.Cliente;
import pe.bbva.backend.model.cliente.Comercio;
import pe.bbva.backend.model.cliente.PerfilCliente;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.Canal;
import pe.bbva.backend.model.enums.CategoriaComercio;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.service.cliente.PerfilClienteService;
import pe.bbva.backend.service.ml.ParametroModeloService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MotorRiesgoServiceTest {

    @Mock
    private ListaNegraService listaNegraService;
    @Mock
    private ReglaFraudeService reglaFraudeService;
    @Mock
    private PerfilClienteService perfilClienteService;
    @Mock
    private ParametroModeloService parametroService;
    @Mock
    private TransaccionRepository transaccionRepository;
    @Mock
    private ModeloIaClient modeloIaClient;

    private MotorRiesgoService motor;
    private Transaccion tx;

    @BeforeEach
    void preparar() {
        motor = new MotorRiesgoService(listaNegraService, reglaFraudeService, perfilClienteService, parametroService,
                transaccionRepository, new FeatureBuilder(), modeloIaClient, new ReglasFallback());

        Cliente cliente = new Cliente();
        cliente.setId(1L);
        cliente.setCiudad("Piura");
        Tarjeta tarjeta = new Tarjeta();
        tarjeta.setId(1L);
        tarjeta.setCliente(cliente);
        Comercio comercio = new Comercio();
        comercio.setId(1L);
        comercio.setNombre("Supermercado");
        comercio.setCategoria(CategoriaComercio.SUPERMERCADO);
        comercio.setInternacional(false);

        tx = new Transaccion();
        tx.setCodigo("TX-TEST");
        tx.setTarjeta(tarjeta);
        tx.setComercio(comercio);
        tx.setMonto(new BigDecimal("150.00"));
        tx.setCanal(Canal.POS);
        tx.setFechaHora(LocalDateTime.of(2026, 11, 10, 12, 0));
        tx.setLatitud(-5.19);
        tx.setLongitud(-80.63);

        PerfilCliente perfil = new PerfilCliente();
        perfil.setMontoPromedio(new BigDecimal("140.00"));
        perfil.setLatitudHabitual(-5.19);
        perfil.setLongitudHabitual(-80.63);

        when(perfilClienteService.obtenerOCrear(any())).thenReturn(perfil);
        when(transaccionRepository.countByTarjetaIdAndFechaHoraBetween(anyLong(), any(), any())).thenReturn(0L);
        when(transaccionRepository.existsByTarjetaClienteIdAndComercioIdAndIdNot(anyLong(), anyLong(), anyLong()))
                .thenReturn(true);
        lenient().when(listaNegraService.verificar(any())).thenReturn(Optional.empty());
        when(reglaFraudeService.evaluar(any(), any()))
                .thenReturn(new ReglaFraudeService.ResultadoReglas(0.0, List.of(), List.of()));
        when(parametroService.umbralAlerta()).thenReturn(0.70);
        when(parametroService.umbralCritico()).thenReturn(0.90);
    }

    @Test
    void usaElModeloDeIaCuandoResponde() {
        when(parametroService.pesoIa()).thenReturn(0.70);
        when(modeloIaClient.predecir(any())).thenReturn(Optional.of(new ModeloIaClient.PrediccionResponse(
                "TX-TEST", 0.95, "CRITICO", "xgboost-v1", 12L,
                List.of(new ModeloIaClient.Factor("distancia_ubicacion_habitual_km", "Ubicación atípica", 0.4)))));

        MotorRiesgoService.ResultadoEvaluacion r = motor.evaluar(tx);

        assertThat(r.evaluadoPorIa()).isTrue();
        assertThat(r.score()).isEqualTo(0.665); // 0.7 * 0.95 + 0.3 * 0.0
        assertThat(r.nivel()).isEqualTo(NivelRiesgo.MEDIO);
        assertThat(r.versionModelo()).isEqualTo("xgboost-v1");
        assertThat(r.factores()).extracting("descripcion").contains("Ubicación atípica");
    }

    @Test
    void usaReglasDeRespaldoSiLaIaNoResponde() {
        when(modeloIaClient.predecir(any())).thenReturn(Optional.empty());

        MotorRiesgoService.ResultadoEvaluacion r = motor.evaluar(tx);

        assertThat(r.evaluadoPorIa()).isFalse();
        assertThat(r.versionModelo()).isEqualTo(ReglasFallback.VERSION);
        assertThat(r.nivel()).isEqualTo(NivelRiesgo.BAJO);
    }

    @Test
    void listaNegraDaRiesgoCritico() {
        when(modeloIaClient.predecir(any())).thenReturn(Optional.empty());
        when(listaNegraService.verificar(any())).thenReturn(Optional.of("TARJETA en lista negra"));

        MotorRiesgoService.ResultadoEvaluacion r = motor.evaluar(tx);

        assertThat(r.score()).isGreaterThanOrEqualTo(0.99);
        assertThat(r.nivel()).isEqualTo(NivelRiesgo.CRITICO);
        assertThat(r.enListaNegra()).isTrue();
    }
}
