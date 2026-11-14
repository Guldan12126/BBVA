package pe.bbva.backend.service.reporte;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.ia.ModeloIaClient;
import pe.bbva.backend.model.enums.Clasificacion;
import pe.bbva.backend.model.enums.EstadoAlerta;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.enums.Rol;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.cliente.TarjetaRepository;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.service.fraude.AlertaService;
import pe.bbva.backend.util.FechaUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** KPIs del "Resumen General". El contenido se adapta al rol del usuario logueado. */
@Service
public class DashboardService {

    private static final int DIAS_ACTIVIDAD = 7;

    private final TransaccionRepository transaccionRepository;
    private final AlertaRepository alertaRepository;
    private final TarjetaRepository tarjetaRepository;
    private final ModeloIaClient modeloIaClient;
    private final SecurityUtils securityUtils;

    public DashboardService(TransaccionRepository transaccionRepository, AlertaRepository alertaRepository,
                            TarjetaRepository tarjetaRepository, ModeloIaClient modeloIaClient,
                            SecurityUtils securityUtils) {
        this.transaccionRepository = transaccionRepository;
        this.alertaRepository = alertaRepository;
        this.tarjetaRepository = tarjetaRepository;
        this.modeloIaClient = modeloIaClient;
        this.securityUtils = securityUtils;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> resumen() {
        Usuario usuario = securityUtils.usuarioActual();
        LocalDate hoy = FechaUtils.hoy();
        Map<String, Object> r = new LinkedHashMap<>();

        r.put("rol", usuario.getRol());
        r.put("usuario", usuario.getNombreCompleto());

        // Tarjetas superiores del dashboard
        r.put("transaccionesAnalizadas", transaccionRepository.count());
        r.put("transaccionesHoy", transaccionRepository.countByFechaHoraBetween(
                FechaUtils.inicioDelDia(hoy), FechaUtils.finDelDia(hoy)));
        r.put("alertasPendientes", alertaRepository.countByEstadoIn(AlertaService.ACTIVAS));
        r.put("fraudesConfirmados", alertaRepository.countByEstado(EstadoAlerta.CONFIRMADA));
        r.put("falsosPositivos", alertaRepository.countByEstado(EstadoAlerta.DESCARTADA));
        Double tiempo = transaccionRepository.promedioTiempoEvaluacion();
        r.put("tiempoPromedioMs", tiempo == null ? 0 : Math.round(tiempo));
        r.put("tiempoPromedioSegundos", tiempo == null ? 0 : Math.round(tiempo / 100.0) / 10.0);

        // Gráficos
        Map<String, Long> riesgo = new LinkedHashMap<>();
        for (NivelRiesgo n : NivelRiesgo.values()) {
            riesgo.put(n.name(), transaccionRepository.countByNivelRiesgo(n));
        }
        r.put("operacionesPorNivelRiesgo", riesgo);

        Map<String, Long> clasificacion = new LinkedHashMap<>();
        for (Clasificacion c : Clasificacion.values()) {
            clasificacion.put(c.name(), transaccionRepository.countByClasificacion(c));
        }
        r.put("clasificacionOperaciones", clasificacion);
        r.put("actividadTransaccional", actividadUltimosDias(hoy));

        Map<String, Long> alertasPorNivel = new LinkedHashMap<>();
        for (NivelRiesgo n : NivelRiesgo.values()) {
            alertasPorNivel.put(n.name(), alertaRepository.countByNivelRiesgoAndEstadoIn(n, AlertaService.ACTIVAS));
        }
        r.put("alertasActivasPorNivel", alertasPorNivel);

        r.put("transaccionesRecientes", transaccionRepository.findTop10ByOrderByFechaHoraDesc().stream()
                .map(this::resumirTransaccion).toList());

        // Datos según el rol
        if (usuario.getRol() == Rol.ANALISTA || usuario.getRol() == Rol.OPERADOR) {
            r.put("misAlertasPendientes",
                    alertaRepository.countByAsignadoAIdAndEstadoIn(usuario.getId(), AlertaService.ACTIVAS));
        }
        if (usuario.getRol() == Rol.ADMIN || usuario.getRol() == Rol.SUPERVISOR) {
            r.put("tarjetasBloqueadas", tarjetaRepository.countByEstado(EstadoTarjeta.BLOQUEADA)
                    + tarjetaRepository.countByEstado(EstadoTarjeta.BLOQUEADA_TEMPORAL));
            r.put("servicioIaDisponible", modeloIaClient.isDisponible());
        }
        return r;
    }

    private List<Map<String, Object>> actividadUltimosDias(LocalDate hoy) {
        List<Map<String, Object>> lista = new ArrayList<>();
        for (int i = DIAS_ACTIVIDAD - 1; i >= 0; i--) {
            LocalDate dia = hoy.minusDays(i);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("fecha", dia.toString());
            m.put("total", transaccionRepository.countByFechaHoraBetween(
                    FechaUtils.inicioDelDia(dia), FechaUtils.finDelDia(dia)));
            m.put("sospechosas", transaccionRepository.countByClasificacionAndFechaHoraBetween(
                    Clasificacion.SOSPECHOSA, FechaUtils.inicioDelDia(dia), FechaUtils.finDelDia(dia)));
            m.put("fraudulentas", transaccionRepository.countByClasificacionAndFechaHoraBetween(
                    Clasificacion.FRAUDULENTA, FechaUtils.inicioDelDia(dia), FechaUtils.finDelDia(dia)));
            lista.add(m);
        }
        return lista;
    }

    private Map<String, Object> resumirTransaccion(Transaccion t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("codigo", t.getCodigo());
        m.put("tarjeta", t.getTarjeta().getNumeroEnmascarado());
        m.put("comercio", t.getComercio().getNombre());
        m.put("monto", t.getMonto());
        m.put("nivelRiesgo", t.getNivelRiesgo());
        m.put("scoreRiesgo", t.getScoreRiesgo());
        m.put("estado", t.getEstado());
        m.put("fecha", t.getFechaHora());
        return m;
    }
}
