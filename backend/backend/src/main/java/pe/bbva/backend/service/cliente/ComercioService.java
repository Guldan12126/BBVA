package pe.bbva.backend.service.cliente;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.cliente.Comercio;
import pe.bbva.backend.model.enums.CategoriaComercio;
import pe.bbva.backend.repository.cliente.ComercioRepository;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.util.GeoUtils;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ComercioService {

    private final ComercioRepository comercioRepository;
    private final TransaccionRepository transaccionRepository;
    private final AlertaRepository alertaRepository;

    public ComercioService(ComercioRepository comercioRepository, TransaccionRepository transaccionRepository,
                           AlertaRepository alertaRepository) {
        this.comercioRepository = comercioRepository;
        this.transaccionRepository = transaccionRepository;
        this.alertaRepository = alertaRepository;
    }

    /** Actividad de cada comercio (clave: id del comercio): transacciones, monto, fraudes, alertas, última compra. */
    @Transactional(readOnly = true)
    public Map<Long, Map<String, Object>> estadisticas() {
        Map<Long, Long> alertas = new HashMap<>();
        for (Object[] f : alertaRepository.alertasPorComercio()) {
            alertas.put((Long) f[0], ((Number) f[1]).longValue());
        }
        Map<Long, Map<String, Object>> r = new HashMap<>();
        for (Object[] f : transaccionRepository.estadisticasPorComercio()) {
            Long id = (Long) f[0];
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("transacciones", ((Number) f[1]).longValue());
            m.put("monto", f[2]);
            m.put("ultimaCompra", f[3]);
            m.put("fraudulentas", f[4] == null ? 0 : ((Number) f[4]).longValue());
            m.put("sospechosas", f[5] == null ? 0 : ((Number) f[5]).longValue());
            m.put("alertas", alertas.getOrDefault(id, 0L));
            r.put(id, m);
        }
        return r;
    }

    @Transactional(readOnly = true)
    public List<Comercio> listar(CategoriaComercio categoria) {
        return categoria == null ? comercioRepository.findAll() : comercioRepository.findByCategoria(categoria);
    }

    @Transactional(readOnly = true)
    public Comercio obtener(Long id) {
        return comercioRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Comercio", id));
    }

    @Transactional
    public Comercio crear(Comercio datos) {
        datos.setId(null);
        completarCoordenadas(datos);
        return comercioRepository.save(datos);
    }

    @Transactional
    public Comercio actualizar(Long id, Comercio datos) {
        Comercio c = obtener(id);
        c.setNombre(datos.getNombre());
        c.setCategoria(datos.getCategoria());
        c.setCiudad(datos.getCiudad());
        c.setLatitud(datos.getLatitud());
        c.setLongitud(datos.getLongitud());
        c.setNivelRiesgo(datos.getNivelRiesgo());
        c.setInternacional(datos.getInternacional());
        completarCoordenadas(c);
        return comercioRepository.save(c);
    }

    private void completarCoordenadas(Comercio c) {
        if (c.getLatitud() == null || c.getLongitud() == null) {
            double[] coord = GeoUtils.coordenadas(c.getCiudad());
            if (coord != null) {
                c.setLatitud(coord[0]);
                c.setLongitud(coord[1]);
            }
        }
    }
}
