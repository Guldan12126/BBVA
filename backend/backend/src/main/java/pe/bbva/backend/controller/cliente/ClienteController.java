package pe.bbva.backend.controller.cliente;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.cliente.Cliente;
import pe.bbva.backend.model.cliente.PerfilCliente;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.notificacion.Notificacion;
import pe.bbva.backend.service.cliente.ClienteService;
import pe.bbva.backend.service.cliente.PerfilClienteService;
import pe.bbva.backend.service.cliente.TarjetaService;
import pe.bbva.backend.service.notificacion.NotificacionService;
import pe.bbva.backend.validation.Dni;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
@Tag(name = "Clientes")
public class ClienteController {

    public record ClienteRequest(@NotBlank String nombres, @NotBlank String apellidos, @Dni String dni,
                                 String telefono, @Email String correo, @NotBlank String ciudad,
                                 String direccion) {

        Cliente aEntidad() {
            Cliente c = new Cliente();
            c.setNombres(nombres);
            c.setApellidos(apellidos);
            c.setDni(dni);
            c.setTelefono(telefono);
            c.setCorreo(correo);
            c.setCiudad(ciudad);
            c.setDireccion(direccion);
            return c;
        }
    }

    private final ClienteService clienteService;
    private final TarjetaService tarjetaService;
    private final PerfilClienteService perfilClienteService;
    private final NotificacionService notificacionService;

    public ClienteController(ClienteService clienteService, TarjetaService tarjetaService,
                             PerfilClienteService perfilClienteService, NotificacionService notificacionService) {
        this.clienteService = clienteService;
        this.tarjetaService = tarjetaService;
        this.perfilClienteService = perfilClienteService;
        this.notificacionService = notificacionService;
    }

    @GetMapping
    public Page<Cliente> listar(@RequestParam(required = false) String q,
                                @PageableDefault(size = 20) Pageable pageable) {
        return clienteService.listar(q, pageable);
    }

    @GetMapping("/{id}")
    public Cliente obtener(@PathVariable Long id) {
        return clienteService.obtener(id);
    }

    @GetMapping("/{id}/tarjetas")
    public List<Tarjeta> tarjetas(@PathVariable Long id) {
        return tarjetaService.porCliente(id);
    }

    @GetMapping("/{id}/perfil")
    public PerfilCliente perfil(@PathVariable Long id) {
        return perfilClienteService.porCliente(id);
    }

    @GetMapping("/{id}/notificaciones")
    public List<Notificacion> notificaciones(@PathVariable Long id) {
        return notificacionService.porCliente(id);
    }

    @PostMapping
    public ResponseEntity<Cliente> crear(@Valid @RequestBody ClienteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteService.crear(req.aEntidad()));
    }

    @PutMapping("/{id}")
    public Cliente actualizar(@PathVariable Long id, @Valid @RequestBody ClienteRequest req) {
        return clienteService.actualizar(id, req.aEntidad());
    }
}
