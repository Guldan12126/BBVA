package pe.bbva.backend.service.reporte;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.model.enums.EstadoAlerta;
import pe.bbva.backend.model.enums.EstadoCaso;
import pe.bbva.backend.model.enums.EstadoNotificacion;
import pe.bbva.backend.model.enums.EstadoUsuario;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.enums.Rol;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.notificacion.AtencionCliente;
import pe.bbva.backend.model.notificacion.Notificacion;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.fraude.CasoRepository;
import pe.bbva.backend.repository.fraude.ListaNegraRepository;
import pe.bbva.backend.repository.fraude.ReglaFraudeRepository;
import pe.bbva.backend.repository.notificacion.AtencionClienteRepository;
import pe.bbva.backend.repository.notificacion.NotificacionRepository;
import pe.bbva.backend.repository.seguridad.RegistroAccesoRepository;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.service.fraude.AlertaService;
import pe.bbva.backend.service.ml.ModeloIaService;
import pe.bbva.backend.util.FechaUtils;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.Set;

/**
 * Datos de los dashboards específicos de cada rol (dashboard-analista, -operador, -supervisor, -admin).
 * Complementa a DashboardService.resumen(), que tiene los indicadores generales.
 */
@Service
public class DashboardRolService {

    private static final int DIAS_TENDENCIA = 7;
    private static final Set<EstadoNotificacion> POR_LLAMAR = Set.of(EstadoNotificacion.NO_RECONOCIDA, EstadoNotificacion.EXPIRADA);

    private final AlertaRepository alertaRepository;
    private final AtencionClienteRepository atencionRepository;
    private final NotificacionRepository notificacionRepository;
    private final CasoRepository casoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ReglaFraudeRepository reglaRepository;
    private final ListaNegraRepository listaNegraRepository;
    private final RegistroAccesoRepository accesoRepository;
    private final ModeloIaService modeloIaService;
    private final SecurityUtils securityUtils;

    public DashboardRolService(AlertaRepository alertaRepository, AtencionClienteRepository atencionRepository,
                               NotificacionRepository notificacionRepository, CasoRepository casoRepository,
                               UsuarioRepository usuarioRepository, ReglaFraudeRepository reglaRepository,
                               ListaNegraRepository listaNegraRepository, RegistroAccesoRepository accesoRepository,
                               ModeloIaService modeloIaService, SecurityUtils securityUtils) {
        this.alertaRepository = alertaRepository;
        this.atencionRepository = atencionRepository;
        this.notificacionRepository = notificacionRepository;
        this.casoRepository = casoRepository;
        this.usuarioRepository = usuarioRepository;
        this.reglaRepository = reglaRepository;
        this.listaNegraRepository = listaNegraRepository;
        this.accesoRepository = accesoRepository;
        this.modeloIaService = modeloIaService;
        this.securityUtils = securityUtils;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> datos() {
        Usuario yo = securityUtils.usuarioActual();
        return switch (yo.getRol()) {
            case ANALISTA -> analista(yo);
            case OPERADOR -> operador(yo);
            case SUPERVISOR -> supervisor();
            case ADMIN -> admin();
        };
    }

    // ---------------------------------------------------------------- Analista

    private Map<String, Object> analista(Usuario yo) {
        LocalDate hoy = FechaUtils.hoy();
        LocalDateTime ini = FechaUtils.inicioDelDia(hoy);
        LocalDateTime fin = FechaUtils.finDelDia(hoy);
        Map<String, Object> r = new LinkedHashMap<>();

        r.put("misPendientes", alertaRepository.countByAsignadoAIdAndEstadoIn(yo.getId(), AlertaService.ACTIVAS));
        r.put("misCriticas", alertaRepository.countByAsignadoAIdAndNivelRiesgoAndEstadoIn(yo.getId(), NivelRiesgo.CRITICO, AlertaService.ACTIVAS));
        r.put("sinAsignar", alertaRepository.countByAsignadoAIsNullAndEstadoIn(AlertaService.ACTIVAS));
        r.put("resueltasHoy", alertaRepository.countByDecididoPorIdAndFechaDecisionBetween(yo.getId(), ini, fin));
        r.put("confirmadasHoy", alertaRepository.countByDecididoPorIdAndEstadoAndFechaDecisionBetween(yo.getId(), EstadoAlerta.CONFIRMADA, ini, fin));
        r.put("descartadasHoy", alertaRepository.countByDecididoPorIdAndEstadoAndFechaDecisionBetween(yo.getId(), EstadoAlerta.DESCARTADA, ini, fin));

        // Tiempo promedio de resolución (creación -> decisión) en los últimos 30 días
        List<Alerta> decididas30 = alertaRepository.findByFechaDecisionBetween(ini.minusDays(30), fin).stream()
                .filter(a -> a.getDecididoPor() != null && yo.getId().equals(a.getDecididoPor().getId())).toList();
        r.put("tiempoPromedioMin", minutosPromedio(decididas30));
        r.put("precision30d", precision(decididas30));

        r.put("miCola", alertaRepository.findTop8ByAsignadoAIdAndEstadoInOrderByProbabilidadDesc(yo.getId(), AlertaService.ACTIVAS)
                .stream().map(this::resumirAlerta).toList());

        List<Map<String, Object>> tendencia = new ArrayList<>();
        for (int i = DIAS_TENDENCIA - 1; i >= 0; i--) {
            LocalDate d = hoy.minusDays(i);
            LocalDateTime a = FechaUtils.inicioDelDia(d), b = FechaUtils.finDelDia(d);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("fecha", d.toString());
            m.put("confirmadas", alertaRepository.countByDecididoPorIdAndEstadoAndFechaDecisionBetween(yo.getId(), EstadoAlerta.CONFIRMADA, a, b));
            m.put("descartadas", alertaRepository.countByDecididoPorIdAndEstadoAndFechaDecisionBetween(yo.getId(), EstadoAlerta.DESCARTADA, a, b));
            tendencia.add(m);
        }
        r.put("productividad", tendencia);
        return r;
    }

    // ---------------------------------------------------------------- Operador

    private Map<String, Object> operador(Usuario yo) {
        LocalDate hoy = FechaUtils.hoy();
        LocalDateTime ini = FechaUtils.inicioDelDia(hoy);
        LocalDateTime fin = FechaUtils.finDelDia(hoy);
        Map<String, Object> r = new LinkedHashMap<>();

        r.put("porLlamar", notificacionRepository.countByEstadoIn(POR_LLAMAR));
        r.put("noReconocidas", notificacionRepository.countByEstado(EstadoNotificacion.NO_RECONOCIDA));
        r.put("sinRespuesta", notificacionRepository.countByEstado(EstadoNotificacion.ENVIADA));
        r.put("misAlertasActivas", alertaRepository.countByAsignadoAIdAndEstadoIn(yo.getId(), AlertaService.ACTIVAS));

        List<AtencionCliente> hoyMias = atencionRepository.findByOperadorIdAndFechaBetweenOrderByFechaDesc(yo.getId(), ini, fin);
        r.put("llamadasHoy", hoyMias.size());
        Map<String, Long> resultados = new LinkedHashMap<>();
        for (var res : pe.bbva.backend.model.enums.ResultadoAtencion.values()) {
            resultados.put(res.name(), hoyMias.stream().filter(a -> a.getResultado() == res).count());
        }
        r.put("resultadosHoy", resultados);
        r.put("tarjetasBloqueadasHoy", hoyMias.stream().filter(a -> Boolean.TRUE.equals(a.getTarjetaBloqueada())).count());

        r.put("clientesPorLlamar", notificacionRepository.findTop8ByEstadoInOrderByFechaEnvioDesc(POR_LLAMAR)
                .stream().map(this::resumirNotificacion).toList());
        r.put("ultimasLlamadas", atencionRepository.findByOperadorIdOrderByFechaDesc(yo.getId()).stream().limit(6)
                .map(this::resumirAtencion).toList());

        List<Map<String, Object>> tendencia = new ArrayList<>();
        for (int i = DIAS_TENDENCIA - 1; i >= 0; i--) {
            LocalDate d = hoy.minusDays(i);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("fecha", d.toString());
            m.put("llamadas", atencionRepository.countByOperadorIdAndFechaBetween(yo.getId(), FechaUtils.inicioDelDia(d), FechaUtils.finDelDia(d)));
            tendencia.add(m);
        }
        r.put("llamadasSemana", tendencia);
        return r;
    }

    // ---------------------------------------------------------------- Supervisor

    private Map<String, Object> supervisor() {
        LocalDate hoy = FechaUtils.hoy();
        LocalDateTime fin = FechaUtils.finDelDia(hoy);
        LocalDateTime ini7 = FechaUtils.inicioDelDia(hoy.minusDays(DIAS_TENDENCIA - 1));
        Map<String, Object> r = new LinkedHashMap<>();

        r.put("escaladas", alertaRepository.countByEstado(EstadoAlerta.ESCALADA));
        r.put("alertasActivas", alertaRepository.countByEstadoIn(AlertaService.ACTIVAS));
        r.put("sinAsignar", alertaRepository.countByAsignadoAIsNullAndEstadoIn(AlertaService.ACTIVAS));
        r.put("criticasActivas", alertaRepository.countByNivelRiesgoAndEstadoIn(NivelRiesgo.CRITICO, AlertaService.ACTIVAS));
        r.put("casosAbiertos", casoRepository.countByEstadoIn(Set.of(EstadoCaso.ABIERTO, EstadoCaso.EN_INVESTIGACION)));

        List<Alerta> decididas30 = alertaRepository.findByFechaDecisionBetween(FechaUtils.inicioDelDia(hoy.minusDays(29)), fin);
        r.put("tasaFraude30d", precision(decididas30));
        r.put("tiempoRespuestaMin", minutosPromedio(decididas30));
        r.put("decididas30d", decididas30.size());

        r.put("alertasEscaladas", alertaRepository.findTop8ByEstadoOrderByProbabilidadDesc(EstadoAlerta.ESCALADA)
                .stream().map(this::resumirAlerta).toList());

        // Decisiones por día (últimos 7 días)
        List<Alerta> decididas7 = decididas30.stream().filter(a -> !a.getFechaDecision().isBefore(ini7)).toList();
        List<Map<String, Object>> tendencia = new ArrayList<>();
        for (int i = DIAS_TENDENCIA - 1; i >= 0; i--) {
            LocalDate d = hoy.minusDays(i);
            List<Alerta> delDia = decididas7.stream().filter(a -> a.getFechaDecision().toLocalDate().equals(d)).toList();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("fecha", d.toString());
            m.put("confirmadas", delDia.stream().filter(a -> a.getEstado() == EstadoAlerta.CONFIRMADA).count());
            m.put("descartadas", delDia.stream().filter(a -> a.getEstado() == EstadoAlerta.DESCARTADA).count());
            tendencia.add(m);
        }
        r.put("decisionesSemana", tendencia);

        // Rendimiento del equipo de analistas (últimos 7 días)
        List<Map<String, Object>> equipo = new ArrayList<>();
        for (Usuario u : usuarioRepository.findByRolAndEstado(Rol.ANALISTA, EstadoUsuario.ACTIVO)) {
            List<Alerta> suyas = decididas7.stream()
                    .filter(a -> a.getDecididoPor() != null && u.getId().equals(a.getDecididoPor().getId())).toList();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("nombre", u.getNombreCompleto());
            m.put("activas", alertaRepository.countByAsignadoAIdAndEstadoIn(u.getId(), AlertaService.ACTIVAS));
            m.put("resueltas", suyas.size());
            m.put("confirmadas", suyas.stream().filter(a -> a.getEstado() == EstadoAlerta.CONFIRMADA).count());
            m.put("tiempoPromedioMin", minutosPromedio(suyas));
            equipo.add(m);
        }
        equipo.sort(Comparator.comparing(m -> -((Number) m.get("resueltas")).intValue()));
        r.put("equipo", equipo);
        return r;
    }

    // ---------------------------------------------------------------- Administrador

    private Map<String, Object> admin() {
        Map<String, Object> r = new LinkedHashMap<>();

        Map<String, Long> porRol = new LinkedHashMap<>();
        for (Rol rol : Rol.values()) {
            porRol.put(rol.name(), usuarioRepository.findByRolAndEstado(rol, EstadoUsuario.ACTIVO).stream().count());
        }
        r.put("usuariosPorRol", porRol);
        r.put("usuariosActivos", usuarioRepository.countByEstado(EstadoUsuario.ACTIVO));
        r.put("usuariosInactivos", usuarioRepository.count() - usuarioRepository.countByEstado(EstadoUsuario.ACTIVO));

        r.put("reglasActivas", reglaRepository.countByActivaTrue());
        r.put("reglasTotal", reglaRepository.count());
        r.put("listaNegraActivos", listaNegraRepository.countByActivoTrue());
        r.put("accesosFallidos24h", accesoRepository.countByExitosoFalseAndFechaAfter(FechaUtils.ahora().minusHours(24)));
        r.put("ultimosAccesos", accesoRepository.findTop6ByOrderByFechaDesc().stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("correo", a.getCorreo());
            m.put("exitoso", a.getExitoso());
            m.put("ip", a.getIp());
            m.put("detalle", a.getDetalle());
            m.put("fecha", a.getFecha());
            return m;
        }).toList());
        r.put("modelo", modeloIaService.estado());
        return r;
    }

    // ---------------------------------------------------------------- Utilidades

    /** Minutos promedio entre que se creó la alerta y se decidió (null si no hay datos). */
    private static Long minutosPromedio(List<Alerta> alertas) {
        OptionalDouble prom = alertas.stream()
                .filter(a -> a.getFechaCreacion() != null && a.getFechaDecision() != null)
                .mapToLong(a -> Duration.between(a.getFechaCreacion(), a.getFechaDecision()).toMinutes())
                .average();
        return prom.isPresent() ? Math.round(prom.getAsDouble()) : null;
    }

    /** % de alertas decididas que resultaron fraude real (null si no hay decisiones). */
    private static Double precision(List<Alerta> alertas) {
        long conf = alertas.stream().filter(a -> a.getEstado() == EstadoAlerta.CONFIRMADA).count();
        long desc = alertas.stream().filter(a -> a.getEstado() == EstadoAlerta.DESCARTADA).count();
        return conf + desc == 0 ? null : Math.round(conf * 1000.0 / (conf + desc)) / 10.0;
    }

    private Map<String, Object> resumirAlerta(Alerta a) {
        Transaccion tx = a.getTransaccion();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("codigo", a.getCodigo());
        m.put("probabilidad", a.getProbabilidad());
        m.put("nivelRiesgo", a.getNivelRiesgo());
        m.put("estado", a.getEstado());
        m.put("prioridad", a.getPrioridad());
        m.put("fecha", a.getFechaCreacion());
        m.put("monto", tx.getMonto());
        m.put("comercio", tx.getComercio() != null ? tx.getComercio().getNombre() : null);
        m.put("cliente", tx.getTarjeta() != null && tx.getTarjeta().getCliente() != null
                ? tx.getTarjeta().getCliente().getNombres() + " " + tx.getTarjeta().getCliente().getApellidos() : null);
        m.put("asignadoA", a.getAsignadoA() != null ? a.getAsignadoA().getNombreCompleto() : null);
        return m;
    }

    private Map<String, Object> resumirNotificacion(Notificacion n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getId());
        m.put("estado", n.getEstado());
        m.put("fecha", n.getFechaEnvio());
        m.put("alertaId", n.getAlerta() != null ? n.getAlerta().getId() : null);
        m.put("alertaCodigo", n.getAlerta() != null ? n.getAlerta().getCodigo() : null);
        m.put("monto", n.getAlerta() != null ? n.getAlerta().getTransaccion().getMonto() : null);
        m.put("cliente", n.getCliente() != null ? n.getCliente().getNombres() + " " + n.getCliente().getApellidos() : null);
        m.put("telefono", n.getCliente() != null ? n.getCliente().getTelefono() : null);
        return m;
    }

    private Map<String, Object> resumirAtencion(AtencionCliente a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("resultado", a.getResultado());
        m.put("fecha", a.getFecha());
        m.put("tarjetaBloqueada", a.getTarjetaBloqueada());
        m.put("alertaId", a.getAlerta() != null ? a.getAlerta().getId() : null);
        m.put("alertaCodigo", a.getAlerta() != null ? a.getAlerta().getCodigo() : null);
        var cli = a.getAlerta() != null ? a.getAlerta().getTransaccion().getTarjeta().getCliente() : null;
        m.put("cliente", cli != null ? cli.getNombres() + " " + cli.getApellidos() : null);
        return m;
    }
}
