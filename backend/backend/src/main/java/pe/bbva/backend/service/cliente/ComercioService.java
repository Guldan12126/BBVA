package pe.bbva.backend.service.cliente;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.cliente.Comercio;
import pe.bbva.backend.model.enums.CategoriaComercio;
import pe.bbva.backend.repository.cliente.ComercioRepository;
import pe.bbva.backend.util.GeoUtils;

import java.util.List;

@Service
public class ComercioService {

    private final ComercioRepository comercioRepository;

    public ComercioService(ComercioRepository comercioRepository) {
        this.comercioRepository = comercioRepository;
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
