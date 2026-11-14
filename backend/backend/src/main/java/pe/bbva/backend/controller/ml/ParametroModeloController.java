package pe.bbva.backend.controller.ml;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.ml.ParametroModelo;
import pe.bbva.backend.service.ml.ParametroModeloService;

import java.util.List;

/** Umbrales del motor de riesgo. Editar: solo Administrador. */
@RestController
@RequestMapping("/api/parametros")
@Tag(name = "Parámetros del modelo")
public class ParametroModeloController {

    public record ValorRequest(@NotBlank String valor) {
    }

    private final ParametroModeloService parametroService;

    public ParametroModeloController(ParametroModeloService parametroService) {
        this.parametroService = parametroService;
    }

    @GetMapping
    public List<ParametroModelo> listar() {
        return parametroService.listar();
    }

    @PutMapping("/{clave}")
    public ParametroModelo actualizar(@PathVariable String clave, @Valid @RequestBody ValorRequest req) {
        return parametroService.actualizar(clave, req.valor());
    }
}
