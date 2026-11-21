package pe.bbva.backend.controller.reporte;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.auditoria.HistorialDecision;
import pe.bbva.backend.model.enums.Rol;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.seguridad.RegistroAcceso;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.service.reporte.AuditoriaConsultaService;

import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Admin y Supervisor ven todo. El Analista solo ve sus propias acciones. */
@RestController
@RequestMapping("/api/auditoria")
@Tag(name = "Historial y auditoría")
public class AuditoriaController {

    private final AuditoriaConsultaService consultaService;
    private final SecurityUtils securityUtils;

    public AuditoriaController(AuditoriaConsultaService consultaService, SecurityUtils securityUtils) {
        this.consultaService = consultaService;
        this.securityUtils = securityUtils;
    }

    /** El Analista solo puede ver sus propias acciones. */
    private Long usuarioPermitido(Long usuarioId) {
        return SecurityUtils.tieneRol(Rol.ANALISTA) ? securityUtils.usuarioActual().getId() : usuarioId;
    }

    @GetMapping
    @Operation(summary = "Historial de acciones con filtros (acciones separadas por coma, rango de fechas y texto)")
    public Page<HistorialDecision> listar(@RequestParam(required = false) List<TipoAccion> accion,
                                          @RequestParam(required = false) Long usuarioId,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                          @RequestParam(required = false) String q,
                                          @PageableDefault(size = 30) Pageable pageable) {
        return consultaService.buscar(accion, usuarioPermitido(usuarioId), desde, hasta, q, pageable);
    }

    @GetMapping("/resumen")
    @Operation(summary = "Actividad de los últimos días: por día, por tipo de acción y por usuario")
    public Map<String, Object> resumen(@RequestParam(defaultValue = "14") int dias,
                                       @RequestParam(required = false) Long usuarioId) {
        return consultaService.resumen(Math.max(1, Math.min(dias, 90)), usuarioPermitido(usuarioId));
    }

    @GetMapping("/accesos")
    @Operation(summary = "Registro de inicios de sesión (solo Administrador)")
    public Page<RegistroAcceso> accesos(@RequestParam(required = false) String correo,
                                        @RequestParam(required = false) Boolean exitoso,
                                        @RequestParam(required = false) String ip,
                                        @PageableDefault(size = 30) Pageable pageable) {
        return consultaService.accesos(correo, exitoso, ip, pageable);
    }

    @GetMapping("/accesos/resumen")
    @Operation(summary = "Resumen de inicios de sesión: 24 h, 14 días y correos con más fallos (solo Administrador)")
    public Map<String, Object> resumenAccesos() {
        return consultaService.resumenAccesos();
    }
}
