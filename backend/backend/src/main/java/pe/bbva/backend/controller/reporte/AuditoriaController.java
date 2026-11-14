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
import pe.bbva.backend.service.reporte.AuditoriaService;

/** Admin y Supervisor ven todo. El Analista solo ve sus propias acciones. */
@RestController
@RequestMapping("/api/auditoria")
@Tag(name = "Historial y auditoría")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;
    private final SecurityUtils securityUtils;

    public AuditoriaController(AuditoriaService auditoriaService, SecurityUtils securityUtils) {
        this.auditoriaService = auditoriaService;
        this.securityUtils = securityUtils;
    }

    @GetMapping
    @Operation(summary = "Historial de decisiones y acciones")
    public Page<HistorialDecision> listar(@RequestParam(required = false) TipoAccion accion,
                                          @RequestParam(required = false) Long usuarioId,
                                          @PageableDefault(size = 30) Pageable pageable) {
        if (SecurityUtils.tieneRol(Rol.ANALISTA)) {
            usuarioId = securityUtils.usuarioActual().getId();
        }
        return auditoriaService.listar(accion, usuarioId, pageable);
    }

    @GetMapping("/accesos")
    @Operation(summary = "Registro de inicios de sesión (solo Administrador)")
    public Page<RegistroAcceso> accesos(@RequestParam(required = false) String correo,
                                        @PageableDefault(size = 30) Pageable pageable) {
        return auditoriaService.accesos(correo, pageable);
    }
}
