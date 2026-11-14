package pe.bbva.backend.controller.fraude;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.enums.TipoListaNegra;
import pe.bbva.backend.model.fraude.ListaNegra;
import pe.bbva.backend.service.fraude.ListaNegraService;

import java.util.List;

/** Agregar: Administrador y Analista. Desactivar / eliminar: solo Administrador. */
@RestController
@RequestMapping("/api/lista-negra")
@Tag(name = "Lista negra")
public class ListaNegraController {

    /** Para TARJETA y COMERCIO, "valor" es el id. Para IP y DISPOSITIVO, el texto. */
    public record ListaNegraRequest(@NotNull TipoListaNegra tipo, @NotBlank String valor, String motivo,
                                    Integer diasVigencia) {
    }

    private final ListaNegraService listaNegraService;

    public ListaNegraController(ListaNegraService listaNegraService) {
        this.listaNegraService = listaNegraService;
    }

    @GetMapping
    public List<ListaNegra> listar() {
        return listaNegraService.listar();
    }

    @PostMapping
    public ResponseEntity<ListaNegra> agregar(@Valid @RequestBody ListaNegraRequest req) {
        ListaNegra l = listaNegraService.agregar(req.tipo(), req.valor(), req.motivo(), req.diasVigencia());
        return ResponseEntity.status(HttpStatus.CREATED).body(l);
    }

    @PatchMapping("/{id}/desactivar")
    public ListaNegra desactivar(@PathVariable Long id) {
        return listaNegraService.desactivar(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        listaNegraService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
