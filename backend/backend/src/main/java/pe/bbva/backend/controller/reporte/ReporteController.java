package pe.bbva.backend.controller.reporte;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.bbva.backend.model.auditoria.Reporte;
import pe.bbva.backend.model.enums.TipoReporte;
import pe.bbva.backend.service.reporte.ReporteService;

import java.time.LocalDate;
import java.util.List;

/** Administrador y Supervisor. */
@RestController
@RequestMapping("/api/reportes")
@Tag(name = "Reportes")
public class ReporteController {

    public record ReporteRequest(@NotNull TipoReporte tipo, LocalDate desde, LocalDate hasta) {
    }

    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    @GetMapping
    public List<Reporte> listar() {
        return reporteService.listar();
    }

    @GetMapping("/{id}")
    public Reporte obtener(@PathVariable Long id) {
        return reporteService.obtener(id);
    }

    @PostMapping
    public ResponseEntity<Reporte> generar(@Valid @RequestBody ReporteRequest req) {
        Reporte r = reporteService.generar(req.tipo(), req.desde(), req.hasta());
        return ResponseEntity.status(HttpStatus.CREATED).body(r);
    }

    @GetMapping("/{id}/descargar")
    @Operation(summary = "Descarga el detalle en CSV (se abre en Excel)")
    public ResponseEntity<byte[]> descargar(@PathVariable Long id) {
        byte[] csv = reporteService.exportarCsv(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"reporte-" + id + ".csv\"")
                .contentType(new MediaType("text", "csv"))
                .body(csv);
    }
}
