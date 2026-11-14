package pe.bbva.backend.service.notificacion;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.EstadoNotificacion;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.EstadoTransaccion;
import pe.bbva.backend.model.enums.Prioridad;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.notificacion.Notificacion;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.cliente.TarjetaRepository;
import pe.bbva.backend.repository.notificacion.NotificacionRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.service.fraude.AlertaService;
import pe.bbva.backend.service.reporte.AuditoriaService;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/** Portal público "¿Reconoces esta compra?" (el cliente entra con el token del enlace, sin login). */
@Service
public class ValidacionCompraService {

    private final NotificacionRepository notificacionRepository;
    private final TransaccionRepository transaccionRepository;
    private final TarjetaRepository tarjetaRepository;
    private final AlertaService alertaService;
    private final NotificacionService notificacionService;
    private final AuditoriaService auditoriaService;

    public ValidacionCompraService(NotificacionRepository notificacionRepository,
                                   TransaccionRepository transaccionRepository, TarjetaRepository tarjetaRepository,
                                   AlertaService alertaService, NotificacionService notificacionService,
                                   AuditoriaService auditoriaService) {
        this.notificacionRepository = notificacionRepository;
        this.transaccionRepository = transaccionRepository;
        this.tarjetaRepository = tarjetaRepository;
        this.alertaService = alertaService;
        this.notificacionService = notificacionService;
        this.auditoriaService = auditoriaService;
    }

    /** Datos que se muestran en la pantalla del cliente. noRollbackFor para guardar el estado EXPIRADA. */
    @Transactional(noRollbackFor = BusinessException.class)
    public Map<String, Object> consultar(String token) {
        Notificacion n = buscarVigente(token, false);
        Transaccion tx = n.getAlerta().getTransaccion();
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("cliente", n.getCliente().getNombres());
        datos.put("comercio", tx.getComercio().getNombre());
        datos.put("monto", tx.getMonto());
        datos.put("moneda", tx.getMoneda());
        datos.put("fecha", tx.getFechaHora());
        datos.put("ciudad", tx.getCiudad());
        datos.put("canal", tx.getCanal());
        datos.put("tarjeta", tx.getTarjeta().getNumeroEnmascarado());
        datos.put("estado", n.getEstado());
        datos.put("venceEn", n.getFechaExpiracion());
        datos.put("yaRespondida", n.getEstado() != EstadoNotificacion.ENVIADA);
        return datos;
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public Map<String, Object> responder(String token, boolean reconoce) {
        Notificacion n = buscarVigente(token, true);
        Alerta alerta = n.getAlerta();
        Transaccion tx = alerta.getTransaccion();

        n.setReconocida(reconoce);
        n.setFechaRespuesta(LocalDateTime.now());
        n.setEstado(reconoce ? EstadoNotificacion.RECONOCIDA : EstadoNotificacion.NO_RECONOCIDA);
        notificacionRepository.save(n);

        String mensaje;
        if (reconoce) {
            // El analista igual revisa, pero con prioridad baja
            alertaService.cambiarPrioridad(alerta, Prioridad.BAJA);
            mensaje = "Gracias por confirmar. Un analista revisará la operación y liberará tu compra.";
        } else {
            // El cliente no reconoce la compra: se bloquea de inmediato
            tx.setEstado(EstadoTransaccion.BLOQUEADA);
            transaccionRepository.save(tx);
            Tarjeta tarjeta = tx.getTarjeta();
            if (tarjeta.getEstado() == EstadoTarjeta.ACTIVA) {
                tarjeta.setEstado(EstadoTarjeta.BLOQUEADA_TEMPORAL);
                tarjetaRepository.save(tarjeta);
            }
            alertaService.cambiarPrioridad(alerta, Prioridad.URGENTE);
            mensaje = "Bloqueamos la operación y tu tarjeta de forma preventiva. Un operador se comunicará contigo.";
        }
        auditoriaService.registrar(null, alerta, TipoAccion.RESPUESTA_CLIENTE,
                "El cliente " + (reconoce ? "RECONOCE" : "NO RECONOCE") + " la compra " + tx.getCodigo());
        notificacionService.enviarAlertaDashboard(alerta);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("reconocida", reconoce);
        r.put("mensaje", mensaje);
        return r;
    }

    private Notificacion buscarVigente(String token, boolean paraResponder) {
        Notificacion n = notificacionRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Enlace de validación", "token"));
        if (n.getEstado() == EstadoNotificacion.ENVIADA && n.getFechaExpiracion().isBefore(LocalDateTime.now())) {
            n.setEstado(EstadoNotificacion.EXPIRADA);
            notificacionRepository.save(n);
        }
        if (n.getEstado() == EstadoNotificacion.EXPIRADA) {
            throw new BusinessException(ErrorCode.NOTIFICACION_EXPIRADA);
        }
        if (paraResponder && n.getEstado() != EstadoNotificacion.ENVIADA) {
            throw new BusinessException(ErrorCode.NOTIFICACION_RESPONDIDA);
        }
        return n;
    }
}
