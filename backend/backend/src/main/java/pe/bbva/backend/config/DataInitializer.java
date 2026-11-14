package pe.bbva.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import pe.bbva.backend.config.properties.AppProperties;
import pe.bbva.backend.config.properties.RiesgoProperties;
import pe.bbva.backend.model.cliente.Cliente;
import pe.bbva.backend.model.cliente.Comercio;
import pe.bbva.backend.model.cliente.Tarjeta;
import pe.bbva.backend.model.enums.Canal;
import pe.bbva.backend.model.enums.CategoriaComercio;
import pe.bbva.backend.model.enums.EstadoAlerta;
import pe.bbva.backend.model.enums.EstadoModelo;
import pe.bbva.backend.model.enums.EstadoTarjeta;
import pe.bbva.backend.model.enums.EstadoUsuario;
import pe.bbva.backend.model.enums.NivelRiesgo;
import pe.bbva.backend.model.enums.Rol;
import pe.bbva.backend.model.enums.TipoRegla;
import pe.bbva.backend.model.enums.TipoTarjeta;
import pe.bbva.backend.model.fraude.Alerta;
import pe.bbva.backend.model.fraude.ReglaFraude;
import pe.bbva.backend.model.ml.VersionModelo;
import pe.bbva.backend.model.seguridad.Usuario;
import pe.bbva.backend.repository.cliente.ClienteRepository;
import pe.bbva.backend.repository.cliente.ComercioRepository;
import pe.bbva.backend.repository.cliente.TarjetaRepository;
import pe.bbva.backend.repository.fraude.AlertaRepository;
import pe.bbva.backend.repository.fraude.ReglaFraudeRepository;
import pe.bbva.backend.repository.ml.VersionModeloRepository;
import pe.bbva.backend.repository.seguridad.UsuarioRepository;
import pe.bbva.backend.repository.transaccion.TransaccionRepository;
import pe.bbva.backend.service.fraude.AlertaService;
import pe.bbva.backend.service.ml.ParametroModeloService;
import pe.bbva.backend.service.transaccion.SimuladorService;
import pe.bbva.backend.service.transaccion.TransaccionService;
import pe.bbva.backend.util.Constantes;
import pe.bbva.backend.util.FechaUtils;
import pe.bbva.backend.util.GeoUtils;
import pe.bbva.backend.util.TarjetaUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Carga los datos iniciales al arrancar la aplicación (solo si la base de datos está vacía).
 *
 * Usuarios de demostración (contraseña para todos: Bbva2026):
 *   admin@bbva.pe       -> Administrador del Sistema
 *   analista@bbva.pe    -> Analista de Fraude
 *   supervisor@bbva.pe  -> Supervisor de Agencia
 *   operador@bbva.pe    -> Operador de Atención al Cliente
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
    public static final String PASSWORD_DEMO = "Bbva2026";

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final TarjetaRepository tarjetaRepository;
    private final ComercioRepository comercioRepository;
    private final ReglaFraudeRepository reglaRepository;
    private final VersionModeloRepository versionRepository;
    private final TransaccionRepository transaccionRepository;
    private final AlertaRepository alertaRepository;
    private final ParametroModeloService parametroService;
    private final TransaccionService transaccionService;
    private final SimuladorService simuladorService;
    private final AlertaService alertaService;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;
    private final RiesgoProperties riesgoProperties;

    // Semilla fija: los datos demo salen iguales en cada PC
    private final Random random = new Random(2026);

    public DataInitializer(UsuarioRepository usuarioRepository, ClienteRepository clienteRepository,
                           TarjetaRepository tarjetaRepository, ComercioRepository comercioRepository,
                           ReglaFraudeRepository reglaRepository, VersionModeloRepository versionRepository,
                           TransaccionRepository transaccionRepository, AlertaRepository alertaRepository,
                           ParametroModeloService parametroService, TransaccionService transaccionService,
                           SimuladorService simuladorService, AlertaService alertaService,
                           PasswordEncoder passwordEncoder, AppProperties appProperties,
                           RiesgoProperties riesgoProperties) {
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
        this.tarjetaRepository = tarjetaRepository;
        this.comercioRepository = comercioRepository;
        this.reglaRepository = reglaRepository;
        this.versionRepository = versionRepository;
        this.transaccionRepository = transaccionRepository;
        this.alertaRepository = alertaRepository;
        this.parametroService = parametroService;
        this.transaccionService = transaccionService;
        this.simuladorService = simuladorService;
        this.alertaService = alertaService;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
        this.riesgoProperties = riesgoProperties;
    }

    @Override
    public void run(String... args) {
        crearParametros();
        if (usuarioRepository.count() == 0) {
            crearUsuarios();
        }
        if (reglaRepository.count() == 0) {
            crearReglas();
        }
        if (versionRepository.count() == 0) {
            crearVersionInicial();
        }
        if (appProperties.datosDemo() && clienteRepository.count() == 0) {
            List<Comercio> comercios = crearComercios();
            List<Tarjeta> tarjetas = crearClientesYTarjetas();
            crearHistorial(tarjetas, comercios);
        }
        log.info("""

                ==========================================================
                 Backend listo  ->  http://localhost:8080/swagger-ui.html
                 Usuarios demo (contraseña: {}):
                   admin@bbva.pe | analista@bbva.pe | supervisor@bbva.pe | operador@bbva.pe
                ==========================================================""", PASSWORD_DEMO);
    }

    // ------------------------------------------------------------------ parámetros
    private void crearParametros() {
        parametroService.inicializar(Constantes.PARAM_UMBRAL_ALERTA, String.valueOf(riesgoProperties.umbralAlerta()),
                "Score a partir del cual se genera una alerta (transacción EN_REVISION)");
        parametroService.inicializar(Constantes.PARAM_UMBRAL_CRITICO, String.valueOf(riesgoProperties.umbralCritico()),
                "Score a partir del cual la transacción se BLOQUEA y la tarjeta se bloquea preventivamente");
        parametroService.inicializar(Constantes.PARAM_PESO_IA, String.valueOf(riesgoProperties.pesoIa()),
                "Peso del modelo de IA en el score final (el resto lo aportan las reglas)");
        parametroService.inicializar(Constantes.PARAM_VERSION_MODELO, "xgboost-v1",
                "Versión del modelo de ML en uso");
    }

    // ------------------------------------------------------------------ usuarios
    private void crearUsuarios() {
        usuarioRepository.saveAll(List.of(
                usuario("Rosa", "Castillo Vega", "admin@bbva.pe", Rol.ADMIN),
                usuario("Diego", "Paredes Ruiz", "analista@bbva.pe", Rol.ANALISTA),
                usuario("Lucía", "Herrera Sánchez", "supervisor@bbva.pe", Rol.SUPERVISOR),
                usuario("Luis", "Medina Flores", "operador@bbva.pe", Rol.OPERADOR),
                usuario("Andrea", "Chávez León", "analista2@bbva.pe", Rol.ANALISTA)));
        log.info("Usuarios de demostración creados");
    }

    private Usuario usuario(String nombres, String apellidos, String correo, Rol rol) {
        Usuario u = new Usuario();
        u.setNombres(nombres);
        u.setApellidos(apellidos);
        u.setCorreo(correo);
        u.setPassword(passwordEncoder.encode(PASSWORD_DEMO));
        u.setRol(rol);
        u.setEstado(EstadoUsuario.ACTIVO);
        return u;
    }

    // ------------------------------------------------------------------ reglas
    private void crearReglas() {
        reglaRepository.saveAll(List.of(
                regla("Monto elevado", "Compra mayor a S/ 5 000", TipoRegla.MONTO, 5000, 0.20),
                regla("Importe inusual", "Monto 4 veces mayor al promedio del cliente", TipoRegla.RATIO_MONTO, 4, 0.30),
                regla("Ubicación atípica", "Compra a más de 500 km de su ciudad habitual", TipoRegla.UBICACION, 500, 0.25),
                regla("Frecuencia elevada", "4 o más compras en la última hora", TipoRegla.FRECUENCIA, 4, 0.20),
                regla("Horario inusual", "Compra entre las 00:00 y las 05:00", TipoRegla.HORARIO, 5, 0.15),
                regla("Comercio de riesgo", "Categorías de alto riesgo (tecnología, viajes, casinos)",
                        TipoRegla.COMERCIO_RIESGO, 0.45, 0.15)));
    }

    private ReglaFraude regla(String nombre, String descripcion, TipoRegla tipo, double umbral, double peso) {
        ReglaFraude r = new ReglaFraude();
        r.setNombre(nombre);
        r.setDescripcion(descripcion);
        r.setTipo(tipo);
        r.setValorUmbral(umbral);
        r.setPeso(peso);
        r.setActiva(true);
        return r;
    }

    private void crearVersionInicial() {
        VersionModelo v = new VersionModelo();
        v.setVersion("xgboost-v1");
        v.setAlgoritmo("XGBoost");
        v.setEstado(EstadoModelo.ACTIVO);
        v.setFechaEntrenamiento(LocalDateTime.now());
        v.setObservaciones("Versión inicial. Las métricas se actualizan al entrenar en fraude-ml");
        versionRepository.save(v);
    }

    // ------------------------------------------------------------------ comercios
    private List<Comercio> crearComercios() {
        return comercioRepository.saveAll(List.of(
                comercio("Supermercado Central Piura", CategoriaComercio.SUPERMERCADO, "Piura", NivelRiesgo.BAJO, false),
                comercio("Restaurante Sabor Norteño", CategoriaComercio.RESTAURANTE, "Piura", NivelRiesgo.BAJO, false),
                comercio("Farmacia Salud Piura", CategoriaComercio.FARMACIA, "Piura", NivelRiesgo.BAJO, false),
                comercio("Grifo Sullana Norte", CategoriaComercio.COMBUSTIBLE, "Sullana", NivelRiesgo.BAJO, false),
                comercio("Moda Piura Store", CategoriaComercio.ROPA, "Piura", NivelRiesgo.BAJO, false),
                comercio("Cine Estrella Piura", CategoriaComercio.ENTRETENIMIENTO, "Piura", NivelRiesgo.BAJO, false),
                comercio("Servicios Luz Norte", CategoriaComercio.SERVICIOS, "Piura", NivelRiesgo.BAJO, false),
                comercio("Restaurante Costa Talara", CategoriaComercio.RESTAURANTE, "Talara", NivelRiesgo.BAJO, false),
                comercio("TecnoStore Lima", CategoriaComercio.TECNOLOGIA, "Lima", NivelRiesgo.MEDIO, false),
                comercio("Viajes Global Online", CategoriaComercio.VIAJES, "Miami", NivelRiesgo.ALTO, true),
                comercio("Casino Royal Online", CategoriaComercio.CASINO, "Madrid", NivelRiesgo.ALTO, true),
                comercio("ElectroMarket Shenzhen", CategoriaComercio.TECNOLOGIA, "Shenzhen", NivelRiesgo.ALTO, true)));
    }

    private Comercio comercio(String nombre, CategoriaComercio cat, String ciudad, NivelRiesgo riesgo,
                              boolean internacional) {
        Comercio c = new Comercio();
        c.setNombre(nombre);
        c.setCategoria(cat);
        c.setCiudad(ciudad);
        double[] coord = GeoUtils.coordenadas(ciudad);
        if (coord != null) {
            c.setLatitud(coord[0]);
            c.setLongitud(coord[1]);
        }
        c.setNivelRiesgo(riesgo);
        c.setInternacional(internacional);
        return c;
    }

    // ------------------------------------------------------------------ clientes y tarjetas
    private List<Tarjeta> crearClientesYTarjetas() {
        String[][] datos = {
                {"María", "Ríos Távara", "45871236", "Piura"},
                {"José", "Vílchez Ramos", "46213578", "Piura"},
                {"Carmen", "Zapata Córdova", "41235698", "Sullana"},
                {"Jorge", "Alvarado Seminario", "47896512", "Piura"},
                {"Patricia", "Sosa Merino", "42563987", "Talara"},
                {"Ricardo", "Chunga Ipanaqué", "48523671", "Piura"},
                {"Elena", "Morales Garcés", "43698521", "Paita"},
                {"Fernando", "Cruz Atoche", "44789632", "Piura"}
        };
        List<Tarjeta> tarjetas = new ArrayList<>();
        for (int i = 0; i < datos.length; i++) {
            Cliente c = new Cliente();
            c.setNombres(datos[i][0]);
            c.setApellidos(datos[i][1]);
            c.setDni(datos[i][2]);
            c.setCiudad(datos[i][3]);
            c.setTelefono("9" + (10000000 + random.nextInt(89999999)));
            c.setCorreo("cliente" + (i + 1) + "@example.com");
            c.setDireccion("Av. Grau " + (100 + i * 37) + ", " + datos[i][3]);
            clienteRepository.save(c);

            tarjetas.add(tarjeta(c, TipoTarjeta.DEBITO, "4557"));
            if (i % 2 == 0) {
                tarjetas.add(tarjeta(c, TipoTarjeta.CREDITO, "4919"));
            }
        }
        return tarjetas;
    }

    private Tarjeta tarjeta(Cliente cliente, TipoTarjeta tipo, String bin) {
        String numero = numeroValido(bin);
        Tarjeta t = new Tarjeta();
        t.setCliente(cliente);
        t.setTipo(tipo);
        t.setNumeroEnmascarado(TarjetaUtils.enmascarar(numero));
        t.setUltimosDigitos(TarjetaUtils.ultimosDigitos(numero));
        t.setFechaVencimiento(String.format("%02d/%02d", 1 + random.nextInt(12), 27 + random.nextInt(4)));
        t.setLimiteCredito(tipo == TipoTarjeta.CREDITO ? BigDecimal.valueOf(5000 + random.nextInt(10) * 1000L) : null);
        t.setEstado(EstadoTarjeta.ACTIVA);
        return tarjetaRepository.save(t);
    }

    /** Genera un número de 16 dígitos que pasa el algoritmo de Luhn. */
    private String numeroValido(String bin) {
        StringBuilder sb = new StringBuilder(bin);
        while (sb.length() < 15) {
            sb.append(random.nextInt(10));
        }
        for (int d = 0; d <= 9; d++) {
            if (TarjetaUtils.esNumeroValido(sb + String.valueOf(d))) {
                return sb.append(d).toString();
            }
        }
        return sb.append('0').toString();
    }

    // ------------------------------------------------------------------ historial de transacciones
    private void crearHistorial(List<Tarjeta> tarjetas, List<Comercio> comercios) {
        List<Comercio> locales = comercios.stream()
                .filter(c -> !c.getCategoria().esAltoRiesgo() && !Boolean.TRUE.equals(c.getInternacional()))
                .toList();
        LocalDateTime ahora = FechaUtils.ahora();

        // 1) Compras normales de los últimos 7 días: forman el comportamiento habitual de cada cliente
        for (Tarjeta t : tarjetas) {
            double base = 60 + random.nextInt(250);
            int compras = 6 + random.nextInt(4);
            for (int i = 0; i < compras; i++) {
                Comercio c = locales.get(random.nextInt(locales.size()));
                LocalDateTime fecha = ahora.minusDays(1 + random.nextInt(7))
                        .withHour(8 + random.nextInt(13)).withMinute(random.nextInt(60));
                BigDecimal monto = BigDecimal.valueOf(base * (0.6 + random.nextDouble() * 0.8))
                        .setScale(2, RoundingMode.HALF_UP);
                transaccionService.registrar(t.getId(), c.getId(), monto,
                        random.nextInt(10) < 8 ? Canal.POS : Canal.APP_MOVIL, null, null, null,
                        "190.42." + random.nextInt(256) + "." + random.nextInt(256), "POS-" + (1000 + i), fecha);
            }
        }

        // 2) Algunas compras sospechosas de hoy (generan alertas)
        for (int i = 0; i < 8; i++) {
            simuladorService.generar(true);
        }
        // 3) Compras normales de hoy
        for (int i = 0; i < 12; i++) {
            simuladorService.generar(false);
        }

        // 4) El analista resuelve algunas alertas para que el dashboard muestre fraudes y falsos positivos
        resolverAlertasDemo();
        log.info("Datos demo creados: {} transacciones, {} alertas",
                transaccionRepository.count(), alertaRepository.count());
    }

    private void resolverAlertasDemo() {
        Usuario analista = usuarioRepository.findByCorreoIgnoreCase("analista@bbva.pe").orElse(null);
        if (analista == null) {
            return;
        }
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                analista.getCorreo(), null, List.of(new SimpleGrantedAuthority("ROLE_" + Rol.ANALISTA.name()))));
        try {
            List<Alerta> pendientes = alertaRepository.findAll().stream()
                    .filter(a -> a.getEstado() == EstadoAlerta.PENDIENTE)
                    .toList();
            for (int i = 0; i < Math.min(3, pendientes.size()); i++) {
                boolean esFraude = i < 2;
                alertaService.decidir(pendientes.get(i).getId(), esFraude,
                        esFraude ? "Cliente no reconoce la compra (dato demo)" : "Compra confirmada por el cliente (dato demo)",
                        esFraude);
            }
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
