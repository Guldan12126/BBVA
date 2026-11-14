package pe.bbva.backend.controller.fraude;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.enums.TipoRegla;
import pe.bbva.backend.model.fraude.ReglaFraude;
import pe.bbva.backend.service.fraude.ReglaFraudeService;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** Lectura: Admin, Analista y Supervisor. Cambios: solo Administrador. */
@RestController
@RequestMapping("/api/reglas")
@Tag(name = "Reglas del motor de riesgo")
public class ReglaFraudeController {

    public record ReglaRequest(@NotBlank String nombre, String descripcion, @NotNull TipoRegla tipo,
                               @NotNull Double valorUmbral,
                               @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double peso,
                               Boolean activa) {

        ReglaFraude aEntidad() {
            ReglaFraude r = new ReglaFraude();
            r.setNombre(nombre);
            r.setDescripcion(descripcion);
            r.setTipo(tipo);
            r.setValorUmbral(valorUmbral);
            r.setPeso(peso);
            r.setActiva(activa == null || activa);
            return r;
        }
    }

    private final ReglaFraudeService reglaService;

    public ReglaFraudeController(ReglaFraudeService reglaService) {
        this.reglaService = reglaService;
    }

    @GetMapping
    public List<ReglaFraude> listar() {
        return reglaService.listar();
    }

    @GetMapping("/tipos")
    public List<Map<String, String>> tipos() {
        return Arrays.stream(TipoRegla.values())
                .map(t -> Map.of("tipo", t.name(), "descripcion", t.getDescripcion()))
                .toList();
    }

    @GetMapping("/{id}")
    public ReglaFraude obtener(@PathVariable Long id) {
        return reglaService.obtener(id);
    }

    @PostMapping
    public ResponseEntity<ReglaFraude> crear(@Valid @RequestBody ReglaRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reglaService.crear(req.aEntidad()));
    }

    @PutMapping("/{id}")
    public ReglaFraude actualizar(@PathVariable Long id, @Valid @RequestBody ReglaRequest req) {
        return reglaService.actualizar(id, req.aEntidad());
    }

    @PatchMapping("/{id}/activa")
    public ReglaFraude activar(@PathVariable Long id, @RequestParam boolean valor) {
        return reglaService.cambiarActiva(id, valor);
    }
}
