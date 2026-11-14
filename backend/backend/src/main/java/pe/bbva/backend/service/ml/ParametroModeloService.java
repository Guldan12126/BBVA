package pe.bbva.backend.service.ml;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.config.properties.RiesgoProperties;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.ml.ParametroModelo;
import pe.bbva.backend.repository.ml.ParametroModeloRepository;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.service.reporte.AuditoriaService;
import pe.bbva.backend.util.Constantes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/** Umbrales del motor de riesgo y versión activa del modelo, editables por el Administrador. */
@Service
public class ParametroModeloService {

    private static final Set<String> PARAMETROS_0_A_1 = Set.of(
            Constantes.PARAM_UMBRAL_ALERTA, Constantes.PARAM_UMBRAL_CRITICO, Constantes.PARAM_PESO_IA);

    private final ParametroModeloRepository repository;
    private final RiesgoProperties props;
    private final AuditoriaService auditoriaService;

    public ParametroModeloService(ParametroModeloRepository repository, RiesgoProperties props,
                                  AuditoriaService auditoriaService) {
        this.repository = repository;
        this.props = props;
        this.auditoriaService = auditoriaService;
    }

    public double umbralAlerta() {
        return obtenerDouble(Constantes.PARAM_UMBRAL_ALERTA, props.umbralAlerta());
    }

    public double umbralCritico() {
        return obtenerDouble(Constantes.PARAM_UMBRAL_CRITICO, props.umbralCritico());
    }

    public double pesoIa() {
        return obtenerDouble(Constantes.PARAM_PESO_IA, props.pesoIa());
    }

    public String versionActiva() {
        return repository.findByClave(Constantes.PARAM_VERSION_MODELO)
                .map(ParametroModelo::getValor)
                .orElse("sin-modelo");
    }

    private double obtenerDouble(String clave, double porDefecto) {
        return repository.findByClave(clave)
                .map(p -> {
                    try {
                        return Double.parseDouble(p.getValor());
                    } catch (NumberFormatException e) {
                        return porDefecto;
                    }
                })
                .orElse(porDefecto);
    }

    @Transactional(readOnly = true)
    public List<ParametroModelo> listar() {
        return repository.findAllByOrderByClaveAsc();
    }

    @Transactional
    public void inicializar(String clave, String valor, String descripcion) {
        if (repository.findByClave(clave).isEmpty()) {
            repository.save(new ParametroModelo(clave, valor, descripcion));
        }
    }

    @Transactional
    public ParametroModelo actualizar(String clave, String valor) {
        ParametroModelo p = repository.findByClave(clave)
                .orElseThrow(() -> new ResourceNotFoundException("Parámetro", clave));
        if (PARAMETROS_0_A_1.contains(clave)) {
            double numero;
            try {
                numero = Double.parseDouble(valor);
            } catch (NumberFormatException e) {
                throw new BusinessException(ErrorCode.VALIDACION, "El valor debe ser un número entre 0 y 1");
            }
            if (numero < 0 || numero > 1) {
                throw new BusinessException(ErrorCode.VALIDACION, "El valor debe estar entre 0 y 1");
            }
            double alerta = clave.equals(Constantes.PARAM_UMBRAL_ALERTA) ? numero : umbralAlerta();
            double critico = clave.equals(Constantes.PARAM_UMBRAL_CRITICO) ? numero : umbralCritico();
            if (alerta >= critico) {
                throw new BusinessException("El umbral de alerta debe ser menor que el umbral crítico");
            }
        }
        String anterior = p.getValor();
        p.setValor(valor);
        p.setFechaModificacion(LocalDateTime.now());
        p.setModificadoPor(SecurityUtils.correoActual().orElse(Constantes.USUARIO_SISTEMA));
        repository.save(p);
        auditoriaService.registrar(TipoAccion.ACTUALIZAR_PARAMETRO, null,
                clave + ": " + anterior + " -> " + valor);
        return p;
    }

    @Transactional
    public void guardarVersionActiva(String version) {
        ParametroModelo p = repository.findByClave(Constantes.PARAM_VERSION_MODELO)
                .orElseGet(() -> new ParametroModelo(Constantes.PARAM_VERSION_MODELO, version,
                        "Versión del modelo de ML en uso"));
        p.setValor(version);
        p.setFechaModificacion(LocalDateTime.now());
        repository.save(p);
    }
}
