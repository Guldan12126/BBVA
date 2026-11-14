package pe.bbva.backend.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

public final class FechaUtils {

    public static final ZoneId ZONA = ZoneId.of(Constantes.ZONA_HORARIA);

    private FechaUtils() {
    }

    public static LocalDateTime ahora() {
        return LocalDateTime.now(ZONA);
    }

    public static LocalDate hoy() {
        return LocalDate.now(ZONA);
    }

    public static LocalDateTime inicioDelDia(LocalDate fecha) {
        return fecha.atStartOfDay();
    }

    public static LocalDateTime finDelDia(LocalDate fecha) {
        return fecha.atTime(LocalTime.MAX);
    }
}
