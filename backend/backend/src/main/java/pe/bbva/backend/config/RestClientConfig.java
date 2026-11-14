package pe.bbva.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import pe.bbva.backend.config.properties.IaProperties;

import java.time.Duration;

/** Clientes HTTP hacia el microservicio de IA en Python (FastAPI). */
@Configuration
public class RestClientConfig {

    /** Para /predict y /health: tiempo corto, la evaluación debe ser menor a 3 segundos. */
    @Bean
    public RestClient iaRestClient(IaProperties props) {
        return crear(props, Duration.ofMillis(props.timeoutMs()));
    }

    /** Para /train: el reentrenamiento puede tardar varios minutos. */
    @Bean
    public RestClient iaEntrenamientoRestClient(IaProperties props) {
        return crear(props, Duration.ofMinutes(5));
    }

    private RestClient crear(IaProperties props, Duration lectura) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.timeoutMs()));
        factory.setReadTimeout(lectura);
        return RestClient.builder()
                .baseUrl(props.url())
                .requestFactory(factory)
                .defaultHeader("X-API-KEY", props.apiKey())
                .build();
    }
}
