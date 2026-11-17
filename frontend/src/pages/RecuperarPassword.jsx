import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { Aviso } from '../components/UI'
import Icono from '../components/Icono'
import PantallaAcceso, { BotonVerPassword } from '../components/PantallaAcceso'

const PASOS = ['Correo', 'Código', 'Nueva contraseña']

const CONSEJOS = [
  { icono: 'correo', texto: 'Te enviamos un código a tu correo' },
  { icono: 'reloj', texto: 'El código vence en 10 minutos' },
  { icono: 'candado', texto: 'Usa mayúsculas, minúsculas y números' },
  { icono: 'auditoria', texto: 'Nunca compartas tu contraseña' },
]

const CABECERAS = {
  1: { icono: 'correo', titulo: 'Recuperar contraseña', texto: 'Ingresa tu correo registrado y te enviaremos un código' },
  2: { icono: 'llave', titulo: 'Verifica tu identidad', texto: 'Escribe el código de 6 dígitos que enviamos a' },
  3: { icono: 'candado', titulo: 'Crea una nueva contraseña', texto: 'Mínimo 8 caracteres, con mayúscula, minúscula y número' },
  4: { icono: 'check', titulo: '¡Contraseña actualizada!', texto: 'Ya puedes iniciar sesión con tu nueva contraseña' },
}

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
  const [verPassword, setVerPassword] = useState(false)
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
      setCodigo('')
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

  const cabecera = CABECERAS[paso]

  return (
    <PantallaAcceso
      titulo="Recupera tu acceso"
      texto="Restablece tu contraseña de forma segura en tres simples pasos"
      items={CONSEJOS}
    >
      <div className={`login-escudo ${paso === 4 ? 'login-escudo-ok' : ''}`}>
        <Icono nombre={cabecera.icono} size={24} />
      </div>
      <h1>{cabecera.titulo}</h1>
      <p className="login-subtitulo">
        {cabecera.texto}
        {paso === 2 && <strong className="login-correo-destino">{correo}</strong>}
      </p>

      {paso < 4 && (
        <ol className="pasos-numerados">
          {PASOS.map((t, i) => (
            <li key={t} className={paso > i + 1 ? 'hecho' : paso === i + 1 ? 'activo' : ''}>
              <span className="paso-num">{paso > i + 1 ? '✓' : i + 1}</span>
              <span className="paso-texto">{t}</span>
            </li>
          ))}
        </ol>
      )}

      <Aviso>{error}</Aviso>
      {paso !== 4 && <Aviso tipo="ok">{info}</Aviso>}

      {paso === 1 && (
        <form onSubmit={pedirCodigo}>
          <label className="campo">
            <span className="campo-etiqueta">Correo registrado</span>
            <div className="input-icono">
              <Icono nombre="correo" size={16} />
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ingrese su correo"
                autoComplete="username"
                required
                autoFocus
              />
            </div>
          </label>
          <button className="btn btn-primario btn-bloque login-boton" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar código'}
            {!enviando && <Icono nombre="flecha" size={16} />}
          </button>
        </form>
      )}

      {paso === 2 && (
        <form onSubmit={verificar}>
          <label className="campo">
            <span className="campo-etiqueta">Código de verificación</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="input-codigo"
              required
              autoFocus
            />
          </label>
          <button className="btn btn-primario btn-bloque login-boton" disabled={enviando || codigo.length !== 6}>
            {enviando ? 'Verificando…' : 'Verificar código'}
            {!enviando && <Icono nombre="flecha" size={16} />}
          </button>
          <p className="login-reenviar">
            ¿No te llegó?{' '}
            <button type="button" className="btn-texto" onClick={() => { setInfo(null); setPaso(1) }}>
              Pedir otro código
            </button>
          </p>
        </form>
      )}

      {paso === 3 && (
        <form onSubmit={restablecer}>
          <label className="campo">
            <span className="campo-etiqueta">Nueva contraseña</span>
            <div className="input-icono">
              <Icono nombre="candado" size={16} />
              <input
                type={verPassword ? 'text' : 'password'}
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                placeholder="Ingrese su nueva contraseña"
                autoComplete="new-password"
                required
                autoFocus
              />
              <BotonVerPassword visible={verPassword} alCambiar={setVerPassword} />
            </div>
          </label>
          <label className="campo">
            <span className="campo-etiqueta">Confirmar contraseña</span>
            <div className="input-icono">
              <Icono nombre="candado" size={16} />
              <input
                type={verPassword ? 'text' : 'password'}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repita la contraseña"
                autoComplete="new-password"
                required
              />
            </div>
            {confirmar && nueva !== confirmar && <span className="campo-error">Las contraseñas no coinciden</span>}
          </label>
          <button className="btn btn-primario btn-bloque login-boton" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar contraseña'}
            {!enviando && <Icono nombre="flecha" size={16} />}
          </button>
        </form>
      )}

      {paso === 4 && (
        <Link to="/login" className="btn btn-primario btn-bloque login-boton">
          Ir a iniciar sesión
          <Icono nombre="flecha" size={16} />
        </Link>
      )}

      {paso < 4 && (
        <Link to="/login" className="login-volver">
          <Icono nombre="flecha-izq" size={15} />
          Volver al inicio de sesión
        </Link>
      )}
    </PantallaAcceso>
  )
}
