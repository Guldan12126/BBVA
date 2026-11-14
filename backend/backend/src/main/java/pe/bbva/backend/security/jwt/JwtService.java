package pe.bbva.backend.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import pe.bbva.backend.config.properties.JwtProperties;
import pe.bbva.backend.model.seguridad.Usuario;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

/** Genera y valida los tokens JWT de acceso. */
@Service
public class JwtService {

    private final JwtProperties props;
    private final SecretKey key;

    public JwtService(JwtProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(props.secret()));
    }

    public String generarToken(Usuario usuario) {
        Date ahora = new Date();
        Date expira = new Date(ahora.getTime() + getExpiracionSegundos() * 1000);
        return Jwts.builder()
                .subject(usuario.getCorreo())
                .claims(Map.of(
                        "id", usuario.getId(),
                        "rol", usuario.getRol().name(),
                        "nombre", usuario.getNombreCompleto()))
                .issuedAt(ahora)
                .expiration(expira)
                .signWith(key)
                .compact();
    }

    public long getExpiracionSegundos() {
        return props.accessExpirationMinutes() * 60;
    }

    /** Devuelve el correo (subject) si el token es válido; lanza JwtException si no lo es. */
    public String extraerCorreo(String token) {
        return leerClaims(token).getSubject();
    }

    public boolean esValido(String token) {
        try {
            leerClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims leerClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
