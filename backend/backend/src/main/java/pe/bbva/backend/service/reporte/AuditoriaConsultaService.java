package pe.bbva.backend.service.reporte;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.model.auditoria.HistorialDecision;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.seguridad.RegistroAcceso;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.auditoria.HistorialDecisionRepository;
import pe.bbva.backend.repository.seguridad.RegistroAccesoRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/** Búsqueda con filtros y resúmenes para la pantalla de Auditoría. */
@Service
public class AuditoriaConsultaService {

    private final HistorialDecisionRepository historialRepository;
    private final RegistroAccesoRepository accesoRepository;

    public AuditoriaConsultaService(HistorialDecisionRepository historialRepository,
                                    RegistroAccesoRepository accesoRepository) {
        this.historialRepository = historialRepository;
        this.accesoRepository = accesoRepository;
    }

    /** q busca en el detalle, el nombre del usuario y el código de la alerta. */
    @Transactional(readOnly = true)
    public Page<HistorialDecision> buscar(List<TipoAccion> acciones, Long usuarioId, LocalDate desde, LocalDate hasta,
                                          String q, Pageable pageable) {
        Specification<HistorialDecision> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (acciones != null && !acciones.isEmpty()) {
                p.add(root.get("accion").in(acciones));
            }
            if (usuarioId != null) {
                p.add(cb.equal(root.get("usuario").get("id"), usuarioId));
            }
            if (desde != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("fecha"), desde.atStartOfDay()));
            }
            if (hasta != null) {
                p.add(cb.lessThan(root.get("fecha"), hasta.plusDays(1).atStartOfDay()));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                var usuario = root.join("usuario", JoinType.LEFT);
                var alerta = root.join("alerta", JoinType.LEFT);
                p.add(cb.or(
                        cb.like(cb.lower(root.get("detalle")), like),
                        cb.like(cb.lower(usuario.get("nombres")), like),
                        cb.like(cb.lower(usuario.get("apellidos")), like),
                        cb.like(cb.lower(alerta.get("codigo")), like),
                        cb.like(cb.lower(root.get("ip")), like)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return historialRepository.findAll(spec, ordenFecha(pageable));
    }

    /**
     * Resumen de los últimos días: acciones por día y por tipo, usuarios más activos
     * y la lista de usuarios que aparecen (para el filtro).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> resumen(int dias, Long usuarioId) {
        LocalDate hoy = LocalDate.now();
        LocalDate inicio = hoy.minusDays(dias - 1L);
        List<HistorialDecision> lista = historialRepository.findByFechaGreaterThanEqual(inicio.atStartOfDay());
        if (usuarioId != null) {
            lista = lista.stream().filter(h -> h.getUsuario() != null && usuarioId.equals(h.getUsuario().getId())).toList();
        }

        Map<LocalDate, Map<TipoAccion, Long>> porDia = new TreeMap<>();
        for (LocalDate d = inicio; !d.isAfter(hoy); d = d.plusDays(1)) {
            porDia.put(d, new EnumMap<>(TipoAccion.class));
        }
        Map<TipoAccion, Long> porAccion = new EnumMap<>(TipoAccion.class);
        Map<Long, Long> porUsuario = new HashMap<>();
        Map<Long, Usuario> usuarios = new HashMap<>();
        long hoyTotal = 0;
        long sistema = 0;

        for (HistorialDecision h : lista) {
            LocalDate d = h.getFecha().toLocalDate();
            porDia.computeIfAbsent(d, k -> new EnumMap<>(TipoAccion.class)).merge(h.getAccion(), 1L, Long::sum);
            porAccion.merge(h.getAccion(), 1L, Long::sum);
            if (d.equals(hoy)) {
                hoyTotal++;
            }
            if (h.getUsuario() != null) {
                porUsuario.merge(h.getUsuario().getId(), 1L, Long::sum);
                usuarios.putIfAbsent(h.getUsuario().getId(), h.getUsuario());
            } else {
                sistema++;
            }
        }

        List<Map<String, Object>> listaDias = new ArrayList<>();
        porDia.forEach((d, acc) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("fecha", d.toString());
            m.put("total", acc.values().stream().mapToLong(Long::longValue).sum());
            m.put("acciones", acc);
            listaDias.add(m);
        });

        List<Map<String, Object>> top = porUsuario.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .map(e -> usuarioMapa(usuarios.get(e.getKey()), e.getValue()))
                .toList();

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("dias", dias);
        r.put("total", lista.size());
        r.put("hoy", hoyTotal);
        r.put("porSistema", sistema);
        r.put("usuariosActivos", usuarios.size());
        r.put("porDia", listaDias);
        r.put("porAccion", porAccion);
        r.put("topUsuarios", top.stream().limit(5).toList());
        r.put("usuarios", top);
        return r;
    }

    private static Map<String, Object> usuarioMapa(Usuario u, long total) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("nombre", u.getNombreCompleto());
        m.put("rol", u.getRol());
        m.put("total", total);
        return m;
    }

    // ---------------- Inicios de sesión ----------------

    @Transactional(readOnly = true)
    public Page<RegistroAcceso> accesos(String correo, Boolean exitoso, String ip, Pageable pageable) {
        Specification<RegistroAcceso> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (correo != null && !correo.isBlank()) {
                p.add(cb.like(cb.lower(root.get("correo")), "%" + correo.trim().toLowerCase() + "%"));
            }
            if (exitoso != null) {
                p.add(cb.equal(root.get("exitoso"), exitoso));
            }
            if (ip != null && !ip.isBlank()) {
                p.add(cb.equal(root.get("ip"), ip.trim()));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return accesoRepository.findAll(spec, ordenFecha(pageable));
    }

    /** Últimas 24 h y 14 días de inicios de sesión: exitosos, fallidos, IPs y correos con más fallos. */
    @Transactional(readOnly = true)
    public Map<String, Object> resumenAccesos() {
        LocalDate hoy = LocalDate.now();
        LocalDate inicio = hoy.minusDays(13);
        LocalDateTime hace24h = LocalDateTime.now().minusHours(24);
        List<RegistroAcceso> lista = accesoRepository.findByFechaGreaterThanEqual(inicio.atStartOfDay());

        Map<LocalDate, long[]> porDia = new TreeMap<>();
        for (LocalDate d = inicio; !d.isAfter(hoy); d = d.plusDays(1)) {
            porDia.put(d, new long[2]);
        }
        long exitosos24 = 0;
        long fallidos24 = 0;
        Set<String> ips24 = new HashSet<>();
        Map<String, Long> fallosPorCorreo = new HashMap<>();
        Map<String, LocalDateTime> ultimoFallo = new HashMap<>();

        for (RegistroAcceso a : lista) {
            boolean ok = Boolean.TRUE.equals(a.getExitoso());
            long[] dia = porDia.computeIfAbsent(a.getFecha().toLocalDate(), k -> new long[2]);
            dia[ok ? 0 : 1]++;
            if (a.getFecha().isAfter(hace24h)) {
                if (ok) {
                    exitosos24++;
                } else {
                    fallidos24++;
                }
                if (a.getIp() != null) {
                    ips24.add(a.getIp());
                }
            }
            if (!ok && a.getCorreo() != null) {
                String c = a.getCorreo().toLowerCase();
                fallosPorCorreo.merge(c, 1L, Long::sum);
                ultimoFallo.merge(c, a.getFecha(), (x, y) -> x.isAfter(y) ? x : y);
            }
        }

        List<Map<String, Object>> dias = new ArrayList<>();
        porDia.forEach((d, v) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("fecha", d.toString());
            m.put("exitosos", v[0]);
            m.put("fallidos", v[1]);
            dias.add(m);
        });
        List<Map<String, Object>> sospechosos = fallosPorCorreo.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("correo", e.getKey());
                    m.put("fallidos", e.getValue());
                    m.put("ultimo", ultimoFallo.get(e.getKey()));
                    return m;
                })
                .toList();

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("exitosos24h", exitosos24);
        r.put("fallidos24h", fallidos24);
        r.put("ips24h", ips24.size());
        r.put("tasaExito24h", exitosos24 + fallidos24 == 0 ? null : exitosos24 * 100.0 / (exitosos24 + fallidos24));
        r.put("porDia", dias);
        r.put("correosConFallos", sospechosos);
        return r;
    }

    private static Pageable ordenFecha(Pageable p) {
        return PageRequest.of(p.getPageNumber(), p.getPageSize(), Sort.by(Sort.Direction.DESC, "fecha"));
    }
}
