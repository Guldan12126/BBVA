package pe.bbva.backend.controller.seguridad;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ErrorCode;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.service.reporte.AuditoriaService;
import pe.bbva.backend.service.seguridad.AuthService;
import pe.bbva.backend.service.seguridad.FotoPerfilService;
import pe.bbva.backend.service.seguridad.RecuperacionPasswordService;
import pe.bbva.backend.validation.PasswordSegura;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación", description = "Login, sesión y recuperación de contraseña")
public class AuthController {

    // ---------- Cuerpos de las peticiones ----------
    public record LoginRequest(@NotBlank @Email String correo, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record CambiarPasswordRequest(@NotBlank String passwordActual, @PasswordSegura String nuevaPassword,
                                         @NotBlank String confirmarPassword) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String correo) {
    }

    public record VerifyCodeRequest(@NotBlank @Email String correo,
                                    @NotBlank @Pattern(regexp = "\\d{6}", message = "El código debe tener 6 dígitos")
                                    String codigo) {
    }

    /** foto = data URL de la imagen, o null/vacío para quitarla. */
    public record FotoRequest(String foto) {
    }

    public record ResetPasswordRequest(@NotBlank String resetToken, @PasswordSegura String nuevaPassword,
                                       @NotBlank String confirmarPassword) {
    }

    private final AuthService authService;
    private final RecuperacionPasswordService recuperacionService;
    private final FotoPerfilService fotoPerfilService;

    public AuthController(AuthService authService, RecuperacionPasswordService recuperacionService,
                          FotoPerfilService fotoPerfilService) {
        this.authService = authService;
        this.recuperacionService = recuperacionService;
        this.fotoPerfilService = fotoPerfilService;
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión (devuelve accessToken y refreshToken)")
    public AuthService.Sesion login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        return authService.login(req.correo(), req.password(), ip(http));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar el accessToken con el refreshToken")
    public AuthService.Sesion refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refrescar(req.refreshToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest req) {
        authService.logout(req.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Datos del usuario logueado")
    public Usuario me() {
        return authService.usuarioActual();
    }

    @GetMapping("/me/foto")
    @Operation(summary = "Foto de perfil del usuario logueado (data URL o null)")
    public Map<String, String> miFoto() {
        return conFoto(fotoPerfilService.fotoActual());
    }

    @PutMapping("/me/foto")
    @Operation(summary = "Subir o quitar (foto = null) la foto de perfil")
    public Map<String, String> guardarFoto(@RequestBody FotoRequest req) {
        return conFoto(fotoPerfilService.guardar(req.foto()));
    }

    /** Map.of no acepta null, por eso se usa HashMap. */
    private static Map<String, String> conFoto(String foto) {
        Map<String, String> r = new HashMap<>();
        r.put("foto", foto);
        return r;
    }

    @PostMapping("/cambiar-password")
    public Map<String, String> cambiarPassword(@Valid @RequestBody CambiarPasswordRequest req) {
        if (!req.nuevaPassword().equals(req.confirmarPassword())) {
            throw new BusinessException(ErrorCode.PASSWORDS_NO_COINCIDEN);
        }
        authService.cambiarPassword(req.passwordActual(), req.nuevaPassword());
        return Map.of("mensaje", "Contraseña actualizada. Vuelve a iniciar sesión en tus otros dispositivos.");
    }

    // ---------- ¿Olvidaste tu contraseña? ----------

    @PostMapping("/forgot-password")
    @Operation(summary = "Paso 1: enviar código de verificación al correo")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        recuperacionService.solicitarCodigo(req.correo());
        return Map.of("mensaje", "Si el correo está registrado, te enviamos un código de verificación.");
    }

    @PostMapping("/verify-code")
    @Operation(summary = "Paso 2: validar el código de 6 dígitos (devuelve resetToken)")
    public RecuperacionPasswordService.ResultadoVerificacion verifyCode(@Valid @RequestBody VerifyCodeRequest req) {
        return recuperacionService.verificarCodigo(req.correo(), req.codigo());
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Paso 3: guardar la nueva contraseña")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        if (!req.nuevaPassword().equals(req.confirmarPassword())) {
            throw new BusinessException(ErrorCode.PASSWORDS_NO_COINCIDEN);
        }
        recuperacionService.restablecerPassword(req.resetToken(), req.nuevaPassword());
        return Map.of("mensaje", "Tu contraseña fue actualizada. Ya puedes iniciar sesión.");
    }

    /** IP real del cliente (respeta el header X-Forwarded-For si hay un proxy). */
    private static String ip(HttpServletRequest http) {
        String ip = AuditoriaService.ipActual();
        return ip != null ? ip : http.getRemoteAddr();
    }
}
