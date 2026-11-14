package pe.bbva.backend.service.fraude;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.ia.FeatureBuilder;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.fraude.FactorExplicativo;
import pe.bbva.backend.model.fraude.ReglaFraude;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.fraude.ReglaFraudeRepository;
import pe.bbva.backend.service.reporte.AuditoriaService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Evalúa las reglas configurables del motor de riesgo. */
@Service
public class ReglaFraudeService {

    /** Resultado de aplicar todas las reglas activas. */
    public record ResultadoReglas(double score, List<FactorExplicativo> factores, List<String> reglasCumplidas) {
    }

    private final ReglaFraudeRepository reglaRepository;
    private final AuditoriaService auditoriaService;

    public ReglaFraudeService(ReglaFraudeRepository reglaRepository, AuditoriaService auditoriaService) {
        this.reglaRepository = reglaRepository;
        this.auditoriaService = auditoriaService;
    }

    @Transactional(readOnly = true)
    public ResultadoReglas evaluar(Transaccion tx, Map<String, Object> variables) {
        double score = 0;
        List<FactorExplicativo> factores = new ArrayList<>();
        List<String> cumplidas = new ArrayList<>();

        for (ReglaFraude regla : reglaRepository.findByActivaTrue()) {
            double umbral = regla.getValorUmbral();
            boolean cumple;
            String factor;
            String descripcion;
            switch (regla.getTipo()) {
                case MONTO -> {
                    cumple = tx.getMonto().doubleValue() > umbral;
                    factor = FeatureBuilder.MONTO;
                    descripcion = "Monto elevado (S/ " + tx.getMonto() + ")";
                }
                case RATIO_MONTO -> {
                    double ratio = FeatureBuilder.numero(variables, FeatureBuilder.RATIO_MONTO);
                    cumple = ratio > umbral;
                    factor = FeatureBuilder.RATIO_MONTO;
                    descripcion = "Importe inusual: " + ratio + " veces su gasto promedio";
                }
                case UBICACION -> {
                    double km = FeatureBuilder.numero(variables, FeatureBuilder.DISTANCIA);
                    cumple = km > umbral;
                    factor = FeatureBuilder.DISTANCIA;
                    descripcion = "Ubicación atípica: a " + Math.round(km) + " km de su ciudad habitual";
                }
                case FRECUENCIA -> {
                    double cantidad = FeatureBuilder.numero(variables, FeatureBuilder.TX_ULTIMA_HORA);
                    cumple = cantidad >= umbral;
                    factor = FeatureBuilder.TX_ULTIMA_HORA;
                    descripcion = "Frecuencia elevada: " + (long) cantidad + " compras en la última hora";
                }
                case HORARIO -> {
                    double hora = FeatureBuilder.numero(variables, FeatureBuilder.HORA);
                    cumple = hora < umbral;
                    factor = FeatureBuilder.HORA;
                    descripcion = "Compra en horario inusual (" + (int) hora + ":00 h)";
                }
                case COMERCIO_RIESGO -> {
                    NivelRiesgo nivel = tx.getComercio().getNivelRiesgo();
                    cumple = tx.getComercio().getCategoria().getRiesgoBase() >= umbral
                            || nivel == NivelRiesgo.ALTO || nivel == NivelRiesgo.CRITICO;
                    factor = FeatureBuilder.CATEGORIA;
                    descripcion = "Comercio de alto riesgo (" + tx.getComercio().getCategoria() + ")";
                }
                default -> {
                    cumple = false;
                    factor = "";
                    descripcion = "";
                }
            }
            if (cumple) {
                score += regla.getPeso();
                factores.add(new FactorExplicativo(factor, descripcion, regla.getPeso()));
                cumplidas.add(regla.getNombre());
            }
        }
        return new ResultadoReglas(Math.min(score, 1.0), factores, cumplidas);
    }

    @Transactional(readOnly = true)
    public List<ReglaFraude> listar() {
        return reglaRepository.findAllByOrderByIdAsc();
    }

    @Transactional(readOnly = true)
    public ReglaFraude obtener(Long id) {
        return reglaRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Regla", id));
    }

    @Transactional
    public ReglaFraude crear(ReglaFraude regla) {
        regla.setId(null);
        ReglaFraude guardada = reglaRepository.save(regla);
        auditoriaService.registrar(TipoAccion.ACTUALIZAR_REGLA, null, "Regla creada: " + regla.getNombre());
        return guardada;
    }

    @Transactional
    public ReglaFraude actualizar(Long id, ReglaFraude datos) {
        ReglaFraude r = obtener(id);
        r.setNombre(datos.getNombre());
        r.setDescripcion(datos.getDescripcion());
        r.setTipo(datos.getTipo());
        r.setValorUmbral(datos.getValorUmbral());
        r.setPeso(datos.getPeso());
        r.setActiva(datos.getActiva());
        reglaRepository.save(r);
        auditoriaService.registrar(TipoAccion.ACTUALIZAR_REGLA, null, "Regla actualizada: " + r.getNombre());
        return r;
    }

    @Transactional
    public ReglaFraude cambiarActiva(Long id, boolean activa) {
        ReglaFraude r = obtener(id);
        r.setActiva(activa);
        reglaRepository.save(r);
        auditoriaService.registrar(TipoAccion.ACTUALIZAR_REGLA, null,
                "Regla " + r.getNombre() + (activa ? " activada" : " desactivada"));
        return r;
    }
}
