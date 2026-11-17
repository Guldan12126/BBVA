import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Campo } from '../components/UI'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(correo, password)
      navigate(location.state?.desde || '/', { replace: true })
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pantalla-publica">
      <form className="tarjeta-publica" onSubmit={enviar}>
        <div className="marca marca-grande">
          <img src="/escudo.svg" alt="" width="40" height="40" />
          <div>
            <strong>Detección de Fraude</strong>
            <small>Tarjetas · Agencia Piura</small>
          </div>
        </div>
        <h1>Iniciar sesión</h1>
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Correo">
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="username"
            placeholder="analista@bbva.pe"
            required
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Contraseña">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Campo>
        <button className="btn btn-primario btn-bloque" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <Link to="/recuperar" className="enlace-centrado">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </div>
  )
}
