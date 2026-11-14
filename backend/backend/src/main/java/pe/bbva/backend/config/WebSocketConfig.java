package pe.bbva.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import pe.bbva.backend.config.properties.AppProperties;

/**
 * Alertas en tiempo real para el dashboard.
 * React se conecta a ws://localhost:8080/ws y se suscribe a /topic/alertas y /topic/transacciones.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AppProperties props;

    public WebSocketConfig(AppProperties props) {
        this.props = props;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origenes = props.corsOrigins().toArray(String[]::new);
        registry.addEndpoint("/ws").setAllowedOriginPatterns(origenes);
        registry.addEndpoint("/ws-sockjs").setAllowedOriginPatterns(origenes).withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
