package pe.bbva.backend.service.cliente;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.model.cliente.Cliente;
import pe.bbva.backend.model.cliente.PerfilCliente;
import pe.bbva.backend.model.enums.EstadoTransaccion;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.cliente.ClienteRepository;
import pe.bbva.backend.repository.cliente.PerfilClienteRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.util.GeoUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Mantiene el comportamiento habitual de cada cliente (monto promedio, ciudad, horario). */
@Service
public class PerfilClienteService {

    private final PerfilClienteRepository perfilRepository;
    private final ClienteRepository clienteRepository;
    private final TransaccionRepository transaccionRepository;

    public PerfilClienteService(PerfilClienteRepository perfilRepository, ClienteRepository clienteRepository,
                                TransaccionRepository transaccionRepository) {
        this.perfilRepository = perfilRepository;
        this.clienteRepository = clienteRepository;
        this.transaccionRepository = transaccionRepository;
    }

    @Transactional
    public PerfilCliente obtenerOCrear(Cliente cliente) {
        return perfilRepository.findByClienteId(cliente.getId()).orElseGet(() -> {
            PerfilCliente p = new PerfilCliente();
            p.setCliente(cliente);
            p.setCiudadHabitual(cliente.getCiudad());
            double[] coord = GeoUtils.coordenadas(cliente.getCiudad());
            if (coord != null) {
                p.setLatitudHabitual(coord[0]);
                p.setLongitudHabitual(coord[1]);
            }
            p.setUltimaActualizacion(LocalDateTime.now());
            return perfilRepository.save(p);
        });
    }

    @Transactional(readOnly = true)
    public PerfilCliente porCliente(Long clienteId) {
        return perfilRepository.findByClienteId(clienteId).orElse(null);
    }

    /** Actualiza el promedio de forma incremental con una compra aprobada. */
    @Transactional
    public void actualizarConTransaccion(Transaccion tx) {
        PerfilCliente p = obtenerOCrear(tx.getTarjeta().getCliente());
        long n = p.getTotalTransacciones() == null ? 0 : p.getTotalTransacciones();
        BigDecimal promedio = p.getMontoPromedio() == null ? BigDecimal.ZERO : p.getMontoPromedio();
        BigDecimal nuevoPromedio = promedio.multiply(BigDecimal.valueOf(n)).add(tx.getMonto())
                .divide(BigDecimal.valueOf(n + 1), 2, RoundingMode.HALF_UP);
        p.setMontoPromedio(nuevoPromedio);
        if (p.getMontoMaximo() == null || tx.getMonto().compareTo(p.getMontoMaximo()) > 0) {
            p.setMontoMaximo(tx.getMonto());
        }
        p.setTotalTransacciones(n + 1);
        p.setUltimaActualizacion(LocalDateTime.now());
        perfilRepository.save(p);
    }

    /** Recalcula el perfil desde las últimas 100 compras aprobadas (lo usa el scheduler nocturno). */
    @Transactional
    public void recalcular(Cliente cliente) {
        List<Transaccion> aprobadas = transaccionRepository
                .findTop100ByTarjetaClienteIdOrderByFechaHoraDesc(cliente.getId()).stream()
                .filter(t -> t.getEstado() == EstadoTransaccion.APROBADA)
                .toList();
        if (aprobadas.isEmpty()) {
            return;
        }
        PerfilCliente p = obtenerOCrear(cliente);
        BigDecimal total = aprobadas.stream().map(Transaccion::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
        p.setMontoPromedio(total.divide(BigDecimal.valueOf(aprobadas.size()), 2, RoundingMode.HALF_UP));
        p.setMontoMaximo(aprobadas.stream().map(Transaccion::getMonto).max(Comparator.naturalOrder()).orElse(null));
        p.setTotalTransacciones((long) aprobadas.size());

        // Ciudad más frecuente
        aprobadas.stream()
                .filter(t -> t.getCiudad() != null)
                .collect(Collectors.groupingBy(Transaccion::getCiudad, Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .ifPresent(ciudad -> {
                    p.setCiudadHabitual(ciudad);
                    double[] coord = GeoUtils.coordenadas(ciudad);
                    if (coord != null) {
                        p.setLatitudHabitual(coord[0]);
                        p.setLongitudHabitual(coord[1]);
                    }
                });

        // Horario habitual: entre el percentil 10 y 90 de las horas de compra
        List<Integer> horas = aprobadas.stream().map(t -> t.getFechaHora().getHour()).sorted().toList();
        p.setHoraHabitualInicio(horas.get((int) (horas.size() * 0.1)));
        p.setHoraHabitualFin(horas.get(Math.min(horas.size() - 1, (int) (horas.size() * 0.9))));
        p.setUltimaActualizacion(LocalDateTime.now());
        perfilRepository.save(p);
    }

    @Transactional
    public int recalcularTodos() {
        List<Cliente> clientes = clienteRepository.findAll();
        clientes.forEach(this::recalcular);
        return clientes.size();
    }
}
