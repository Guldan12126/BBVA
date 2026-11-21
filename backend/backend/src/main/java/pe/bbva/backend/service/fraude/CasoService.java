package pe.bbva.backend.service.fraude;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.enums.EstadoCaso;
import pe.bbva.backend.model.enums.Prioridad;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.fraude.Caso;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.fraude.CasoRepository;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.service.cliente.ClienteService;
import pe.bbva.backend.service.reporte.AuditoriaService;
import pe.bbva.backend.util.CodigoGenerator;

import java.time.LocalDateTime;
import java.util.List;

/** Agrupa alertas relacionadas para investigarlas como un solo caso. */
@Service
public class CasoService {

    private final CasoRepository casoRepository;
    private final AlertaRepository alertaRepository;
    private final AlertaService alertaService;
    private final ClienteService clienteService;
    private final SecurityUtils securityUtils;
    private final AuditoriaService auditoriaService;

    public CasoService(CasoRepository casoRepository, AlertaRepository alertaRepository, AlertaService alertaService,
                       ClienteService clienteService, SecurityUtils securityUtils,
                       AuditoriaService auditoriaService) {
        this.casoRepository = casoRepository;
        this.alertaRepository = alertaRepository;
        this.alertaService = alertaService;
        this.clienteService = clienteService;
        this.securityUtils = securityUtils;
        this.auditoriaService = auditoriaService;
    }

    @Transactional(readOnly = true)
    public List<Caso> listar(EstadoCaso estado, Long clienteId, String q) {
        List<Caso> lista = estado == null ? casoRepository.findAllByOrderByFechaCreacionDesc()
                : casoRepository.findByEstadoOrderByFechaCreacionDesc(estado);
        String texto = q == null ? "" : q.trim().toLowerCase();
        return lista.stream()
                .filter(c -> clienteId == null || (c.getCliente() != null && clienteId.equals(c.getCliente().getId())))
                .filter(c -> texto.isEmpty() || coincide(c, texto))
                .toList();
    }

    /** Busca el texto en el código, el título y el nombre o DNI del cliente. */
    private static boolean coincide(Caso c, String texto) {
        StringBuilder sb = new StringBuilder().append(c.getCodigo()).append(' ').append(c.getTitulo());
        if (c.getCliente() != null) {
            sb.append(' ').append(c.getCliente().getNombres()).append(' ').append(c.getCliente().getApellidos())
                    .append(' ').append(c.getCliente().getDni());
        }
        return sb.toString().toLowerCase().contains(texto);
    }

    @Transactional(readOnly = true)
    public Caso obtener(Long id) {
        return casoRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Caso", id));
    }

    @Transactional(readOnly = true)
    public List<Alerta> alertas(Long casoId) {
        return alertaRepository.findByCasoId(casoId);
    }

    @Transactional
    public Caso crear(String titulo, String descripcion, Prioridad prioridad, Long clienteId, List<Long> alertaIds) {
        Caso c = new Caso();
        c.setCodigo(CodigoGenerator.caso());
        c.setTitulo(titulo);
        c.setDescripcion(descripcion);
        c.setPrioridad(prioridad == null ? Prioridad.MEDIA : prioridad);
        c.setEstado(EstadoCaso.ABIERTO);
        c.setResponsable(securityUtils.usuarioActual());
        if (clienteId != null) {
            c.setCliente(clienteService.obtener(clienteId));
        }
        casoRepository.save(c);
        if (alertaIds != null) {
            alertaIds.forEach(id -> vincular(c, alertaService.obtener(id)));
        }
        auditoriaService.registrar(TipoAccion.CREAR_CASO, null, "Caso " + c.getCodigo() + ": " + titulo);
        return c;
    }

    @Transactional
    public Caso agregarAlerta(Long casoId, Long alertaId) {
        Caso c = obtener(casoId);
        if (c.getEstado() == EstadoCaso.CERRADO) {
            throw new BusinessException("No se pueden agregar alertas a un caso cerrado");
        }
        vincular(c, alertaService.obtener(alertaId));
        return c;
    }

    private void vincular(Caso caso, Alerta alerta) {
        alerta.setCaso(caso);
        alertaRepository.save(alerta);
    }

    @Transactional
    public Caso cambiarEstado(Long id, EstadoCaso estado) {
        Caso c = obtener(id);
        c.setEstado(estado);
        if (estado == EstadoCaso.CERRADO) {
            c.setFechaCierre(LocalDateTime.now());
        }
        return casoRepository.save(c);
    }

    @Transactional
    public Caso cerrar(Long id, String conclusion) {
        Caso c = obtener(id);
        c.setEstado(EstadoCaso.CERRADO);
        c.setConclusion(conclusion);
        c.setFechaCierre(LocalDateTime.now());
        casoRepository.save(c);
        auditoriaService.registrar(TipoAccion.CERRAR_CASO, null, "Caso " + c.getCodigo() + " cerrado: " + conclusion);
        return c;
    }
}
