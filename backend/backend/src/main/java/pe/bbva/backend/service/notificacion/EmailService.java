package pe.bbva.backend.service.notificacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pe.bbva.backend.config.properties.AppProperties;

/**
 * Envía correos de texto simple (sin HTML).
 * Si app.mail-enabled=false, el correo NO se envía: se muestra en la consola (útil para la demo).
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final AppProperties props;

    public EmailService(ObjectProvider<JavaMailSender> mailSender, AppProperties props) {
        this.mailSender = mailSender;
        this.props = props;
    }

    @Async
    public void enviarCodigoVerificacion(String correo, String nombre, String codigo, int minutos) {
        String texto = """
                Hola %s,

                Recibimos una solicitud para restablecer tu contraseña del Sistema de Detección de Fraude BBVA.

                Tu código de verificación es: %s

                El código vence en %d minutos y solo puede usarse una vez.
                Si no solicitaste este cambio, ignora este mensaje.

                BBVA - Agencia Piura
                """.formatted(nombre, codigo, minutos);
        enviar(correo, "Código de verificación - Sistema de Fraude BBVA", texto);
    }

    @Async
    public void enviarConfirmacionCambioPassword(String correo, String nombre) {
        String texto = """
                Hola %s,

                Tu contraseña del Sistema de Detección de Fraude BBVA fue cambiada correctamente.
                Si no fuiste tú, comunícate de inmediato con el Administrador del Sistema.

                BBVA - Agencia Piura
                """.formatted(nombre);
        enviar(correo, "Tu contraseña fue actualizada", texto);
    }

    @Async
    public void enviarValidacionCompra(String correo, String nombre, String detalleCompra, String enlace, int minutos) {
        String texto = """
                Hola %s,

                Detectamos una operación inusual con tu tarjeta:

                %s

                ¿Reconoces esta compra? Ingresa al siguiente enlace para confirmarlo:
                %s

                El enlace vence en %d minutos. BBVA nunca te pedirá tu clave, CVV ni token por este medio.

                BBVA - Prevención de Fraude
                """.formatted(nombre, detalleCompra, enlace, minutos);
        enviar(correo, "¿Reconoces esta compra? - BBVA", texto);
    }

    private void enviar(String para, String asunto, String texto) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (!props.mailEnabled() || sender == null || para == null || para.isBlank()) {
            log.info("""

                    ===== CORREO SIMULADO (app.mail-enabled=false) =====
                    Para: {}
                    Asunto: {}
                    {}
                    ====================================================""", para, asunto, texto);
            return;
        }
        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(props.mailFrom());
            mensaje.setTo(para);
            mensaje.setSubject(asunto);
            mensaje.setText(texto);
            sender.send(mensaje);
            log.info("Correo enviado a {}: {}", para, asunto);
        } catch (MailException e) {
            log.error("No se pudo enviar el correo a {}: {}", para, e.getMessage());
        }
    }
}
