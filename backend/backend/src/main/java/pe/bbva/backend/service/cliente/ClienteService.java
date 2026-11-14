package pe.bbva.backend.service.cliente;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.cliente.Cliente;
import pe.bbva.backend.repository.cliente.ClienteRepository;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;

    public ClienteService(ClienteRepository clienteRepository) {
        this.clienteRepository = clienteRepository;
    }

    @Transactional(readOnly = true)
    public Page<Cliente> listar(String busqueda, Pageable pageable) {
        if (busqueda == null || busqueda.isBlank()) {
            return clienteRepository.findAll(pageable);
        }
        return clienteRepository.buscar(busqueda.trim(), pageable);
    }

    @Transactional(readOnly = true)
    public Cliente obtener(Long id) {
        return clienteRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Cliente", id));
    }

    @Transactional
    public Cliente crear(Cliente datos) {
        if (clienteRepository.existsByDni(datos.getDni())) {
            throw new BusinessException(ErrorCode.DNI_YA_REGISTRADO);
        }
        datos.setId(null);
        return clienteRepository.save(datos);
    }

    @Transactional
    public Cliente actualizar(Long id, Cliente datos) {
        Cliente c = obtener(id);
        if (!c.getDni().equals(datos.getDni()) && clienteRepository.existsByDni(datos.getDni())) {
            throw new BusinessException(ErrorCode.DNI_YA_REGISTRADO);
        }
        c.setNombres(datos.getNombres());
        c.setApellidos(datos.getApellidos());
        c.setDni(datos.getDni());
        c.setTelefono(datos.getTelefono());
        c.setCorreo(datos.getCorreo());
        c.setCiudad(datos.getCiudad());
        c.setDireccion(datos.getDireccion());
        return clienteRepository.save(c);
    }
}
