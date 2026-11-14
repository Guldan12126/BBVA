package pe.bbva.backend.service.seguridad;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.enums.EstadoUsuario;
import pe.bbva.backend.model.enums.Rol;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.seguridad.RefreshTokenRepository;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.service.reporte.AuditoriaService;

import java.util.List;

/** Gestión de usuarios y roles (solo Administrador). */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtils securityUtils;
    private final AuditoriaService auditoriaService;

    public UsuarioService(UsuarioRepository usuarioRepository, RefreshTokenRepository refreshTokenRepository,
                          PasswordEncoder passwordEncoder, SecurityUtils securityUtils,
                          AuditoriaService auditoriaService) {
        this.usuarioRepository = usuarioRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.securityUtils = securityUtils;
        this.auditoriaService = auditoriaService;
    }

    @Transactional(readOnly = true)
    public List<Usuario> listar(Rol rol) {
        return rol == null ? usuarioRepository.findAll() : usuarioRepository.findByRol(rol);
    }

    @Transactional(readOnly = true)
    public Usuario obtener(Long id) {
        return usuarioRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
    }

    @Transactional
    public Usuario crear(String nombres, String apellidos, String correo, String password, Rol rol) {
        if (usuarioRepository.existsByCorreoIgnoreCase(correo)) {
            throw new BusinessException(ErrorCode.CORREO_YA_REGISTRADO);
        }
        Usuario u = new Usuario();
        u.setNombres(nombres.trim());
        u.setApellidos(apellidos.trim());
        u.setCorreo(correo.trim().toLowerCase());
        u.setPassword(passwordEncoder.encode(password));
        u.setRol(rol);
        u.setEstado(EstadoUsuario.ACTIVO);
        usuarioRepository.save(u);
        auditoriaService.registrar(TipoAccion.CREAR_USUARIO, null,
                "Usuario creado: " + u.getCorreo() + " (" + rol.getDescripcion() + ")");
        return u;
    }

    @Transactional
    public Usuario actualizar(Long id, String nombres, String apellidos, String correo, Rol rol) {
        Usuario u = obtener(id);
        if (!u.getCorreo().equalsIgnoreCase(correo) && usuarioRepository.existsByCorreoIgnoreCase(correo)) {
            throw new BusinessException(ErrorCode.CORREO_YA_REGISTRADO);
        }
        u.setNombres(nombres.trim());
        u.setApellidos(apellidos.trim());
        u.setCorreo(correo.trim().toLowerCase());
        u.setRol(rol);
        usuarioRepository.save(u);
        auditoriaService.registrar(TipoAccion.ACTUALIZAR_USUARIO, null, "Usuario actualizado: " + u.getCorreo());
        return u;
    }

    @Transactional
    public Usuario cambiarEstado(Long id, EstadoUsuario estado) {
        Usuario u = obtener(id);
        Usuario actual = securityUtils.usuarioActual();
        if (u.getId().equals(actual.getId()) && estado != EstadoUsuario.ACTIVO) {
            throw new BusinessException("No puedes desactivar o bloquear tu propio usuario");
        }
        u.setEstado(estado);
        if (estado == EstadoUsuario.ACTIVO) {
            u.setIntentosFallidos(0);
            u.setBloqueadoHasta(null);
        } else {
            refreshTokenRepository.revocarTodos(u);
        }
        usuarioRepository.save(u);
        auditoriaService.registrar(TipoAccion.ACTUALIZAR_USUARIO, null,
                "Estado de " + u.getCorreo() + " cambiado a " + estado);
        return u;
    }

    /** El Administrador asigna una nueva contraseña a un usuario. */
    @Transactional
    public void restablecerPassword(Long id, String nuevaPassword) {
        Usuario u = obtener(id);
        u.setPassword(passwordEncoder.encode(nuevaPassword));
        u.setIntentosFallidos(0);
        u.setBloqueadoHasta(null);
        usuarioRepository.save(u);
        refreshTokenRepository.revocarTodos(u);
        auditoriaService.registrar(TipoAccion.CAMBIO_PASSWORD, null,
                "El administrador restableció la contraseña de " + u.getCorreo());
    }
}
