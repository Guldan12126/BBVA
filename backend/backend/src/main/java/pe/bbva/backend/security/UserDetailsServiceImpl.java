package pe.bbva.backend.security;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import pe.bbva.backend.model.enums.EstadoUsuario;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;

/** Carga el usuario desde la base de datos para Spring Security. El "username" es el correo. */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public UserDetailsServiceImpl(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String correo) throws UsernameNotFoundException {
        Usuario u = usuarioRepository.findByCorreoIgnoreCase(correo)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + correo));
        return User.withUsername(u.getCorreo())
                .password(u.getPassword())
                .roles(u.getRol().name())
                .disabled(u.getEstado() == EstadoUsuario.INACTIVO)
                .accountLocked(u.getEstado() == EstadoUsuario.BLOQUEADO || u.estaBloqueado())
                .build();
    }
}
