package pe.bbva.backend.controller.ml;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.ml.VersionModelo;
import pe.bbva.backend.service.ml.ModeloIaService;

import java.util.List;
import java.util.Map;

/** Lectura: Admin, Supervisor y Analista. Reentrenar: solo Administrador. */
@RestController
@RequestMapping("/api/modelo")
@Tag(name = "Modelo de Machine Learning")
public class ModeloIaController {

    private final ModeloIaService modeloIaService;

    public ModeloIaController(ModeloIaService modeloIaService) {
        this.modeloIaService = modeloIaService;
    }

    @GetMapping("/estado")
    @Operation(summary = "¿FastAPI responde? versión activa, umbrales y feedback pendiente")
    public Map<String, Object> estado() {
        return modeloIaService.estado();
    }

    @GetMapping("/info")
    @Operation(summary = "Información que devuelve FastAPI en /model/info")
    public Map<String, Object> info() {
        return modeloIaService.informacionModelo();
    }

    @GetMapping("/versiones")
    public List<VersionModelo> versiones() {
        return modeloIaService.versiones();
    }

    @PostMapping("/verificar")
    public Map<String, Object> verificar() {
        modeloIaService.verificarSalud();
        return modeloIaService.estado();
    }

    @PostMapping("/reentrenar")
    @Operation(summary = "Reentrena el modelo con las decisiones de los analistas")
    public VersionModelo reentrenar() {
        return modeloIaService.reentrenar();
    }
}
