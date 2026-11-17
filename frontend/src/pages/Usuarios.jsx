import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Badge, Campo, Cargando, Encabezado, Modal, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { ENUMS, etiqueta, fechaHora } from '../utils/formato'

/** Gestión de usuarios y roles (solo Administrador). */
export default function Usuarios() {
  const { usuario: yo } = useAuth()
  const [rol, setRol] = useState('')
  const { datos, cargando, error, recargar } = useApi('/api/usuarios', { rol })
  const [modal, setModal] = useState(null) // { tipo: 'nuevo' | 'editar' | 'password', usuario }
  const [aviso, setAviso] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  async function cambiarEstado(u, estado) {
    setErrorAccion(null)
    try {
      await api.patch(`/api/usuarios/${u.id}/estado`, { estado })
      setAviso(`${u.correo}: ${etiqueta(estado).toLowerCase()}`)
      recargar()
    } catch (e) {
      setErrorAccion(mensajeError(e))
    }
  }

  const listo = (msg) => { setModal(null); setAviso(msg); recargar() }

  return (
    <>
      <Encabezado titulo="Usuarios" descripcion="Personal del banco con acceso al sistema">
        <button className="btn btn-primario" onClick={() => setModal({ tipo: 'nuevo' })}>+ Nuevo usuario</button>
      </Encabezado>
      <div className="filtros">
        <SelectEnum valores={ENUMS.rol} valor={rol} alCambiar={setRol} todos="Todos los roles" aria-label="Rol" />
      </div>
      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>
      <Aviso alCerrar={() => setErrorAccion(null)}>{error || errorAccion}</Aviso>
      {cargando && !datos && <Cargando />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? <Vacio /> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th /></tr></thead>
                <tbody>
                  {datos.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.nombres} {u.apellidos}</strong>{u.id === yo.id && <span className="muted"> (tú)</span>}</td>
                      <td>{u.correo}</td>
                      <td>{etiqueta(u.rol)}</td>
                      <td><Badge valor={u.estado} /></td>
                      <td>{fechaHora(u.ultimoAcceso)}</td>
                      <td className="der nowrap">
                        <button className="btn btn-sec btn-sm" onClick={() => setModal({ tipo: 'editar', usuario: u })}>Editar</button>{' '}
                        <button className="btn btn-sec btn-sm" onClick={() => setModal({ tipo: 'password', usuario: u })}>Contraseña</button>{' '}
                        {u.id !== yo.id && (u.estado === 'ACTIVO'
                          ? <button className="btn btn-peligro-sec btn-sm" onClick={() => cambiarEstado(u, 'INACTIVO')}>Desactivar</button>
                          : <button className="btn btn-sec btn-sm" onClick={() => cambiarEstado(u, 'ACTIVO')}>Activar</button>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {(modal?.tipo === 'nuevo' || modal?.tipo === 'editar') && (
        <FormUsuario usuario={modal.usuario} alCerrar={() => setModal(null)} alGuardar={() => listo(modal.usuario ? 'Usuario actualizado' : 'Usuario creado')} />
      )}
      {modal?.tipo === 'password' && (
        <FormPassword usuario={modal.usuario} alCerrar={() => setModal(null)} alGuardar={() => listo('Contraseña restablecida')} />
      )}
    </>
  )
}

function FormUsuario({ usuario, alCerrar, alGuardar }) {
  const [f, setF] = useState({ nombres: '', apellidos: '', correo: '', password: '', rol: 'ANALISTA', ...usuario })
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    try {
      if (usuario) {
        await api.put(`/api/usuarios/${usuario.id}`, { nombres: f.nombres, apellidos: f.apellidos, correo: f.correo, rol: f.rol })
      } else {
        await api.post('/api/usuarios', { nombres: f.nombres, apellidos: f.apellidos, correo: f.correo, password: f.password, rol: f.rol })
      }
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <Modal titulo={usuario ? 'Editar usuario' : 'Nuevo usuario'} abierto alCerrar={alCerrar}>
      <form onSubmit={enviar} className="form-grid">
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Nombres"><input value={f.nombres} onChange={set('nombres')} required /></Campo>
        <Campo etiqueta="Apellidos"><input value={f.apellidos} onChange={set('apellidos')} required /></Campo>
        <Campo etiqueta="Correo"><input type="email" value={f.correo} onChange={set('correo')} required /></Campo>
        <Campo etiqueta="Rol"><SelectEnum valores={ENUMS.rol} valor={f.rol} alCambiar={(v) => setF({ ...f, rol: v })} todos={false} /></Campo>
        {!usuario && (
          <Campo etiqueta="Contraseña inicial" ayuda="Mínimo 8 caracteres, con mayúscula, minúscula y número.">
            <input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required />
          </Campo>
        )}
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

function FormPassword({ usuario, alCerrar, alGuardar }) {
  const [nuevaPassword, setNueva] = useState('')
  const [error, setError] = useState(null)
  async function enviar(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.patch(`/api/usuarios/${usuario.id}/password`, { nuevaPassword })
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    }
  }
  return (
    <Modal titulo={`Restablecer contraseña de ${usuario.nombres}`} abierto alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        <Aviso>{error}</Aviso>
        <Campo etiqueta="Nueva contraseña" ayuda="Se cerrarán sus sesiones abiertas.">
          <input type="password" value={nuevaPassword} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" required />
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={alCerrar}>Cancelar</button>
          <button className="btn btn-primario">Restablecer</button>
        </div>
      </form>
    </Modal>
  )
}
