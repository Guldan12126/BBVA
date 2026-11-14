package pe.bbva.backend.controller.transaccion;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.service.transaccion.SimuladorService;

import java.util.Map;

/** Simulador POS / App para la demo (solo Administrador). */
@RestController
@RequestMapping("/api/simulador")
@Tag(name = "Simulador POS")
public class SimuladorController {

    public record LoteRequest(@NotNull @Min(1) @Max(500) Integer cantidad,
                              @NotNull @Min(0) @Max(100) Integer porcentajeFraude) {
    }

    private final SimuladorService simuladorService;

    public SimuladorController(SimuladorService simuladorService) {
        this.simuladorService = simuladorService;
    }

    @PostMapping("/transaccion")
    @Operation(summary = "Genera una compra aleatoria (fraude=true para una sospechosa)")
    public Map<String, Object> transaccion(@RequestParam(defaultValue = "false") boolean fraude) {
        return TransaccionController.respuesta(simuladorService.generar(fraude));
    }

    @PostMapping("/lote")
    @Operation(summary = "Genera varias compras de golpe")
    public Map<String, Object> lote(@Valid @RequestBody LoteRequest req) {
        return simuladorService.generarLote(req.cantidad(), req.porcentajeFraude());
    }
}
