package pe.bbva.backend.service.reporte;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.auditoria.Reporte;
import pe.bbva.backend.model.enums.Clasificacion;
import pe.bbva.backend.model.enums.EstadoAlerta;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.enums.TipoReporte;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.auditoria.ReporteRepository;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.util.FechaUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Reportes de fraude. El detalle se descarga en CSV separado por ";" (se abre directo en Excel),
 * sin librerías adicionales.
 */
@Service
public class ReporteService {

    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    private final ReporteRepository reporteRepository;
    private final TransaccionRepository transaccionRepository;
    private final AlertaRepository alertaRepository;
    private final SecurityUtils securityUtils;
    private final AuditoriaService auditoriaService;

    public ReporteService(ReporteRepository reporteRepository, TransaccionRepository transaccionRepository,
                          AlertaRepository alertaRepository, SecurityUtils securityUtils,
                          AuditoriaService auditoriaService) {
        this.reporteRepository = reporteRepository;
        this.transaccionRepository = transaccionRepository;
        this.alertaRepository = alertaRepository;
        this.securityUtils = securityUtils;
        this.auditoriaService = auditoriaService;
    }

    @Transactional
    public Reporte generar(TipoReporte tipo, LocalDate desde, LocalDate hasta) {
        Usuario usuario = securityUtils.usuarioActualOpcional().orElse(null);
        return generar(tipo, desde, hasta, usuario);
    }

    @Transactional
    public Reporte generar(TipoReporte tipo, LocalDate desde, LocalDate hasta, Usuario usuario) {
        LocalDate hoy = FechaUtils.hoy();
        LocalDate inicio;
        LocalDate fin = hasta != null ? hasta : hoy;
        switch (tipo) {
            case DIARIO -> inicio = fin;
            case SEMANAL -> inicio = fin.minusDays(6);
            case MENSUAL -> inicio = fin.minusDays(29);
            default -> {
                if (desde == null) {
                    throw new BusinessException("Para un reporte personalizado indica la fecha de inicio");
                }
                inicio = desde;
            }
        }
        if (inicio.isAfter(fin)) {
            throw new BusinessException("La fecha de inicio no puede ser posterior a la fecha de fin");
        }
        LocalDateTime d = FechaUtils.inicioDelDia(inicio);
        LocalDateTime h = FechaUtils.finDelDia(fin);

        Reporte r = new Reporte();
        r.setTipo(tipo);
        r.setNombre("Reporte " + tipo.name().toLowerCase() + " " + inicio + (inicio.equals(fin) ? "" : " a " + fin));
        r.setFechaInicio(inicio);
        r.setFechaFin(fin);
        r.setTotalTransacciones(transaccionRepository.countByFechaHoraBetween(d, h));
        r.setTotalAlertas(alertaRepository.countByFechaCreacionBetween(d, h));
        r.setFraudesConfirmados(alertaRepository.countByEstadoAndFechaDecisionBetween(EstadoAlerta.CONFIRMADA, d, h));
        r.setFalsosPositivos(alertaRepository.countByEstadoAndFechaDecisionBetween(EstadoAlerta.DESCARTADA, d, h));
        r.setMontoTotalFraude(transaccionRepository.sumarMontoPorClasificacion(Clasificacion.FRAUDULENTA, d, h));
        r.setGeneradoPor(usuario);
        reporteRepository.save(r);
        auditoriaService.registrar(usuario, null, TipoAccion.GENERAR_REPORTE, r.getNombre());
        return r;
    }

    @Transactional(readOnly = true)
    public List<Reporte> listar() {
        return reporteRepository.findAllByOrderByFechaGeneracionDesc();
    }

    @Transactional(readOnly = true)
    public Reporte obtener(Long id) {
        return reporteRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Reporte", id));
    }

    /** CSV con el detalle de transacciones del periodo del reporte. */
    @Transactional(readOnly = true)
    public byte[] exportarCsv(Long id) {
        Reporte r = obtener(id);
        List<Transaccion> txs = transaccionRepository.findByFechaHoraBetweenOrderByFechaHoraAsc(
                FechaUtils.inicioDelDia(r.getFechaInicio()), FechaUtils.finDelDia(r.getFechaFin()));

        StringBuilder sb = new StringBuilder("﻿"); // BOM para que Excel lea las tildes
        sb.append(r.getNombre()).append('\n');
        sb.append("Total transacciones;").append(r.getTotalTransacciones()).append('\n');
        sb.append("Total alertas;").append(r.getTotalAlertas()).append('\n');
        sb.append("Fraudes confirmados;").append(r.getFraudesConfirmados()).append('\n');
        sb.append("Falsos positivos;").append(r.getFalsosPositivos()).append('\n');
        sb.append("Monto total en fraude (PEN);").append(r.getMontoTotalFraude()).append("\n\n");
        sb.append("Código;Fecha;Tarjeta;Cliente;Comercio;Categoría;Canal;Ciudad;Monto;Score;Nivel;Clasificación;Estado\n");
        for (Transaccion t : txs) {
            sb.append(t.getCodigo()).append(';')
                    .append(t.getFechaHora().format(FORMATO)).append(';')
                    .append(t.getTarjeta().getNumeroEnmascarado()).append(';')
                    .append(csv(t.getTarjeta().getCliente().getNombreCompleto())).append(';')
                    .append(csv(t.getComercio().getNombre())).append(';')
                    .append(t.getComercio().getCategoria()).append(';')
                    .append(t.getCanal()).append(';')
                    .append(csv(t.getCiudad())).append(';')
                    .append(t.getMonto()).append(';')
                    .append(t.getScoreRiesgo() == null ? "" : t.getScoreRiesgo()).append(';')
                    .append(t.getNivelRiesgo() == null ? "" : t.getNivelRiesgo()).append(';')
                    .append(t.getClasificacion() == null ? "" : t.getClasificacion()).append(';')
                    .append(t.getEstado()).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String csv(String valor) {
        return valor == null ? "" : valor.replace(";", ",").replace("\n", " ");
    }
}
