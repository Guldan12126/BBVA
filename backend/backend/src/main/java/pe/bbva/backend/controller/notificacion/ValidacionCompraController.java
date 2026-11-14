package pe.bbva.backend.controller.notificacion;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.service.notificacion.ValidacionCompraService;

import java.util.Map;

/** Ruta PÚBLICA (sin login): el cliente entra desde el enlace que recibió. */
@RestController
@RequestMapping("/api/public/validar-compra")
@Tag(name = "Portal del cliente (público)")
public class ValidacionCompraController {

    public record RespuestaRequest(@NotNull Boolean reconoce) {
    }

    private final ValidacionCompraService validacionService;

    public ValidacionCompraController(ValidacionCompraService validacionService) {
        this.validacionService = validacionService;
    }

    @GetMapping("/{token}")
    @Operation(summary = "Datos de la compra a validar")
    public Map<String, Object> consultar(@PathVariable String token) {
        return validacionService.consultar(token);
    }

    @PostMapping("/{token}")
    @Operation(summary = "El cliente responde: reconoce=true (Sí, fui yo) o false (No reconozco)")
    public Map<String, Object> responder(@PathVariable String token, @Valid @RequestBody RespuestaRequest req) {
        return validacionService.responder(token, req.reconoce());
    }
}
