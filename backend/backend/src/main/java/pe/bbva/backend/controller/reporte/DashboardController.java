package pe.bbva.backend.controller.reporte;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.service.reporte.DashboardRolService;
import pe.bbva.backend.service.reporte.DashboardService;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardRolService dashboardRolService;

    public DashboardController(DashboardService dashboardService, DashboardRolService dashboardRolService) {
        this.dashboardService = dashboardService;
        this.dashboardRolService = dashboardRolService;
    }

    @GetMapping("/rol")
    @Operation(summary = "Datos del dashboard específico del rol del usuario logueado")
    public Map<String, Object> porRol() {
        return dashboardRolService.datos();
    }

    @GetMapping("/resumen")
    @Operation(summary = "KPIs y gráficos del Resumen General (se adapta al rol)")
    public Map<String, Object> resumen() {
        return dashboardService.resumen();
    }
}
