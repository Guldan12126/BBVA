package pe.bbva.backend.service.fraude;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.ia.FeatureBuilder;
import pe.bbva.backend.ia.ModeloIaClient;
import pe.bbva.backend.ia.ReglasFallback;
import pe.bbva.backend.model.cliente.PerfilCliente;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.fraude.FactorExplicativo;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.service.cliente.PerfilClienteService;
import pe.bbva.backend.service.ml.ParametroModeloService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Corazón del sistema. Para cada transacción:
 * 1) revisa la lista negra, 2) aplica las reglas configurables,
 * 3) pide la probabilidad al modelo de IA (o usa el respaldo si no responde),
 * 4) combina todo en un score de 0 a 1 y asigna el nivel de riesgo.
 */
@Service
public class MotorRiesgoService {

    private static final int MAX_FACTORES = 5;

    /** Resultado de la evaluación. */
    public record ResultadoEvaluacion(double score, NivelRiesgo nivel, List<FactorExplicativo> factores,
                                      boolean evaluadoPorIa, String versionModelo, long tiempoMs,
                                      boolean enListaNegra, Map<String, Object> variables) {
    }

    private final ListaNegraService listaNegraService;
    private final ReglaFraudeService reglaFraudeService;
    private final PerfilClienteService perfilClienteService;
    private final ParametroModeloService parametroService;
    private final TransaccionRepository transaccionRepository;
    private final FeatureBuilder featureBuilder;
    private final ModeloIaClient modeloIaClient;
    private final ReglasFallback reglasFallback;

    public MotorRiesgoService(ListaNegraService listaNegraService, ReglaFraudeService reglaFraudeService,
                              PerfilClienteService perfilClienteService, ParametroModeloService parametroService,
                              TransaccionRepository transaccionRepository, FeatureBuilder featureBuilder,
                              ModeloIaClient modeloIaClient, ReglasFallback reglasFallback) {
        this.listaNegraService = listaNegraService;
        this.reglaFraudeService = reglaFraudeService;
        this.perfilClienteService = perfilClienteService;
        this.parametroService = parametroService;
        this.transaccionRepository = transaccionRepository;
        this.featureBuilder = featureBuilder;
        this.modeloIaClient = modeloIaClient;
        this.reglasFallback = reglasFallback;
    }

    /** Evalúa una transacción que todavía no se ha guardado. */
    @Transactional
    public ResultadoEvaluacion evaluar(Transaccion tx) {
        long inicio = System.currentTimeMillis();
        Long clienteId = tx.getTarjeta().getCliente().getId();
        PerfilCliente perfil = perfilClienteService.obtenerOCrear(tx.getTarjeta().getCliente());

        long txUltimaHora = transaccionRepository.countByTarjetaIdAndFechaHoraBetween(
                tx.getTarjeta().getId(), tx.getFechaHora().minusHours(1), tx.getFechaHora());
        boolean comercioNuevo = !transaccionRepository.existsByTarjetaClienteIdAndComercioIdAndIdNot(
                clienteId, tx.getComercio().getId(), tx.getId() == null ? -1L : tx.getId());

        Map<String, Object> variables = featureBuilder.construir(tx, perfil, txUltimaHora, comercioNuevo);

        // 1) Lista negra
        Optional<String> listaNegra = listaNegraService.verificar(tx);

        // 2) Reglas configurables
        ReglaFraudeService.ResultadoReglas reglas = reglaFraudeService.evaluar(tx, variables);

        // 3) Modelo de IA (o reglas de respaldo)
        Optional<ModeloIaClient.PrediccionResponse> ia = modeloIaClient.predecir(variables);
        ModeloIaClient.PrediccionResponse prediccion = ia.orElseGet(() -> reglasFallback.evaluar(variables));

        // 4) Score final
        double score;
        if (ia.isPresent()) {
            double peso = parametroService.pesoIa();
            score = peso * prediccion.score() + (1 - peso) * reglas.score();
        } else {
            score = Math.max(prediccion.score(), reglas.score());
        }

        List<FactorExplicativo> factores = new ArrayList<>(reglas.factores());
        if (prediccion.factores() != null) {
            prediccion.factores().forEach(f ->
                    factores.add(new FactorExplicativo(f.factor(), f.descripcion(), f.impacto())));
        }
        if (listaNegra.isPresent()) {
            score = Math.max(score, 0.99);
            factores.add(0, new FactorExplicativo("lista_negra", listaNegra.get(), 1.0));
        }

        score = BigDecimal.valueOf(Math.min(score, 1.0)).setScale(4, RoundingMode.HALF_UP).doubleValue();
        NivelRiesgo nivel = NivelRiesgo.desdeScore(score, parametroService.umbralAlerta(),
                parametroService.umbralCritico());
        String version = ia.isPresent() && prediccion.versionModelo() != null
                ? prediccion.versionModelo() : ReglasFallback.VERSION;

        return new ResultadoEvaluacion(score, nivel, resumirFactores(factores), ia.isPresent(), version,
                System.currentTimeMillis() - inicio, listaNegra.isPresent(), variables);
    }

    /** Quita factores repetidos (se queda con el de mayor impacto) y deja los 5 más importantes. */
    private List<FactorExplicativo> resumirFactores(List<FactorExplicativo> factores) {
        Map<String, FactorExplicativo> unicos = new LinkedHashMap<>();
        for (FactorExplicativo f : factores) {
            FactorExplicativo previo = unicos.get(f.getFactor());
            double impacto = f.getImpacto() == null ? 0 : f.getImpacto();
            if (previo == null || (previo.getImpacto() == null ? 0 : previo.getImpacto()) < impacto) {
                unicos.put(f.getFactor(), f);
            }
        }
        return unicos.values().stream()
                .sorted(Comparator.comparing((FactorExplicativo f) -> f.getImpacto() == null ? 0 : f.getImpacto())
                        .reversed())
                .limit(MAX_FACTORES)
                .toList();
    }
}
