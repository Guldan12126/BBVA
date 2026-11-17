import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Campo, Detalles, Encabezado } from '../components/UI'
import { etiqueta, fechaHora } from '../utils/formato'

/** Datos del usuario logueado y cambio de contraseña. */
export default function Perfil() {
  const { usuario } = useAuth()
  const [form, setForm] = useState({ passwordActual: '', nuevaPassword: '', confirmarPassword: '' })
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setOk(null)
    try {
      const { data } = await api.post('/api/auth/cambiar-password', form)
      setOk(data.mensaje)
      setForm({ passwordActual: '', nuevaPassword: '', confirmarPassword: '' })
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <>
      <Encabezado titulo="Mi cuenta" />
      <div className="grid-2">
        <section className="panel">
          <h2>Mis datos</h2>
          <Detalles
            items={[
              ['Nombre', `${usuario.nombres} ${usuario.apellidos}`],
              ['Correo', usuario.correo],
              ['Rol', etiqueta(usuario.rol)],
              ['Último acceso', fechaHora(usuario.ultimoAcceso)],
            ]}
          />
        </section>
        <form className="panel" onSubmit={enviar}>
          <h2>Cambiar contraseña</h2>
          <Aviso>{error}</Aviso>
          <Aviso tipo="ok">{ok}</Aviso>
          <Campo etiqueta="Contraseña actual">
            <input type="password" value={form.passwordActual} onChange={cambiar('passwordActual')} required />
          </Campo>
          <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres, con mayúscula, minúscula y número.">
            <input type="password" value={form.nuevaPassword} onChange={cambiar('nuevaPassword')} required />
          </Campo>
          <Campo etiqueta="Confirmar nueva contraseña">
            <input type="password" value={form.confirmarPassword} onChange={cambiar('confirmarPassword')} required />
          </Campo>
          <button className="btn btn-primario">Actualizar contraseña</button>
        </form>
      </div>
    </>
  )
}
