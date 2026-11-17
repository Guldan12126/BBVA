import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { Aviso, Campo } from '../components/UI'

/**
 * "¿Olvidaste tu contraseña?" en 3 pasos (igual que el backend):
 * 1) se pide el correo, 2) se escribe el código de 6 dígitos, 3) se elige la nueva contraseña.
 */
export default function RecuperarPassword() {
  const [paso, setPaso] = useState(1)
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function ejecutar(accion) {
    setError(null)
    setEnviando(true)
    try {
      await accion()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const pedirCodigo = (e) => {
    e.preventDefault()
    ejecutar(async () => {
      const { data } = await api.post('/api/auth/forgot-password', { correo })
      setInfo(data.mensaje)
      setPaso(2)
    })
  }

  const verificar = (e) => {
    e.preventDefault()
    ejecutar(async () => {
      const { data } = await api.post('/api/auth/verify-code', { correo, codigo })
      setResetToken(data.resetToken)
      setInfo(null)
      setPaso(3)
    })
  }

  const restablecer = (e) => {
    e.preventDefault()
    if (nueva !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    ejecutar(async () => {
      const { data } = await api.post('/api/auth/reset-password', {
        resetToken,
        nuevaPassword: nueva,
        confirmarPassword: confirmar,
      })
      setInfo(data.mensaje)
      setPaso(4)
    })
  }

  return (
    <div className="pantalla-publica">
      <div className="tarjeta-publica">
        <h1>Recuperar contraseña</h1>
        <ol className="pasos">
          {['Correo', 'Código', 'Nueva contraseña'].map((t, i) => (
            <li key={t} className={paso > i ? 'activo' : ''}>
              {t}
            </li>
          ))}
        </ol>
        <Aviso>{error}</Aviso>
        <Aviso tipo="ok">{info}</Aviso>

        {paso === 1 && (
          <form onSubmit={pedirCodigo}>
            <Campo etiqueta="Correo registrado">
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoFocus />
            </Campo>
            <button className="btn btn-primario btn-bloque" disabled={enviando}>
              Enviar código
            </button>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={verificar}>
            <Campo etiqueta="Código de 6 dígitos" ayuda="Revisa tu correo. El código vence en 10 minutos.">
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                className="input-codigo"
                required
                autoFocus
              />
            </Campo>
            <button className="btn btn-primario btn-bloque" disabled={enviando || codigo.length !== 6}>
              Verificar código
            </button>
            <button type="button" className="btn btn-link btn-bloque" onClick={() => setPaso(1)}>
              Pedir otro código
            </button>
          </form>
        )}

        {paso === 3 && (
          <form onSubmit={restablecer}>
            <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres, con mayúscula, minúscula y número.">
              <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required autoFocus />
            </Campo>
            <Campo etiqueta="Confirmar contraseña">
              <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            </Campo>
            <button className="btn btn-primario btn-bloque" disabled={enviando}>
              Guardar contraseña
            </button>
          </form>
        )}

        <Link to="/login" className="enlace-centrado">
          {paso === 4 ? 'Ir a iniciar sesión' : 'Volver al inicio de sesión'}
        </Link>
      </div>
    </div>
  )
}
