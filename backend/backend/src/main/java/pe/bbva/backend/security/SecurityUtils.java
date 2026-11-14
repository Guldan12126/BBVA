package pe.bbva.backend.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.model.enums.Rol;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;

import java.util.Optional;

/** Permite saber quién es el usuario que hizo la petición. */
@Component
public class SecurityUtils {

    private final UsuarioRepository usuarioRepository;

    public SecurityUtils(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Correo del usuario logueado (vacío si la petición no tiene token). */
    public static Optional<String> correoActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        return Optional.ofNullable(auth.getName());
    }

    public static boolean tieneRol(Rol rol) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + rol.name()));
    }

    /** Usuario logueado completo. Lanza 401 si no hay sesión. */
    public Usuario usuarioActual() {
        return usuarioActualOpcional()
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_AUTENTICADO));
    }

    public Optional<Usuario> usuarioActualOpcional() {
        return correoActual().flatMap(usuarioRepository::findByCorreoIgnoreCase);
    }
}
