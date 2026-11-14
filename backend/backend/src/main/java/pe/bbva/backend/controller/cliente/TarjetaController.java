package pe.bbva.backend.controller.cliente;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.TipoTarjeta;
import pe.bbva.backend.service.cliente.TarjetaService;

import java.math.BigDecimal;
import java.util.List;

/** Todos los roles pueden bloquear una tarjeta (el Operador lo hace a pedido del cliente). */
@RestController
@RequestMapping("/api/tarjetas")
@Tag(name = "Tarjetas")
public class TarjetaController {

    public record TarjetaRequest(@NotNull Long clienteId,
                                 @NotBlank String numero,
                                 @NotNull TipoTarjeta tipo,
                                 @Pattern(regexp = "\\d{2}/\\d{2}", message = "Formato MM/AA") String fechaVencimiento,
                                 BigDecimal limiteCredito) {
    }

    public record BloqueoRequest(Boolean temporal, String motivo) {
    }

    public record MotivoRequest(String motivo) {
    }

    private final TarjetaService tarjetaService;

    public TarjetaController(TarjetaService tarjetaService) {
        this.tarjetaService = tarjetaService;
    }

    @GetMapping
    public List<Tarjeta> listar(@RequestParam(required = false) EstadoTarjeta estado) {
        return tarjetaService.listar(estado);
    }

    @GetMapping("/{id}")
    public Tarjeta obtener(@PathVariable Long id) {
        return tarjetaService.obtener(id);
    }

    @PostMapping
    public ResponseEntity<Tarjeta> crear(@Valid @RequestBody TarjetaRequest req) {
        Tarjeta t = tarjetaService.crear(req.clienteId(), req.numero(), req.tipo(), req.fechaVencimiento(),
                req.limiteCredito());
        return ResponseEntity.status(HttpStatus.CREATED).body(t);
    }

    @PatchMapping("/{id}/bloquear")
    public Tarjeta bloquear(@PathVariable Long id, @RequestBody(required = false) BloqueoRequest req) {
        boolean temporal = req == null || req.temporal() == null || req.temporal();
        return tarjetaService.bloquear(id, temporal, req == null ? null : req.motivo());
    }

    @PatchMapping("/{id}/desbloquear")
    public Tarjeta desbloquear(@PathVariable Long id, @RequestBody(required = false) MotivoRequest req) {
        return tarjetaService.desbloquear(id, req == null ? null : req.motivo());
    }
}
