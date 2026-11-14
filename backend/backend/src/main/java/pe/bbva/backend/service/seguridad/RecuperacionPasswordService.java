package pe.bbva.backend.service.seguridad;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.config.properties.RecuperacionProperties;
import pe.bbva.backend.event.PasswordCambiadaEvent;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.CodigoInvalidoException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.model.enums.EstadoUsuario;
import pe.bbva.backend.model.enums.TipoCodigo;
import pe.bbva.backend.model.seguridad.CodigoVerificacion;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.seguridad.CodigoVerificacionRepository;
import pe.bbva.backend.repository.seguridad.RefreshTokenRepository;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;
import pe.bbva.backend.service.notificacion.EmailService;
import pe.bbva.backend.service.reporte.AuditoriaService;
import pe.bbva.backend.util.CodigoGenerator;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * "¿Olvidaste tu contraseña?" en 3 pasos:
 * 1) solicitarCodigo: envía un código de 6 dígitos al correo.
 * 2) verificarCodigo: si el código es correcto devuelve un resetToken temporal.
 * 3) restablecerPassword: con el resetToken se guarda la nueva contraseña.
 */
@Service
public class RecuperacionPasswordService {

    private static final Logger log = LoggerFactory.getLogger(RecuperacionPasswordService.class);
    private static final int DIGITOS = 6;

    /** Respuesta del paso 2. */
    public record ResultadoVerificacion(String resetToken, long expiraEnSegundos) {
    }

    private final UsuarioRepository usuarioRepository;
    private final CodigoVerificacionRepository codigoRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RecuperacionProperties props;
    private final ApplicationEventPublisher eventPublisher;

    public RecuperacionPasswordService(UsuarioRepository usuarioRepository,
                                       CodigoVerificacionRepository codigoRepository,
                                       RefreshTokenRepository refreshTokenRepository,
                                       PasswordEncoder passwordEncoder, EmailService emailService,
                                       RecuperacionProperties props, ApplicationEventPublisher eventPublisher) {
        this.usuarioRepository = usuarioRepository;
        this.codigoRepository = codigoRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.props = props;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Paso 1. Si el correo no existe no se lanza error: así nadie puede averiguar
     * qué correos tienen cuenta en el sistema.
     */
    @Transactional
    public void solicitarCodigo(String correo) {
        Optional<Usuario> opcional = usuarioRepository.findByCorreoIgnoreCase(correo.trim());
        if (opcional.isEmpty() || opcional.get().getEstado() == EstadoUsuario.INACTIVO) {
            log.info("Solicitud de código para un correo no registrado o inactivo: {}", correo);
            return;
        }
        Usuario usuario = opcional.get();
        codigoRepository.findTopByUsuarioAndTipoOrderByFechaCreacionDesc(usuario, TipoCodigo.RECUPERAR_PASSWORD)
                .ifPresent(ultimo -> {
                    long segundos = Duration.between(ultimo.getFechaCreacion(), LocalDateTime.now()).getSeconds();
                    if (segundos < props.esperaReenvioSegundos()) {
                        throw new BusinessException(ErrorCode.ESPERA_REENVIO,
                                "Espera " + (props.esperaReenvioSegundos() - segundos)
                                        + " segundos antes de solicitar otro código");
                    }
                });

        codigoRepository.invalidarAnteriores(usuario, TipoCodigo.RECUPERAR_PASSWORD);

        String codigo = CodigoGenerator.codigoNumerico(DIGITOS);
        CodigoVerificacion cv = new CodigoVerificacion();
        cv.setUsuario(usuario);
        cv.setTipo(TipoCodigo.RECUPERAR_PASSWORD);
        cv.setCodigoHash(passwordEncoder.encode(codigo));
        cv.setFechaExpiracion(LocalDateTime.now().plusMinutes(props.vigenciaMinutos()));
        codigoRepository.save(cv);

        emailService.enviarCodigoVerificacion(usuario.getCorreo(), usuario.getNombres(), codigo,
                props.vigenciaMinutos());
    }

    /** Paso 2. noRollbackFor: el intento fallido se guarda aunque se lance la excepción. */
    @Transactional(noRollbackFor = BusinessException.class)
    public ResultadoVerificacion verificarCodigo(String correo, String codigo) {
        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(correo.trim())
                .orElseThrow(() -> new CodigoInvalidoException(ErrorCode.CODIGO_INVALIDO));
        CodigoVerificacion cv = codigoRepository
                .findTopByUsuarioAndTipoOrderByFechaCreacionDesc(usuario, TipoCodigo.RECUPERAR_PASSWORD)
                .orElseThrow(() -> new CodigoInvalidoException(ErrorCode.CODIGO_INVALIDO));

        if (Boolean.TRUE.equals(cv.getUsado())) {
            throw new CodigoInvalidoException(ErrorCode.CODIGO_INVALIDO,
                    "El código ya fue usado o anulado, solicita uno nuevo");
        }
        if (cv.estaVencido()) {
            throw new CodigoInvalidoException(ErrorCode.CODIGO_VENCIDO);
        }
        if (cv.getIntentos() >= props.maxIntentos()) {
            throw new CodigoInvalidoException(ErrorCode.CODIGO_AGOTADO);
        }
        if (!passwordEncoder.matches(codigo, cv.getCodigoHash())) {
            cv.setIntentos(cv.getIntentos() + 1);
            int restantes = props.maxIntentos() - cv.getIntentos();
            if (restantes <= 0) {
                cv.setUsado(true);
                codigoRepository.save(cv);
                throw new CodigoInvalidoException(ErrorCode.CODIGO_AGOTADO);
            }
            codigoRepository.save(cv);
            throw new CodigoInvalidoException(ErrorCode.CODIGO_INVALIDO,
                    "Código incorrecto. Te quedan " + restantes + " intento(s)");
        }

        String resetToken = CodigoGenerator.tokenSeguro();
        cv.setUsado(true);
        cv.setResetTokenHash(CodigoGenerator.sha256(resetToken));
        cv.setResetTokenExpiracion(LocalDateTime.now().plusMinutes(props.vigenciaResetMinutos()));
        codigoRepository.save(cv);
        return new ResultadoVerificacion(resetToken, props.vigenciaResetMinutos() * 60L);
    }

    /** Paso 3. */
    @Transactional
    public void restablecerPassword(String resetToken, String nuevaPassword) {
        CodigoVerificacion cv = codigoRepository.findByResetTokenHash(CodigoGenerator.sha256(resetToken))
                .filter(c -> c.getResetTokenExpiracion() != null
                        && c.getResetTokenExpiracion().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new BusinessException(ErrorCode.TOKEN_INVALIDO,
                        "El enlace para restablecer la contraseña no es válido o ya venció"));

        Usuario usuario = cv.getUsuario();
        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        if (usuario.getEstado() == EstadoUsuario.BLOQUEADO) {
            usuario.setEstado(EstadoUsuario.ACTIVO);
        }
        usuarioRepository.save(usuario);

        cv.setResetTokenHash(null);
        cv.setResetTokenExpiracion(null);
        codigoRepository.save(cv);

        refreshTokenRepository.revocarTodos(usuario);
        emailService.enviarConfirmacionCambioPassword(usuario.getCorreo(), usuario.getNombres());
        eventPublisher.publishEvent(new PasswordCambiadaEvent(usuario.getId(), AuditoriaService.ipActual()));
    }

    /** Usado por CodigoExpiradoScheduler. */
    @Transactional
    public int limpiarVencidos() {
        int codigos = codigoRepository.eliminarVencidos(LocalDateTime.now().minusDays(1));
        int tokens = refreshTokenRepository.eliminarVencidos(LocalDateTime.now());
        return codigos + tokens;
    }
}
