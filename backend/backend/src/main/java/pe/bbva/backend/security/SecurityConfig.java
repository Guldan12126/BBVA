package pe.bbva.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import pe.bbva.backend.security.handler.CustomAccessDeniedHandler;
import pe.bbva.backend.security.handler.JwtAuthEntryPoint;
import pe.bbva.backend.security.jwt.JwtAuthFilter;
import pe.bbva.backend.security.jwt.JwtService;
import pe.bbva.backend.util.Constantes;

/**
 * Permisos por rol:
 * ADMIN = Administrador del Sistema | ANALISTA = Analista de Fraude
 * SUPERVISOR = Supervisor de Agencia | OPERADOR = Operador de Atención al Cliente
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String ADMIN = "ADMIN";
    private static final String ANALISTA = "ANALISTA";
    private static final String SUPERVISOR = "SUPERVISOR";
    private static final String OPERADOR = "OPERADOR";

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthEntryPoint authEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(JwtService jwtService, UserDetailsServiceImpl userDetailsService,
                          JwtAuthEntryPoint authEntryPoint, CustomAccessDeniedHandler accessDeniedHandler) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.authEntryPoint = authEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(authEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        // ---------- Público ----------
                        .requestMatchers(Constantes.RUTAS_PUBLICAS).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // ---------- Lista corta de analistas/operadores para asignar alertas ----------
                        .requestMatchers(HttpMethod.GET, "/api/usuarios/asignables").hasAnyRole(ADMIN, SUPERVISOR, ANALISTA)

                        // ---------- Solo Administrador ----------
                        .requestMatchers("/api/usuarios/**", "/api/simulador/**", "/api/auditoria/accesos/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.POST, "/api/transacciones").hasRole(ADMIN)

                        // ---------- Modelo ML y parámetros ----------
                        .requestMatchers(HttpMethod.GET, "/api/parametros/**", "/api/modelo/**")
                        .hasAnyRole(ADMIN, SUPERVISOR, ANALISTA)
                        .requestMatchers("/api/parametros/**", "/api/modelo/**").hasRole(ADMIN)

                        // ---------- Reglas y lista negra ----------
                        .requestMatchers(HttpMethod.GET, "/api/reglas/**", "/api/lista-negra/**")
                        .hasAnyRole(ADMIN, ANALISTA, SUPERVISOR)
                        .requestMatchers(HttpMethod.POST, "/api/lista-negra/**").hasAnyRole(ADMIN, ANALISTA)
                        .requestMatchers(HttpMethod.PATCH, "/api/lista-negra/*/desactivar").hasAnyRole(ADMIN, ANALISTA)
                        .requestMatchers("/api/reglas/**", "/api/lista-negra/**").hasRole(ADMIN)

                        // ---------- Reportes y auditoría ----------
                        .requestMatchers("/api/reportes/**").hasAnyRole(ADMIN, SUPERVISOR)
                        .requestMatchers("/api/auditoria/**").hasAnyRole(ADMIN, SUPERVISOR, ANALISTA)

                        // ---------- Alertas ----------
                        .requestMatchers(HttpMethod.PATCH, "/api/alertas/*/decision").hasAnyRole(ANALISTA, SUPERVISOR)
                        .requestMatchers(HttpMethod.PATCH, "/api/alertas/*/escalar").hasAnyRole(ANALISTA, SUPERVISOR)
                        .requestMatchers(HttpMethod.PATCH, "/api/alertas/*/asignar").hasAnyRole(ADMIN, SUPERVISOR, ANALISTA)
                        .requestMatchers(HttpMethod.PATCH, "/api/alertas/*/tomar").hasAnyRole(ANALISTA, OPERADOR)
                        .requestMatchers(HttpMethod.POST, "/api/alertas/*/comentarios").hasAnyRole(ANALISTA, SUPERVISOR, OPERADOR)

                        // ---------- Casos ----------
                        .requestMatchers("/api/casos/**").hasAnyRole(ANALISTA, SUPERVISOR)

                        // ---------- Atención al cliente ----------
                        .requestMatchers(HttpMethod.POST, "/api/atencion/**").hasRole(OPERADOR)
                        .requestMatchers(HttpMethod.POST, "/api/notificaciones/**").hasAnyRole(OPERADOR, ANALISTA)

                        // ---------- Catálogos: solo el Administrador los modifica ----------
                        .requestMatchers(HttpMethod.POST, "/api/clientes/**", "/api/comercios/**", "/api/tarjetas").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.PUT, "/api/clientes/**", "/api/comercios/**").hasRole(ADMIN)
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole(ADMIN)

                        // ---------- Todo lo demás: cualquier usuario logueado ----------
                        .anyRequest().authenticated())
                .addFilterBefore(new JwtAuthFilter(jwtService, userDetailsService),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
