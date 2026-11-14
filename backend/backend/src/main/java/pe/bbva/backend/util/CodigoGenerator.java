package pe.bbva.backend.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/** Genera códigos legibles (TX-..., ALT-..., CASO-...) y tokens seguros. */
public final class CodigoGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("yyMMdd");

    private CodigoGenerator() {
    }

    private static String aleatorio(int largo) {
        return UUID.randomUUID().toString().replace("-", "").substring(0, largo).toUpperCase();
    }

    /** TX-8F3A21C9 */
    public static String transaccion() {
        return "TX-" + aleatorio(8);
    }

    /** ALT-261110-4F2A1 */
    public static String alerta() {
        return "ALT-" + FechaUtils.ahora().format(FECHA) + "-" + aleatorio(5);
    }

    /** CASO-3B9D12 */
    public static String caso() {
        return "CASO-" + aleatorio(6);
    }

    /** Código numérico para recuperar contraseña, por ejemplo 482913. */
    public static String codigoNumerico(int digitos) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < digitos; i++) {
            sb.append(RANDOM.nextInt(10));
        }
        return sb.toString();
    }

    /** Token aleatorio seguro para enlaces (URL safe). */
    public static String tokenSeguro() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Hash SHA-256 en hexadecimal (para guardar tokens sin dejarlos en texto plano). */
    public static String sha256(String valor) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
