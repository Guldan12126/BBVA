package pe.bbva.backend.service.reporte;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import pe.bbva.backend.model.auditoria.HistorialDecision;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.seguridad.RegistroAcceso;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.auditoria.HistorialDecisionRepository;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.seguridad.RegistroAccesoRepository;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;
import pe.bbva.backend.security.SecurityUtils;

import java.util.List;

/** Guarda quién hizo qué y cuándo (historial de decisiones y accesos). */
@Service
public class AuditoriaService {

    private final HistorialDecisionRepository historialRepository;
    private final RegistroAccesoRepository registroAccesoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlertaRepository alertaRepository;
    private final SecurityUtils securityUtils;

    public AuditoriaService(HistorialDecisionRepository historialRepository,
                            RegistroAccesoRepository registroAccesoRepository,
                            UsuarioRepository usuarioRepository,
                            AlertaRepository alertaRepository,
                            SecurityUtils securityUtils) {
        this.historialRepository = historialRepository;
        this.registroAccesoRepository = registroAccesoRepository;
        this.usuarioRepository = usuarioRepository;
        this.alertaRepository = alertaRepository;
        this.securityUtils = securityUtils;
    }

    @Transactional
    public HistorialDecision registrar(Usuario usuario, Alerta alerta, TipoAccion accion, String detalle) {
        HistorialDecision h = new HistorialDecision();
        h.setUsuario(usuario);
        h.setAlerta(alerta);
        h.setAccion(accion);
        h.setDetalle(recortar(detalle, 1000));
        h.setIp(ipActual());
        return historialRepository.save(h);
    }

    /** Registra la acción a nombre del usuario logueado (o del sistema si no hay sesión). */
    @Transactional
    public HistorialDecision registrar(TipoAccion accion, Alerta alerta, String detalle) {
        return registrar(securityUtils.usuarioActualOpcional().orElse(null), alerta, accion, detalle);
    }

    @Transactional
    public HistorialDecision registrarPorIds(Long usuarioId, Long alertaId, TipoAccion accion, String detalle) {
        Usuario usuario = usuarioId == null ? null : usuarioRepository.findById(usuarioId).orElse(null);
        Alerta alerta = alertaId == null ? null : alertaRepository.findById(alertaId).orElse(null);
        return registrar(usuario, alerta, accion, detalle);
    }

    @Transactional
    public void registrarAcceso(String correo, boolean exitoso, String ip, String detalle) {
        RegistroAcceso r = new RegistroAcceso();
        r.setCorreo(recortar(correo, 150));
        r.setExitoso(exitoso);
        r.setIp(ip);
        r.setDetalle(recortar(detalle, 255));
        registroAccesoRepository.save(r);
    }

    @Transactional(readOnly = true)
    public Page<HistorialDecision> listar(TipoAccion accion, Long usuarioId, Pageable pageable) {
        if (usuarioId != null) {
            return historialRepository.findByUsuarioIdOrderByFechaDesc(usuarioId, pageable);
        }
        if (accion != null) {
            return historialRepository.findByAccionOrderByFechaDesc(accion, pageable);
        }
        return historialRepository.findAllByOrderByFechaDesc(pageable);
    }

    @Transactional(readOnly = true)
    public List<HistorialDecision> porAlerta(Long alertaId) {
        return historialRepository.findByAlertaIdOrderByFechaAsc(alertaId);
    }

    @Transactional(readOnly = true)
    public Page<RegistroAcceso> accesos(String correo, Pageable pageable) {
        if (correo != null && !correo.isBlank()) {
            return registroAccesoRepository.findByCorreoIgnoreCaseOrderByFechaDesc(correo, pageable);
        }
        return registroAccesoRepository.findAllByOrderByFechaDesc(pageable);
    }

    /** IP de la petición actual (null si se ejecuta fuera de una petición, por ejemplo en un scheduler). */
    public static String ipActual() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sra) {
            HttpServletRequest req = sra.getRequest();
            String forwarded = req.getHeader("X-Forwarded-For");
            return forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : req.getRemoteAddr();
        }
        return null;
    }

    private static String recortar(String texto, int max) {
        if (texto == null) {
            return null;
        }
        return texto.length() <= max ? texto : texto.substring(0, max);
    }
}
