package pe.bbva.backend.security;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;
import pe.bbva.backend.util.Constantes;

import java.time.LocalDateTime;

/** Bloquea al usuario 15 minutos después de 5 intentos fallidos de login. */
@Service
public class LoginAttemptService {

    private final UsuarioRepository usuarioRepository;

    public LoginAttemptService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Registra un intento fallido y devuelve cuántos intentos le quedan. */
    @Transactional
    public int registrarFallo(Usuario usuario) {
        int intentos = usuario.getIntentosFallidos() + 1;
        if (intentos >= Constantes.MAX_INTENTOS_LOGIN) {
            usuario.setBloqueadoHasta(LocalDateTime.now().plusMinutes(Constantes.MINUTOS_BLOQUEO_LOGIN));
            usuario.setIntentosFallidos(0);
            usuarioRepository.save(usuario);
            return 0;
        }
        usuario.setIntentosFallidos(intentos);
        usuarioRepository.save(usuario);
        return Constantes.MAX_INTENTOS_LOGIN - intentos;
    }

    @Transactional
    public void registrarExito(Usuario usuario) {
        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);
        usuario.setUltimoAcceso(LocalDateTime.now());
        usuarioRepository.save(usuario);
    }
}
