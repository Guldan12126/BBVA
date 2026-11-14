package pe.bbva.backend.controller.fraude;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.auditoria.HistorialDecision;
import pe.bbva.backend.model.enums.EstadoAlerta;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.fraude.ComentarioAlerta;
import pe.bbva.backend.model.notificacion.AtencionCliente;
import pe.bbva.backend.model.notificacion.Notificacion;
import pe.bbva.backend.service.fraude.AlertaService;
import pe.bbva.backend.service.notificacion.AtencionClienteService;
import pe.bbva.backend.service.notificacion.NotificacionService;
import pe.bbva.backend.service.reporte.AuditoriaService;

import java.util.List;
import java.util.Map;

/**
 * Confirmar o descartar fraude: SOLO Analista de Fraude.
 * El Administrador ve las alertas en modo lectura.
 */
@RestController
@RequestMapping("/api/alertas")
@Tag(name = "Alertas de fraude")
public class AlertaController {

    public record AsignarRequest(@NotNull Long usuarioId) {
    }

    public record DecisionRequest(@NotNull Boolean esFraude, @Size(max = 500) String comentario,
                                  Boolean bloquearTarjeta) {
    }

    public record EscalarRequest(@NotBlank @Size(max = 500) String motivo) {
    }

    public record ComentarioRequest(@NotBlank @Size(max = 1000) String texto) {
    }

    private final AlertaService alertaService;
    private final AuditoriaService auditoriaService;
    private final NotificacionService notificacionService;
    private final AtencionClienteService atencionClienteService;

    public AlertaController(AlertaService alertaService, AuditoriaService auditoriaService,
                            NotificacionService notificacionService, AtencionClienteService atencionClienteService) {
        this.alertaService = alertaService;
        this.auditoriaService = auditoriaService;
        this.notificacionService = notificacionService;
        this.atencionClienteService = atencionClienteService;
    }

    @GetMapping
    public Page<Alerta> buscar(@RequestParam(required = false) EstadoAlerta estado,
                               @RequestParam(required = false) NivelRiesgo nivel,
                               @RequestParam(required = false) Long asignadoId,
                               @RequestParam(required = false) Boolean activas,
                               @PageableDefault(size = 20) Pageable pageable) {
        return alertaService.buscar(estado, nivel, asignadoId, activas, pageable);
    }

    @GetMapping("/cola")
    @Operation(summary = "Cola de alertas activas ordenada por probabilidad de fraude")
    public Page<Alerta> cola(@RequestParam(required = false) NivelRiesgo nivel,
                             @PageableDefault(size = 20) Pageable pageable) {
        return alertaService.cola(nivel, pageable);
    }

    @GetMapping("/mias")
    @Operation(summary = "Alertas asignadas al usuario logueado")
    public Page<Alerta> mias(@RequestParam(defaultValue = "true") Boolean activas,
                             @PageableDefault(size = 20) Pageable pageable) {
        return alertaService.mias(activas, pageable);
    }

    @GetMapping("/resumen")
    @Operation(summary = "Alertas activas por nivel (vista administrativa)")
    public Map<NivelRiesgo, Long> resumen() {
        return alertaService.resumenPorNivel();
    }

    @GetMapping("/{id}")
    public Alerta obtener(@PathVariable Long id) {
        return alertaService.obtener(id);
    }

    @GetMapping("/transaccion/{transaccionId}")
    public Alerta porTransaccion(@PathVariable Long transaccionId) {
        return alertaService.porTransaccion(transaccionId);
    }

    @PatchMapping("/{id}/asignar")
    public Alerta asignar(@PathVariable Long id, @Valid @RequestBody AsignarRequest req) {
        return alertaService.asignar(id, req.usuarioId());
    }

    @PatchMapping("/{id}/tomar")
    public Alerta tomar(@PathVariable Long id) {
        return alertaService.tomar(id);
    }

    @PatchMapping("/{id}/decision")
    @Operation(summary = "Confirmar fraude (esFraude=true) o descartar como falso positivo (false)")
    public Alerta decidir(@PathVariable Long id, @Valid @RequestBody DecisionRequest req) {
        return alertaService.decidir(id, req.esFraude(), req.comentario(), Boolean.TRUE.equals(req.bloquearTarjeta()));
    }

    @PatchMapping("/{id}/escalar")
    public Alerta escalar(@PathVariable Long id, @Valid @RequestBody EscalarRequest req) {
        return alertaService.escalar(id, req.motivo());
    }

    @GetMapping("/{id}/comentarios")
    public List<ComentarioAlerta> comentarios(@PathVariable Long id) {
        return alertaService.comentarios(id);
    }

    @PostMapping("/{id}/comentarios")
    public ComentarioAlerta comentar(@PathVariable Long id, @Valid @RequestBody ComentarioRequest req) {
        return alertaService.comentar(id, req.texto());
    }

    @GetMapping("/{id}/historial")
    public List<HistorialDecision> historial(@PathVariable Long id) {
        return auditoriaService.porAlerta(id);
    }

    @GetMapping("/{id}/notificaciones")
    public List<Notificacion> notificaciones(@PathVariable Long id) {
        return notificacionService.porAlerta(id);
    }

    @GetMapping("/{id}/atenciones")
    public List<AtencionCliente> atenciones(@PathVariable Long id) {
        return atencionClienteService.porAlerta(id);
    }
}
