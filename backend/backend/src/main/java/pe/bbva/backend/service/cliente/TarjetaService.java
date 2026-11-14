package pe.bbva.backend.service.cliente;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.cliente.Cliente;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.enums.TipoTarjeta;
import pe.bbva.backend.repository.cliente.TarjetaRepository;
import pe.bbva.backend.service.reporte.AuditoriaService;
import pe.bbva.backend.util.TarjetaUtils;

import java.math.BigDecimal;
import java.util.List;

@Service
public class TarjetaService {

    private final TarjetaRepository tarjetaRepository;
    private final ClienteService clienteService;
    private final AuditoriaService auditoriaService;

    public TarjetaService(TarjetaRepository tarjetaRepository, ClienteService clienteService,
                          AuditoriaService auditoriaService) {
        this.tarjetaRepository = tarjetaRepository;
        this.clienteService = clienteService;
        this.auditoriaService = auditoriaService;
    }

    @Transactional(readOnly = true)
    public List<Tarjeta> listar(EstadoTarjeta estado) {
        return estado == null ? tarjetaRepository.findAll() : tarjetaRepository.findByEstado(estado);
    }

    @Transactional(readOnly = true)
    public List<Tarjeta> porCliente(Long clienteId) {
        return tarjetaRepository.findByClienteId(clienteId);
    }

    @Transactional(readOnly = true)
    public Tarjeta obtener(Long id) {
        return tarjetaRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Tarjeta", id));
    }

    /** Solo se guarda el número enmascarado y los últimos 4 dígitos. */
    @Transactional
    public Tarjeta crear(Long clienteId, String numero, TipoTarjeta tipo, String fechaVencimiento,
                         BigDecimal limiteCredito) {
        if (!TarjetaUtils.esNumeroValido(numero)) {
            throw new BusinessException(ErrorCode.VALIDACION, "El número de tarjeta no es válido");
        }
        Cliente cliente = clienteService.obtener(clienteId);
        Tarjeta t = new Tarjeta();
        t.setCliente(cliente);
        t.setNumeroEnmascarado(TarjetaUtils.enmascarar(numero));
        t.setUltimosDigitos(TarjetaUtils.ultimosDigitos(numero));
        t.setTipo(tipo);
        t.setFechaVencimiento(fechaVencimiento);
        t.setLimiteCredito(limiteCredito);
        t.setEstado(EstadoTarjeta.ACTIVA);
        return tarjetaRepository.save(t);
    }

    @Transactional
    public Tarjeta bloquear(Long id, boolean temporal, String motivo) {
        Tarjeta t = obtener(id);
        t.setEstado(temporal ? EstadoTarjeta.BLOQUEADA_TEMPORAL : EstadoTarjeta.BLOQUEADA);
        tarjetaRepository.save(t);
        auditoriaService.registrar(TipoAccion.BLOQUEAR_TARJETA, null,
                "Tarjeta " + t.getNumeroEnmascarado() + (temporal ? " bloqueada temporalmente" : " bloqueada")
                        + (motivo != null ? ". Motivo: " + motivo : ""));
        return t;
    }

    @Transactional
    public Tarjeta desbloquear(Long id, String motivo) {
        Tarjeta t = obtener(id);
        if (t.getEstado() == EstadoTarjeta.CANCELADA) {
            throw new BusinessException("Una tarjeta cancelada no se puede desbloquear");
        }
        t.setEstado(EstadoTarjeta.ACTIVA);
        tarjetaRepository.save(t);
        auditoriaService.registrar(TipoAccion.DESBLOQUEAR_TARJETA, null,
                "Tarjeta " + t.getNumeroEnmascarado() + " desbloqueada" + (motivo != null ? ". Motivo: " + motivo : ""));
        return t;
    }
}
