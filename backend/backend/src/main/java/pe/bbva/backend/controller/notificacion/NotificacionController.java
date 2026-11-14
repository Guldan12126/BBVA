package pe.bbva.backend.controller.notificacion;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.notificacion.Notificacion;
import pe.bbva.backend.service.notificacion.NotificacionService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notificaciones")
@Tag(name = "Notificaciones al cliente")
public class NotificacionController {

    private final NotificacionService notificacionService;

    public NotificacionController(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @GetMapping
    public List<Notificacion> listar() {
        return notificacionService.listar();
    }

    @GetMapping("/{id}")
    public Map<String, Object> obtener(@PathVariable Long id) {
        Notificacion n = notificacionService.obtener(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("notificacion", n);
        m.put("enlace", notificacionService.enlace(n));
        return m;
    }

    @PostMapping("/alerta/{alertaId}/reenviar")
    @Operation(summary = "Envía un nuevo enlace '¿Reconoces esta compra?' al cliente (Operador / Analista)")
    public Map<String, Object> reenviar(@PathVariable Long alertaId) {
        Notificacion n = notificacionService.reenviar(alertaId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("notificacion", n);
        m.put("enlace", notificacionService.enlace(n));
        return m;
    }
}
