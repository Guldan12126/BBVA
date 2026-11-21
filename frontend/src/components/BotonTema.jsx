import useTema from '../hooks/useTema'
import Icono from './Icono'

/** Botón sol/luna para alternar entre el tema claro (BBVA) y el oscuro. */
export default function BotonTema({ flotante = false }) {
  const { tema, alternar } = useTema()
  const texto = tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
  return (
    <button
      type="button"
      className={`btn-icono btn-tema ${flotante ? 'btn-tema-flotante' : ''}`}
      onClick={alternar}
      title={texto}
      aria-label={texto}
    >
      <Icono nombre={tema === 'oscuro' ? 'sol' : 'luna'} />
    </button>
  )
}
