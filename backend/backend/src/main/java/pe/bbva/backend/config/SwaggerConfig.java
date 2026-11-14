package pe.bbva.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Documentación en http://localhost:8080/swagger-ui.html (botón Authorize para pegar el token). */
@Configuration
public class SwaggerConfig {

    private static final String ESQUEMA = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("API - Sistema de Detección de Fraude BBVA Piura")
                        .description("Backend Spring Boot: transacciones, motor de riesgo con IA, alertas, "
                                + "notificaciones al cliente, auditoría y reportes.")
                        .version("1.0.0"))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA))
                .components(new Components().addSecuritySchemes(ESQUEMA, new SecurityScheme()
                        .name(ESQUEMA)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
