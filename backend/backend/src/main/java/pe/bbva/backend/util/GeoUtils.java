package pe.bbva.backend.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;

/** Cálculo de distancias entre ubicaciones (fórmula de Haversine). */
public final class GeoUtils {

    private static final double RADIO_TIERRA_KM = 6371.0;

    /** Coordenadas aproximadas de ciudades usadas en el simulador. */
    private static final Map<String, double[]> CIUDADES = Map.ofEntries(
            Map.entry("piura", new double[]{-5.1945, -80.6328}),
            Map.entry("sullana", new double[]{-4.9039, -80.6853}),
            Map.entry("talara", new double[]{-4.5772, -81.2719}),
            Map.entry("paita", new double[]{-5.0892, -81.1144}),
            Map.entry("chiclayo", new double[]{-6.7714, -79.8409}),
            Map.entry("trujillo", new double[]{-8.1116, -79.0288}),
            Map.entry("lima", new double[]{-12.0464, -77.0428}),
            Map.entry("arequipa", new double[]{-16.4090, -71.5375}),
            Map.entry("cusco", new double[]{-13.5319, -71.9675}),
            Map.entry("tumbes", new double[]{-3.5669, -80.4515}),
            Map.entry("bogota", new double[]{4.7110, -74.0721}),
            Map.entry("miami", new double[]{25.7617, -80.1918}),
            Map.entry("madrid", new double[]{40.4168, -3.7038}),
            Map.entry("shenzhen", new double[]{22.5431, 114.0579})
    );

    private GeoUtils() {
    }

    public static double distanciaKm(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return 0.0;
        }
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Devuelve {latitud, longitud} de una ciudad conocida o null si no está en la lista. */
    public static double[] coordenadas(String ciudad) {
        if (ciudad == null) {
            return null;
        }
        String clave = Normalizer.normalize(ciudad, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
        return CIUDADES.get(clave);
    }
}
