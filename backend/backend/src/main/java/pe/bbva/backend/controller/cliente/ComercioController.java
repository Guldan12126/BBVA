package pe.bbva.backend.controller.cliente;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
import pe.bbva.backend.model.cliente.Comercio;
import pe.bbva.backend.model.enums.CategoriaComercio;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.service.cliente.ComercioService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comercios")
@Tag(name = "Comercios")
public class ComercioController {

    public record ComercioRequest(@NotBlank String nombre, @NotNull CategoriaComercio categoria,
                                  @NotBlank String ciudad, Double latitud, Double longitud,
                                  NivelRiesgo nivelRiesgo, Boolean internacional) {

        Comercio aEntidad() {
            Comercio c = new Comercio();
            c.setNombre(nombre);
            c.setCategoria(categoria);
            c.setCiudad(ciudad);
            c.setLatitud(latitud);
            c.setLongitud(longitud);
            c.setNivelRiesgo(nivelRiesgo == null ? NivelRiesgo.BAJO : nivelRiesgo);
            c.setInternacional(Boolean.TRUE.equals(internacional));
            return c;
        }
    }

    private final ComercioService comercioService;

    public ComercioController(ComercioService comercioService) {
        this.comercioService = comercioService;
    }

    @GetMapping
    public List<Comercio> listar(@RequestParam(required = false) CategoriaComercio categoria) {
        return comercioService.listar(categoria);
    }

    @GetMapping("/estadisticas")
    public Map<Long, Map<String, Object>> estadisticas() {
        return comercioService.estadisticas();
    }

    @GetMapping("/{id}")
    public Comercio obtener(@PathVariable Long id) {
        return comercioService.obtener(id);
    }

    @PostMapping
    public ResponseEntity<Comercio> crear(@Valid @RequestBody ComercioRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(comercioService.crear(req.aEntidad()));
    }

    @PutMapping("/{id}")
    public Comercio actualizar(@PathVariable Long id, @Valid @RequestBody ComercioRequest req) {
        return comercioService.actualizar(id, req.aEntidad());
    }
}
