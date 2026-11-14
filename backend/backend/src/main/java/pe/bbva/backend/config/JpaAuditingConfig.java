package pe.bbva.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import pe.bbva.backend.security.SecurityUtils;
import pe.bbva.backend.util.Constantes;

import java.util.Optional;

/** Llena automáticamente creadoPor, modificadoPor y las fechas de las entidades Auditable. */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.of(SecurityUtils.correoActual().orElse(Constantes.USUARIO_SISTEMA));
    }
}
