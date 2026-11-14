package pe.bbva.backend.service.seguridad;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.config.properties.JwtProperties;
import pe.bbva.backend.event.PasswordCambiadaEvent;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.model.enums.EstadoUsuario;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.seguridad.RefreshToken;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.seguridad.RefreshTokenRepository;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;
import pe.bbva.backend.security.LoginAttemptService;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.security.jwt.JwtService;
import pe.bbva.backend.service.reporte.AuditoriaService;
import pe.bbva.backend.util.CodigoGenerator;

import java.time.LocalDateTime;

/** Login, renovación del token, logout y cambio de contraseña. */
@Service
public class AuthService {

    /** Lo que recibe el frontend al iniciar sesión. */
    public record Sesion(String accessToken, String refreshToken, String tipo, long expiraEnSegundos, Usuario usuario) {
    }

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final LoginAttemptService loginAttemptService;
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtils securityUtils;
    private final AuditoriaService auditoriaService;
    private final ApplicationEventPublisher eventPublisher;

    public AuthService(AuthenticationManager authenticationManager, UsuarioRepository usuarioRepository,
                       RefreshTokenRepository refreshTokenRepository, JwtService jwtService,
                       JwtProperties jwtProperties, LoginAttemptService loginAttemptService,
                       PasswordEncoder passwordEncoder, SecurityUtils securityUtils,
                       AuditoriaService auditoriaService, ApplicationEventPublisher eventPublisher) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.loginAttemptService = loginAttemptService;
        this.passwordEncoder = passwordEncoder;
        this.securityUtils = securityUtils;
        this.auditoriaService = auditoriaService;
        this.eventPublisher = eventPublisher;
    }

    /** noRollbackFor: aunque el login falle, se guarda el intento fallido y el registro de acceso. */
    @Transactional(noRollbackFor = BusinessException.class)
    public Sesion login(String correo, String password, String ip) {
        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(correo.trim()).orElse(null);
        if (usuario == null) {
            auditoriaService.registrarAcceso(correo, false, ip, "Correo no registrado");
            throw new BusinessException(ErrorCode.CREDENCIALES_INVALIDAS);
        }
        if (usuario.getEstado() == EstadoUsuario.INACTIVO) {
            auditoriaService.registrarAcceso(correo, false, ip, "Usuario inactivo");
            throw new BusinessException(ErrorCode.USUARIO_INACTIVO);
        }
        if (usuario.getEstado() == EstadoUsuario.BLOQUEADO || usuario.estaBloqueado()) {
            auditoriaService.registrarAcceso(correo, false, ip, "Usuario bloqueado");
            throw new BusinessException(ErrorCode.USUARIO_BLOQUEADO);
        }
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(usuario.getCorreo(), password));
        } catch (AuthenticationException e) {
            int restantes = loginAttemptService.registrarFallo(usuario);
            auditoriaService.registrarAcceso(correo, false, ip, "Contraseña incorrecta");
            if (restantes == 0) {
                throw new BusinessException(ErrorCode.USUARIO_BLOQUEADO,
                        "Superaste los intentos permitidos. Tu usuario quedó bloqueado 15 minutos");
            }
            throw new BusinessException(ErrorCode.CREDENCIALES_INVALIDAS,
                    "Correo o contraseña incorrectos. Te quedan " + restantes + " intento(s)");
        }
        loginAttemptService.registrarExito(usuario);
        auditoriaService.registrarAcceso(correo, true, ip, "Inicio de sesión correcto");
        auditoriaService.registrar(usuario, null, TipoAccion.LOGIN, "Inicio de sesión desde " + ip);
        return crearSesion(usuario);
    }

    @Transactional
    public Sesion refrescar(String refreshToken) {
        RefreshToken actual = refreshTokenRepository.findByToken(refreshToken)
                .filter(RefreshToken::esValido)
                .orElseThrow(() -> new BusinessException(ErrorCode.TOKEN_INVALIDO));
        Usuario usuario = actual.getUsuario();
        if (usuario.getEstado() != EstadoUsuario.ACTIVO) {
            throw new BusinessException(ErrorCode.USUARIO_INACTIVO);
        }
        actual.setRevocado(true);
        refreshTokenRepository.save(actual);
        return crearSesion(usuario);
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken).ifPresent(t -> {
            t.setRevocado(true);
            refreshTokenRepository.save(t);
            auditoriaService.registrar(t.getUsuario(), null, TipoAccion.LOGOUT, "Cierre de sesión");
        });
    }

    @Transactional(readOnly = true)
    public Usuario usuarioActual() {
        return securityUtils.usuarioActual();
    }

    @Transactional
    public void cambiarPassword(String passwordActual, String nuevaPassword) {
        Usuario usuario = securityUtils.usuarioActual();
        if (!passwordEncoder.matches(passwordActual, usuario.getPassword())) {
            throw new BusinessException(ErrorCode.PASSWORD_INCORRECTA);
        }
        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
        refreshTokenRepository.revocarTodos(usuario);
        eventPublisher.publishEvent(new PasswordCambiadaEvent(usuario.getId(), AuditoriaService.ipActual()));
    }

    private Sesion crearSesion(Usuario usuario) {
        RefreshToken rt = new RefreshToken();
        rt.setUsuario(usuario);
        rt.setToken(CodigoGenerator.tokenSeguro());
        rt.setFechaExpiracion(LocalDateTime.now().plusDays(jwtProperties.refreshExpirationDays()));
        refreshTokenRepository.save(rt);
        return new Sesion(jwtService.generarToken(usuario), rt.getToken(), "Bearer",
                jwtService.getExpiracionSegundos(), usuario);
    }
}
