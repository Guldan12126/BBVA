package pe.bbva.backend.service.seguridad;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.model.seguridad.UsuarioFoto;
import pe.bbva.backend.repository.seguridad.UsuarioFotoRepository;
import pe.bbva.backend.security.SecurityUtils;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Foto de perfil del usuario logueado. */
@Service
public class FotoPerfilService {

    /** Solo imágenes JPEG, PNG o WEBP en base64. */
    private static final Pattern DATA_URL = Pattern.compile("^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$");

    /** Tamaño máximo de la imagen ya decodificada (el frontend la reduce a 256x256, pesa ~30 KB). */
    private static final int MAX_BYTES = 500 * 1024;

    private final UsuarioFotoRepository repository;
    private final SecurityUtils securityUtils;

    public FotoPerfilService(UsuarioFotoRepository repository, SecurityUtils securityUtils) {
        this.repository = repository;
        this.securityUtils = securityUtils;
    }

    @Transactional(readOnly = true)
    public String fotoActual() {
        Usuario usuario = securityUtils.usuarioActual();
        return repository.findById(usuario.getId()).map(UsuarioFoto::getImagen).orElse(null);
    }

    /** Guarda la foto; si viene vacía, la elimina. */
    @Transactional
    public String guardar(String imagen) {
        Usuario usuario = securityUtils.usuarioActual();
        if (imagen == null || imagen.isBlank()) {
            repository.deleteById(usuario.getId());
            return null;
        }
        validar(imagen);
        UsuarioFoto foto = repository.findById(usuario.getId()).orElse(new UsuarioFoto(usuario.getId(), imagen));
        foto.setImagen(imagen);
        foto.setFechaActualizacion(LocalDateTime.now());
        repository.save(foto);
        return imagen;
    }

    private static void validar(String imagen) {
        Matcher m = DATA_URL.matcher(imagen);
        if (!m.matches()) {
            throw new BusinessException(ErrorCode.VALIDACION, "La imagen debe ser JPG, PNG o WEBP");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(m.group(2));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDACION, "La imagen no es válida");
        }
        if (bytes.length > MAX_BYTES) {
            throw new BusinessException(ErrorCode.VALIDACION, "La imagen no puede pesar más de 500 KB");
        }
    }
}
