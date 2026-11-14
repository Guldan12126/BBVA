package pe.bbva.backend.controller.seguridad;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.enums.EstadoUsuario;
import pe.bbva.backend.model.enums.Rol;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.service.seguridad.UsuarioService;
import pe.bbva.backend.validation.PasswordSegura;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** Solo Administrador del Sistema (ver SecurityConfig). */
@RestController
@RequestMapping("/api/usuarios")
@Tag(name = "Usuarios y roles")
public class UsuarioController {

    public record CrearUsuarioRequest(@NotBlank @Size(max = 100) String nombres,
                                      @NotBlank @Size(max = 100) String apellidos,
                                      @NotBlank @Email String correo,
                                      @PasswordSegura String password,
                                      @NotNull Rol rol) {
    }

    public record ActualizarUsuarioRequest(@NotBlank String nombres, @NotBlank String apellidos,
                                           @NotBlank @Email String correo, @NotNull Rol rol) {
    }

    public record EstadoRequest(@NotNull EstadoUsuario estado) {
    }

    public record PasswordRequest(@PasswordSegura String nuevaPassword) {
    }

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public List<Usuario> listar(@RequestParam(required = false) Rol rol) {
        return usuarioService.listar(rol);
    }

    @GetMapping("/roles")
    public List<Map<String, String>> roles() {
        return Arrays.stream(Rol.values())
                .map(r -> Map.of("rol", r.name(), "descripcion", r.getDescripcion()))
                .toList();
    }

    @GetMapping("/{id}")
    public Usuario obtener(@PathVariable Long id) {
        return usuarioService.obtener(id);
    }

    @PostMapping
    public ResponseEntity<Usuario> crear(@Valid @RequestBody CrearUsuarioRequest req) {
        Usuario u = usuarioService.crear(req.nombres(), req.apellidos(), req.correo(), req.password(), req.rol());
        return ResponseEntity.status(HttpStatus.CREATED).body(u);
    }

    @PutMapping("/{id}")
    public Usuario actualizar(@PathVariable Long id, @Valid @RequestBody ActualizarUsuarioRequest req) {
        return usuarioService.actualizar(id, req.nombres(), req.apellidos(), req.correo(), req.rol());
    }

    @PatchMapping("/{id}/estado")
    public Usuario cambiarEstado(@PathVariable Long id, @Valid @RequestBody EstadoRequest req) {
        return usuarioService.cambiarEstado(id, req.estado());
    }

    @PatchMapping("/{id}/password")
    public Map<String, String> restablecerPassword(@PathVariable Long id, @Valid @RequestBody PasswordRequest req) {
        usuarioService.restablecerPassword(id, req.nuevaPassword());
        return Map.of("mensaje", "Contraseña restablecida");
    }

    /** No se borra físicamente: queda INACTIVO para conservar la auditoría. */
    @DeleteMapping("/{id}")
    public Usuario desactivar(@PathVariable Long id) {
        return usuarioService.cambiarEstado(id, EstadoUsuario.INACTIVO);
    }
}
