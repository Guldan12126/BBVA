package pe.bbva.backend.controller.notificacion;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.enums.ResultadoAtencion;
import pe.bbva.backend.model.notificacion.AtencionCliente;
import pe.bbva.backend.service.notificacion.AtencionClienteService;

import java.util.List;

/** Registrar atención: solo Operador de Atención al Cliente. */
@RestController
@RequestMapping("/api/atencion")
@Tag(name = "Atención al cliente")
public class AtencionClienteController {

    public record AtencionRequest(@NotNull Long alertaId, @NotNull ResultadoAtencion resultado,
                                  @Size(max = 1000) String observacion, Boolean bloquearTarjeta) {
    }

    private final AtencionClienteService atencionService;

    public AtencionClienteController(AtencionClienteService atencionService) {
        this.atencionService = atencionService;
    }

    @GetMapping("/mias")
    public List<AtencionCliente> mias() {
        return atencionService.mias();
    }

    @GetMapping("/alerta/{alertaId}")
    public List<AtencionCliente> porAlerta(@PathVariable Long alertaId) {
        return atencionService.porAlerta(alertaId);
    }

    @PostMapping
    public ResponseEntity<AtencionCliente> registrar(@Valid @RequestBody AtencionRequest req) {
        AtencionCliente a = atencionService.registrar(req.alertaId(), req.resultado(), req.observacion(),
                Boolean.TRUE.equals(req.bloquearTarjeta()));
        return ResponseEntity.status(HttpStatus.CREATED).body(a);
    }
}
