package pe.bbva.backend.service.fraude;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.bbva.backend.exception.ResourceNotFoundException;
import pe.bbva.backend.model.enums.TipoAccion;
import pe.bbva.backend.model.enums.TipoListaNegra;
import pe.bbva.backend.model.fraude.ListaNegra;
import pe.bbva.backend.model.transaccion.Transaccion;
import pe.bbva.backend.repository.fraude.ListaNegraRepository;
import pe.bbva.backend.service.reporte.AuditoriaService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Tarjetas, comercios, IPs y dispositivos bloqueados. */
@Service
public class ListaNegraService {

    private final ListaNegraRepository repository;
    private final AuditoriaService auditoriaService;

    public ListaNegraService(ListaNegraRepository repository, AuditoriaService auditoriaService) {
        this.repository = repository;
        this.auditoriaService = auditoriaService;
    }

    /** Devuelve el motivo si algún dato de la transacción está en la lista negra. */
    @Transactional(readOnly = true)
    public Optional<String> verificar(Transaccion tx) {
        return buscar(TipoListaNegra.TARJETA, String.valueOf(tx.getTarjeta().getId()))
                .or(() -> buscar(TipoListaNegra.COMERCIO, String.valueOf(tx.getComercio().getId())))
                .or(() -> buscar(TipoListaNegra.IP, tx.getIp()))
                .or(() -> buscar(TipoListaNegra.DISPOSITIVO, tx.getDispositivo()));
    }

    private Optional<String> buscar(TipoListaNegra tipo, String valor) {
        if (valor == null || valor.isBlank()) {
            return Optional.empty();
        }
        LocalDateTime ahora = LocalDateTime.now();
        return repository.findByTipoAndValorAndActivoTrue(tipo, valor).stream()
                .filter(l -> l.getFechaExpiracion() == null || l.getFechaExpiracion().isAfter(ahora))
                .findFirst()
                .map(l -> tipo + " en lista negra" + (l.getMotivo() != null ? ": " + l.getMotivo() : ""));
    }

    @Transactional(readOnly = true)
    public List<ListaNegra> listar() {
        return repository.findAllByOrderByFechaCreacionDesc();
    }

    /**
     * Para TARJETA y COMERCIO el valor es el id; para IP y DISPOSITIVO, el texto tal cual.
     * diasVigencia null = permanente.
     */
    @Transactional
    public ListaNegra agregar(TipoListaNegra tipo, String valor, String motivo, Integer diasVigencia) {
        ListaNegra l = new ListaNegra();
        l.setTipo(tipo);
        l.setValor(valor.trim());
        l.setMotivo(motivo);
        l.setActivo(true);
        if (diasVigencia != null && diasVigencia > 0) {
            l.setFechaExpiracion(LocalDateTime.now().plusDays(diasVigencia));
        }
        repository.save(l);
        auditoriaService.registrar(TipoAccion.LISTA_NEGRA, null, "Agregado a lista negra: " + tipo + " " + valor);
        return l;
    }

    @Transactional
    public ListaNegra desactivar(Long id) {
        ListaNegra l = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lista negra", id));
        l.setActivo(false);
        repository.save(l);
        auditoriaService.registrar(TipoAccion.LISTA_NEGRA, null, "Retirado de lista negra: " + l.getTipo() + " " + l.getValor());
        return l;
    }

    @Transactional
    public void eliminar(Long id) {
        ListaNegra l = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lista negra", id));
        repository.delete(l);
        auditoriaService.registrar(TipoAccion.LISTA_NEGRA, null, "Eliminado de lista negra: " + l.getTipo() + " " + l.getValor());
    }
}
