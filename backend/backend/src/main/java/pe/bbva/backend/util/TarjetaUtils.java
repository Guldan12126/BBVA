package pe.bbva.backend.util;

/** Utilidades para tarjetas. El número completo nunca se guarda en la base de datos. */
public final class TarjetaUtils {

    private TarjetaUtils() {
    }

    public static String soloDigitos(String numero) {
        return numero == null ? "" : numero.replaceAll("\\D", "");
    }

    /** 4557880012344821 -> **** **** **** 4821 */
    public static String enmascarar(String numero) {
        String digitos = soloDigitos(numero);
        if (digitos.length() < 4) {
            return "****";
        }
        return "**** **** **** " + digitos.substring(digitos.length() - 4);
    }

    public static String ultimosDigitos(String numero) {
        String digitos = soloDigitos(numero);
        return digitos.length() < 4 ? digitos : digitos.substring(digitos.length() - 4);
    }

    /** Algoritmo de Luhn: valida que el número de tarjeta tenga un formato real. */
    public static boolean esNumeroValido(String numero) {
        String digitos = soloDigitos(numero);
        if (digitos.length() < 13 || digitos.length() > 19) {
            return false;
        }
        int suma = 0;
        boolean duplicar = false;
        for (int i = digitos.length() - 1; i >= 0; i--) {
            int d = digitos.charAt(i) - '0';
            if (duplicar) {
                d *= 2;
                if (d > 9) {
                    d -= 9;
                }
            }
            suma += d;
            duplicar = !duplicar;
        }
        return suma % 10 == 0;
    }
}
