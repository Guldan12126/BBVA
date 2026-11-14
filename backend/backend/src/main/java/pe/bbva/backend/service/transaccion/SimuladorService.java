package pe.bbva.backend.service.transaccion;

import org.springframework.stereotype.Service;
import pe.bbva.backend.exception.BusinessException;
import pe.bbva.backend.model.cliente.Comercio;
import pe.bbva.backend.model.cliente.PerfilCliente;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.Canal;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.EstadoTransaccion;
import pe.bbva.backend.repository.cliente.ComercioRepository;
import pe.bbva.backend.repository.cliente.TarjetaRepository;
import pe.bbva.backend.service.cliente.PerfilClienteService;
import pe.bbva.backend.util.FechaUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Simulador POS / App: genera compras normales y fraudulentas para la demo.
 * Una compra normal se parece al perfil del cliente; una fraudulenta tiene monto alto,
 * ubicación lejana, horario de madrugada o comercio de alto riesgo.
 */
@Service
public class SimuladorService {

    private final TransaccionService transaccionService;
    private final TarjetaRepository tarjetaRepository;
    private final ComercioRepository comercioRepository;
    private final PerfilClienteService perfilClienteService;

    public SimuladorService(TransaccionService transaccionService, TarjetaRepository tarjetaRepository,
                            ComercioRepository comercioRepository, PerfilClienteService perfilClienteService) {
        this.transaccionService = transaccionService;
        this.tarjetaRepository = tarjetaRepository;
        this.comercioRepository = comercioRepository;
        this.perfilClienteService = perfilClienteService;
    }

    public TransaccionService.Resultado generar(boolean fraudulenta) {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        List<Tarjeta> tarjetas = tarjetaRepository.findByEstado(EstadoTarjeta.ACTIVA);
        if (tarjetas.isEmpty()) {
            throw new BusinessException("No hay tarjetas activas para simular transacciones");
        }
        Tarjeta tarjeta = tarjetas.get(r.nextInt(tarjetas.size()));
        PerfilCliente perfil = perfilClienteService.obtenerOCrear(tarjeta.getCliente());
        double promedio = perfil.getMontoPromedio() == null || perfil.getMontoPromedio().signum() == 0
                ? 150 : perfil.getMontoPromedio().doubleValue();

        List<Comercio> comercios = comercioRepository.findAll();
        List<Comercio> candidatos = comercios.stream()
                .filter(c -> fraudulenta == (c.getCategoria().esAltoRiesgo() || Boolean.TRUE.equals(c.getInternacional())))
                .toList();
        if (candidatos.isEmpty()) {
            candidatos = comercios;
        }
        if (candidatos.isEmpty()) {
            throw new BusinessException("No hay comercios registrados para simular transacciones");
        }
        Comercio comercio = candidatos.get(r.nextInt(candidatos.size()));

        double monto;
        Canal canal;
        LocalDateTime fecha = FechaUtils.ahora();
        String ip;
        if (fraudulenta) {
            monto = promedio * (4 + r.nextDouble() * 5);
            canal = r.nextBoolean() ? Canal.ECOMMERCE : Canal.APP_MOVIL;
            LocalDateTime madrugada = fecha.withHour(r.nextInt(1, 5)).withMinute(r.nextInt(60));
            fecha = madrugada.isAfter(fecha) ? madrugada.minusDays(1) : madrugada;
            ip = "185.220." + r.nextInt(256) + "." + r.nextInt(256);
        } else {
            monto = promedio * (0.5 + r.nextDouble());
            canal = r.nextInt(10) < 7 ? Canal.POS : Canal.APP_MOVIL;
            ip = "190.42." + r.nextInt(256) + "." + r.nextInt(256);
        }
        BigDecimal montoFinal = BigDecimal.valueOf(Math.max(monto, 5)).setScale(2, RoundingMode.HALF_UP);
        return transaccionService.registrar(tarjeta.getId(), comercio.getId(), montoFinal, canal, null, null, null,
                ip, fraudulenta ? "Dispositivo desconocido" : "POS-" + r.nextInt(1000, 9999), fecha);
    }

    public Map<String, Object> generarLote(int cantidad, int porcentajeFraude) {
        if (cantidad < 1 || cantidad > 500) {
            throw new BusinessException("La cantidad debe estar entre 1 y 500");
        }
        int aprobadas = 0;
        int enRevision = 0;
        int bloqueadas = 0;
        int rechazadas = 0;
        int alertas = 0;
        ThreadLocalRandom r = ThreadLocalRandom.current();
        for (int i = 0; i < cantidad; i++) {
            TransaccionService.Resultado res = generar(r.nextInt(100) < porcentajeFraude);
            EstadoTransaccion estado = res.transaccion().getEstado();
            switch (estado) {
                case APROBADA -> aprobadas++;
                case EN_REVISION -> enRevision++;
                case BLOQUEADA -> bloqueadas++;
                default -> rechazadas++;
            }
            if (res.alerta() != null) {
                alertas++;
            }
        }
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("total", cantidad);
        resumen.put("aprobadas", aprobadas);
        resumen.put("enRevision", enRevision);
        resumen.put("bloqueadas", bloqueadas);
        resumen.put("rechazadas", rechazadas);
        resumen.put("alertasGeneradas", alertas);
        return resumen;
    }
}
