package pe.bbva.backend.util;

import org.junit.jupiter.api.Test;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.validation.PasswordSeguraValidator;

import static org.assertj.core.api.Assertions.assertThat;

class UtilsTest {

    @Test
    void enmascaraLaTarjeta() {
        assertThat(TarjetaUtils.enmascarar("4557 8800 1234 4821")).isEqualTo("**** **** **** 4821");
        assertThat(TarjetaUtils.ultimosDigitos("4557880012344821")).isEqualTo("4821");
    }

    @Test
    void validaNumeroConLuhn() {
        assertThat(TarjetaUtils.esNumeroValido("4111111111111111")).isTrue();
        assertThat(TarjetaUtils.esNumeroValido("4111111111111112")).isFalse();
    }

    @Test
    void calculaDistanciaPiuraLima() {
        double[] piura = GeoUtils.coordenadas("Piura");
        double[] lima = GeoUtils.coordenadas("LIMA");
        double km = GeoUtils.distanciaKm(piura[0], piura[1], lima[0], lima[1]);
        assertThat(km).isBetween(800.0, 900.0);
    }

    @Test
    void convierteScoreEnNivelDeRiesgo() {
        assertThat(NivelRiesgo.desdeScore(0.10, 0.70, 0.90)).isEqualTo(NivelRiesgo.BAJO);
        assertThat(NivelRiesgo.desdeScore(0.50, 0.70, 0.90)).isEqualTo(NivelRiesgo.MEDIO);
        assertThat(NivelRiesgo.desdeScore(0.75, 0.70, 0.90)).isEqualTo(NivelRiesgo.ALTO);
        assertThat(NivelRiesgo.desdeScore(0.95, 0.70, 0.90)).isEqualTo(NivelRiesgo.CRITICO);
    }

    @Test
    void validaPasswordSegura() {
        assertThat(PasswordSeguraValidator.esSegura("Bbva2026")).isTrue();
        assertThat(PasswordSeguraValidator.esSegura("bbva2026")).isFalse();
        assertThat(PasswordSeguraValidator.esSegura("Corta1")).isFalse();
    }

    @Test
    void generaCodigoDeSeisDigitos() {
        assertThat(CodigoGenerator.codigoNumerico(6)).matches("\\d{6}");
        assertThat(CodigoGenerator.transaccion()).startsWith("TX-").hasSize(11);
    }
}
