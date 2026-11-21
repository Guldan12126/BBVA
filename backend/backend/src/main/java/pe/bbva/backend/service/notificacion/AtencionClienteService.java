package pe.bbva.backend.service.notificacion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.EstadoTransaccion;
import pe.bbva.backend.model.enums.Prioridad;
import pe.bbva.backend.model.enums.ResultadoAtencion;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.notificacion.AtencionCliente;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.cliente.TarjetaRepository;
import pe.bbva.backend.repository.notificacion.AtencionClienteRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.service.fraude.AlertaService;
import pe.bbva.backend.service.reporte.AuditoriaService;

import java.util.List;

/** El Operador de Atención al Cliente registra el resultado del contacto con el cliente. */
@Service
public class AtencionClienteService {

    private final AtencionClienteRepository atencionRepository;
    private final TransaccionRepository transaccionRepository;
    private final TarjetaRepository tarjetaRepository;
    private final AlertaService alertaService;
    private final SecurityUtils securityUtils;
    private final AuditoriaService auditoriaService;

    public AtencionClienteService(AtencionClienteRepository atencionRepository,
                                  TransaccionRepository transaccionRepository, TarjetaRepository tarjetaRepository,
                                  AlertaService alertaService, SecurityUtils securityUtils,
                                  AuditoriaService auditoriaService) {
        this.atencionRepository = atencionRepository;
        this.transaccionRepository = transaccionRepository;
        this.tarjetaRepository = tarjetaRepository;
        this.alertaService = alertaService;
        this.securityUtils = securityUtils;
        this.auditoriaService = auditoriaService;
    }

    @Transactional
    public AtencionCliente registrar(Long alertaId, ResultadoAtencion resultado, String observacion,
                                     boolean bloquearTarjeta) {
        Alerta alerta = alertaService.obtener(alertaId);
        Usuario operador = securityUtils.usuarioActual();
        Transaccion tx = alerta.getTransaccion();

        AtencionCliente atencion = new AtencionCliente();
        atencion.setAlerta(alerta);
        atencion.setOperador(operador);
        atencion.setResultado(resultado);
        atencion.setObservacion(observacion);

        if (resultado == ResultadoAtencion.CLIENTE_NIEGA || bloquearTarjeta) {
            Tarjeta tarjeta = tx.getTarjeta();
            tarjeta.setEstado(EstadoTarjeta.BLOQUEADA_TEMPORAL);
            tarjetaRepository.save(tarjeta);
            tx.setEstado(EstadoTransaccion.BLOQUEADA);
            transaccionRepository.save(tx);
            atencion.setTarjetaBloqueada(true);
            alertaService.cambiarPrioridad(alerta, Prioridad.URGENTE);
        }
        atencionRepository.save(atencion);
        if (resultado == ResultadoAtencion.CLIENTE_CONFIRMA && !bloquearTarjeta
                && AlertaService.ACTIVAS.contains(alerta.getEstado())) {
            // El cliente confirmó por teléfono que la compra es suya: se aprueba y se libera la tarjeta
            // sin esperar al analista. Queda como falso positivo (también sirve de etiqueta para el modelo).
            alertaService.decidir(alertaId, false,
                    "Cliente confirmó la compra por teléfono" + (observacion != null && !observacion.isBlank()
                            ? ": " + observacion : ""), false);
        }
        auditoriaService.registrar(operador, alerta, TipoAccion.ATENCION_CLIENTE,
                resultado + (observacion != null ? ": " + observacion : ""));
        return atencion;
    }

    @Transactional(readOnly = true)
    public List<AtencionCliente> porAlerta(Long alertaId) {
        return atencionRepository.findByAlertaIdOrderByFechaDesc(alertaId);
    }

    @Transactional(readOnly = true)
    public List<AtencionCliente> mias() {
        return atencionRepository.findByOperadorIdOrderByFechaDesc(securityUtils.usuarioActual().getId());
    }
}
