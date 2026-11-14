package pe.bbva.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Activa las tareas programadas de la carpeta scheduler. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
