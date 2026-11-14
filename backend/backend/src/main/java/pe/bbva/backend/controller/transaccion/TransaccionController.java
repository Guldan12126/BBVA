package pe.bbva.backend.controller.transaccion;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.enums.Canal;
import pe.bbva.backend.model.enums.Clasificacion;
import pe.bbva.backend.model.enums.EstadoTransaccion;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.service.transaccion.TransaccionService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transacciones")
@Tag(name = "Transacciones")
public class TransaccionController {

    /** Transacción que envía el simulador POS / App. */
    public record TransaccionRequest(@NotNull Long tarjetaId,
                                     @NotNull Long comercioId,
                                     @NotNull @DecimalMin(value = "0.10", message = "El monto debe ser mayor a 0") BigDecimal monto,
                                     @NotNull Canal canal,
                                     String ciudad,
                                     Double latitud,
                                     Double longitud,
                                     String dispositivo) {
    }

    private final TransaccionService transaccionService;

    public TransaccionController(TransaccionService transaccionService) {
        this.transaccionService = transaccionService;
    }

    @GetMapping
    @Operation(summary = "Buscar transacciones con filtros (texto = código o últimos 4 dígitos)")
    public Page<Transaccion> buscar(
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) NivelRiesgo nivel,
            @RequestParam(required = false) Canal canal,
            @RequestParam(required = false) EstadoTransaccion estado,
            @RequestParam(required = false) Clasificacion clasificacion,
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @PageableDefault(size = 20) Pageable pageable) {
        return transaccionService.buscar(texto, nivel, canal, estado, clasificacion, clienteId, desde, hasta, pageable);
    }

    @GetMapping("/recientes")
    public List<Transaccion> recientes() {
        return transaccionService.recientes();
    }

    @GetMapping("/{id}")
    public Transaccion obtener(@PathVariable Long id) {
        return transaccionService.obtener(id);
    }

    @GetMapping("/codigo/{codigo}")
    public Transaccion porCodigo(@PathVariable String codigo) {
        return transaccionService.porCodigo(codigo);
    }

    @PostMapping
    @Operation(summary = "Registrar y evaluar una transacción (motor de riesgo + IA)")
    public ResponseEntity<Map<String, Object>> registrar(@Valid @RequestBody TransaccionRequest req,
                                                         HttpServletRequest http) {
        TransaccionService.Resultado r = transaccionService.registrar(req.tarjetaId(), req.comercioId(), req.monto(),
                req.canal(), req.ciudad(), req.latitud(), req.longitud(), http.getRemoteAddr(), req.dispositivo(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta(r));
    }

    static Map<String, Object> respuesta(TransaccionService.Resultado r) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("transaccion", r.transaccion());
        body.put("alertaGenerada", r.alerta() != null);
        body.put("alertaId", r.alerta() != null ? r.alerta().getId() : null);
        body.put("alertaCodigo", r.alerta() != null ? r.alerta().getCodigo() : null);
        if (r.evaluacion() != null) {
            body.put("factores", r.evaluacion().factores());
            body.put("evaluadoPorIa", r.evaluacion().evaluadoPorIa());
        }
        return body;
    }
}
