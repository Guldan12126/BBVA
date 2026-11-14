package pe.bbva.backend.controller.fraude;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
import pe.bbva.backend.model.enums.EstadoCaso;
import pe.bbva.backend.model.enums.Prioridad;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.fraude.Caso;
import pe.bbva.backend.service.fraude.CasoService;

import java.util.List;

/** Analista y Supervisor. */
@RestController
@RequestMapping("/api/casos")
@Tag(name = "Casos de investigación")
public class CasoController {

    public record CasoRequest(@NotBlank @Size(max = 150) String titulo, @Size(max = 1000) String descripcion,
                              Prioridad prioridad, Long clienteId, List<Long> alertaIds) {
    }

    public record EstadoRequest(@NotNull EstadoCaso estado) {
    }

    public record CerrarRequest(@NotBlank @Size(max = 1000) String conclusion) {
    }

    private final CasoService casoService;

    public CasoController(CasoService casoService) {
        this.casoService = casoService;
    }

    @GetMapping
    public List<Caso> listar(@RequestParam(required = false) EstadoCaso estado) {
        return casoService.listar(estado);
    }

    @GetMapping("/{id}")
    public Caso obtener(@PathVariable Long id) {
        return casoService.obtener(id);
    }

    @GetMapping("/{id}/alertas")
    public List<Alerta> alertas(@PathVariable Long id) {
        return casoService.alertas(id);
    }

    @PostMapping
    public ResponseEntity<Caso> crear(@Valid @RequestBody CasoRequest req) {
        Caso c = casoService.crear(req.titulo(), req.descripcion(), req.prioridad(), req.clienteId(), req.alertaIds());
        return ResponseEntity.status(HttpStatus.CREATED).body(c);
    }

    @PatchMapping("/{id}/alertas/{alertaId}")
    public Caso agregarAlerta(@PathVariable Long id, @PathVariable Long alertaId) {
        return casoService.agregarAlerta(id, alertaId);
    }

    @PatchMapping("/{id}/estado")
    public Caso cambiarEstado(@PathVariable Long id, @Valid @RequestBody EstadoRequest req) {
        return casoService.cambiarEstado(id, req.estado());
    }

    @PatchMapping("/{id}/cerrar")
    public Caso cerrar(@PathVariable Long id, @Valid @RequestBody CerrarRequest req) {
        return casoService.cerrar(id, req.conclusion());
    }
}
