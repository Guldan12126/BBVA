package pe.bbva.backend.service.ml;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.ia.EntrenamientoClient;
import pe.bbva.backend.ia.FeatureBuilder;
import pe.bbva.backend.ia.ModeloIaClient;
import pe.bbva.backend.model.cliente.PerfilCliente;
import pe.bbva.backend.model.enums.EstadoModelo;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.ml.FeedbackModelo;
import pe.bbva.backend.model.ml.VersionModelo;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.ml.VersionModeloRepository;
import pe.bbva.backend.service.cliente.PerfilClienteService;
import pe.bbva.backend.service.reporte.AuditoriaService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Estado del microservicio de IA, versiones del modelo y reentrenamiento. */
@Service
public class ModeloIaService {

    private static final int MINIMO_MUESTRAS = 10;

    private final ModeloIaClient modeloIaClient;
    private final EntrenamientoClient entrenamientoClient;
    private final VersionModeloRepository versionRepository;
    private final FeedbackService feedbackService;
    private final ParametroModeloService parametroService;
    private final PerfilClienteService perfilClienteService;
    private final FeatureBuilder featureBuilder;
    private final AuditoriaService auditoriaService;

    public ModeloIaService(ModeloIaClient modeloIaClient, EntrenamientoClient entrenamientoClient,
                           VersionModeloRepository versionRepository, FeedbackService feedbackService,
                           ParametroModeloService parametroService, PerfilClienteService perfilClienteService,
                           FeatureBuilder featureBuilder, AuditoriaService auditoriaService) {
        this.modeloIaClient = modeloIaClient;
        this.entrenamientoClient = entrenamientoClient;
        this.versionRepository = versionRepository;
        this.feedbackService = feedbackService;
        this.parametroService = parametroService;
        this.perfilClienteService = perfilClienteService;
        this.featureBuilder = featureBuilder;
        this.auditoriaService = auditoriaService;
    }

    public Map<String, Object> estado() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("habilitado", modeloIaClient.isHabilitado());
        m.put("disponible", modeloIaClient.isDisponible());
        m.put("url", modeloIaClient.getUrl());
        m.put("ultimaVerificacion", modeloIaClient.getUltimaVerificacion());
        m.put("versionActiva", parametroService.versionActiva());
        m.put("umbralAlerta", parametroService.umbralAlerta());
        m.put("umbralCritico", parametroService.umbralCritico());
        m.put("pesoIa", parametroService.pesoIa());
        m.put("feedbackPendiente", feedbackService.contarPendientes());
        return m;
    }

    public boolean verificarSalud() {
        return modeloIaClient.verificarSalud();
    }

    public Map<String, Object> informacionModelo() {
        return modeloIaClient.informacionModelo()
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.SERVICIO_IA_NO_DISPONIBLE));
    }

    @Transactional(readOnly = true)
    public List<VersionModelo> versiones() {
        return versionRepository.findAllByOrderByFechaEntrenamientoDesc();
    }

    /** Envía las decisiones de los analistas a FastAPI y registra la nueva versión del modelo. */
    @Transactional
    public VersionModelo reentrenar() {
        List<FeedbackModelo> pendientes = feedbackService.pendientes();
        if (pendientes.size() < MINIMO_MUESTRAS) {
            throw new BusinessException("Se necesitan al menos " + MINIMO_MUESTRAS
                    + " decisiones de analistas para reentrenar. Hay " + pendientes.size());
        }
        List<Map<String, Object>> muestras = new ArrayList<>();
        for (FeedbackModelo f : pendientes) {
            Transaccion tx = f.getTransaccion();
            PerfilCliente perfil = perfilClienteService.obtenerOCrear(tx.getTarjeta().getCliente());
            Map<String, Object> variables = featureBuilder.construir(tx, perfil, 0, false);
            variables.put("es_fraude", f.getEsFraude());
            muestras.add(variables);
        }

        EntrenamientoClient.ResultadoEntrenamiento r = entrenamientoClient.entrenar(muestras);

        versionRepository.findByEstado(EstadoModelo.ACTIVO).forEach(v -> {
            v.setEstado(EstadoModelo.RETIRADO);
            versionRepository.save(v);
        });
        VersionModelo v = versionRepository.findByVersion(r.version()).orElseGet(VersionModelo::new);
        v.setVersion(r.version());
        v.setAlgoritmo(r.algoritmo() != null ? r.algoritmo() : "XGBoost");
        v.setEstado(EstadoModelo.ACTIVO);
        v.setPrecisionScore(r.precisionScore());
        v.setRecallScore(r.recallScore());
        v.setF1Score(r.f1Score());
        v.setAucRoc(r.aucRoc());
        v.setMuestrasEntrenamiento(r.muestras() != null ? r.muestras() : muestras.size());
        v.setFechaEntrenamiento(LocalDateTime.now());
        v.setObservaciones("Reentrenado con " + muestras.size() + " decisiones de analistas");
        versionRepository.save(v);

        parametroService.guardarVersionActiva(v.getVersion());
        feedbackService.marcarUsados(pendientes);
        auditoriaService.registrar(TipoAccion.REENTRENAR_MODELO, null,
                "Nueva versión " + v.getVersion() + " (recall=" + v.getRecallScore() + ")");
        return v;
    }
}
