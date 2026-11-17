import Icono from './Icono'
import logoBbva from '../assets/images/bbva-logo.webp'

/**
 * Pantalla pública de dos columnas: panel azul de marca BBVA (izquierda) + contenido (derecha).
 * Se usa en el login y en la recuperación de contraseña.
 */
export default function PantallaAcceso({ titulo, texto, items, children }) {
  return (
    <div className="login">
      <aside className="login-marca">
        <span className="login-circulo login-circulo-1" aria-hidden="true" />
        <span className="login-circulo login-circulo-2" aria-hidden="true" />

        <div className="login-marca-contenido">
          <img src={logoBbva} alt="BBVA" className="login-logo" />
          <h2>{titulo}</h2>
          <p>{texto}</p>

          <ul className="login-beneficios">
            {items.map((b) => (
              <li key={b.texto}>
                <span className="login-beneficio-icono">
                  <Icono nombre={b.icono} size={15} />
                </span>
                {b.texto}
              </li>
            ))}
          </ul>
        </div>

        <small className="login-pie">© {new Date().getFullYear()} BBVA · Sistema de Detección de Fraude</small>
      </aside>

      <main className="login-lado-form">
        <div className="login-tarjeta">
          <img src={logoBbva} alt="BBVA" className="login-logo-movil" />
          {children}
        </div>
      </main>
    </div>
  )
}

/** Botón del ojito para mostrar/ocultar la contraseña. */
export function BotonVerPassword({ visible, alCambiar }) {
  const texto = visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
  return (
    <button type="button" className="input-accion" onClick={() => alCambiar((v) => !v)} aria-label={texto} title={texto}>
      <Icono nombre={visible ? 'ojo-cerrado' : 'ojo'} size={16} />
    </button>
  )
}
