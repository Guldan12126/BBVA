import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso } from '../components/UI'
import Icono from '../components/Icono'
import PantallaAcceso, { BotonVerPassword } from '../components/PantallaAcceso'

const CLAVE_RECORDAR = 'login.correo'

const BENEFICIOS = [
  { icono: 'alerta', texto: 'Alertas de fraude en tiempo real' },
  { icono: 'ia', texto: 'Detección con IA y Machine Learning' },
  { icono: 'caso', texto: 'Gestión de casos y seguimiento' },
  { icono: 'auditoria', texto: 'Auditoría y trazabilidad completa' },
]

function leerCorreoGuardado() {
  try {
    return localStorage.getItem(CLAVE_RECORDAR) || ''
  } catch {
    return ''
  }
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [correo, setCorreo] = useState(leerCorreoGuardado)
  const [password, setPassword] = useState('')
  const [recordar, setRecordar] = useState(() => leerCorreoGuardado() !== '')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(correo, password)
      try {
        if (recordar) localStorage.setItem(CLAVE_RECORDAR, correo)
        else localStorage.removeItem(CLAVE_RECORDAR)
      } catch {
        /* almacenamiento no disponible: se ignora */
      }
      navigate(location.state?.desde || '/', { replace: true })
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PantallaAcceso
      titulo="Detección de Fraude"
      texto="Protección de tarjetas con inteligencia artificial · Agencia Piura"
      items={BENEFICIOS}
    >
      <form onSubmit={enviar}>
        <div className="login-escudo">
          <img src="/escudo.svg" alt="" width="26" height="26" />
        </div>
        <h1>Bienvenido de vuelta</h1>
        <p className="login-subtitulo">Ingresa tus credenciales para continuar</p>

        <Aviso>{error}</Aviso>

        <label className="campo">
          <span className="campo-etiqueta">Correo</span>
          <div className="input-icono">
            <Icono nombre="correo" size={16} />
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              placeholder="Ingrese su correo"
              required
              autoFocus={!correo}
            />
          </div>
        </label>

        <label className="campo">
          <span className="campo-etiqueta">Contraseña</span>
          <div className="input-icono">
            <Icono nombre="candado" size={16} />
            <input
              type={verPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Ingrese su contraseña"
              required
              autoFocus={!!correo}
            />
            <BotonVerPassword visible={verPassword} alCambiar={setVerPassword} />
          </div>
        </label>

        <div className="login-opciones">
          <label className="login-recordar">
            <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
            Recordarme
          </label>
          <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
        </div>

        <button className="btn btn-primario btn-bloque login-boton" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
          {!enviando && <Icono nombre="flecha" size={16} />}
        </button>
      </form>
    </PantallaAcceso>
  )
}
