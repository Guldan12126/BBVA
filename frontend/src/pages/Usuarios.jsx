import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { BotonVerPassword } from '../components/PantallaAcceso'
import { Aviso, Badge, Campo, Encabezado, InputPrefijo, Modal, Opciones, PieModal, RequisitosPassword, SeccionForm, SelectEnum, TablaCargando, Vacio, generarPassword, passwordValida, useConfirmar } from '../components/UI'
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
  const [confirmar, dialogo] = useConfirmar()

  async function cambiarEstado(u, estado) {
    if (estado === 'INACTIVO') {
      const ok = await confirmar({
        titulo: `¿Desactivar a ${u.nombres} ${u.apellidos}?`,
        mensaje: 'No podrá iniciar sesión hasta que lo vuelvas a activar.',
        textoOk: 'Desactivar usuario',
      })
      if (!ok) return
    }
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
      {cargando && !datos && <TablaCargando columnas={6} />}
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
      {dialogo}
    </>
  )
}

const ROLES = [
  { valor: 'ANALISTA', texto: 'Analista de Fraude', descripcion: 'Revisa y decide las alertas', icono: 'alerta' },
  { valor: 'OPERADOR', texto: 'Operador de Atención', descripcion: 'Llama y atiende al cliente', icono: 'telefono' },
  { valor: 'SUPERVISOR', texto: 'Supervisor de Agencia', descripcion: 'Decide escaladas y ve reportes', icono: 'auditoria' },
  { valor: 'ADMIN', texto: 'Administrador', descripcion: 'Configura todo el sistema', icono: 'llave' },
]

/** Campo de contraseña con ojito, botón "Generar" y lista de requisitos. */
function CampoPassword({ etiqueta: texto, valor, alCambiar, ayuda }) {
  const [ver, setVer] = useState(false)
  const [copiada, setCopiada] = useState(false)

  function generar() {
    alCambiar(generarPassword())
    setVer(true)
    setCopiada(false)
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiada(true)
    } catch {
      setCopiada(false)
    }
  }

  return (
    <div className="campo campo-ancho">
      <span className="campo-etiqueta">
        {texto} <span className="campo-requerido">*</span>
        <span className="campo-extra">
          <button type="button" className="btn-texto" onClick={generar}><Icono nombre="actualizar" size={13} /> Generar segura</button>
          {valor && (
            <button type="button" className="btn-texto" onClick={copiar}>{copiada ? '¡Copiada!' : 'Copiar'}</button>
          )}
        </span>
      </span>
      <div className="input-icono">
        <Icono nombre="llave" size={16} />
        <input type={ver ? 'text' : 'password'} value={valor} onChange={(e) => { alCambiar(e.target.value); setCopiada(false) }}
          autoComplete="new-password" className={ver ? 'mono' : ''} required />
        <BotonVerPassword visible={ver} alCambiar={setVer} />
      </div>
      <RequisitosPassword password={valor} />
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </div>
  )
}

function FormUsuario({ usuario, alCerrar, alGuardar }) {
  const [f, setF] = useState({ nombres: '', apellidos: '', correo: '', password: '', rol: 'ANALISTA', ...usuario })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const iniciales = `${f.nombres?.trim()?.[0] || ''}${f.apellidos?.trim()?.[0] || ''}`.toUpperCase()

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      if (usuario) {
        await api.put(`/api/usuarios/${usuario.id}`, { nombres: f.nombres, apellidos: f.apellidos, correo: f.correo, rol: f.rol })
      } else {
        await api.post('/api/usuarios', { nombres: f.nombres, apellidos: f.apellidos, correo: f.correo, password: f.password, rol: f.rol })
      }
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      subtitulo={usuario ? usuario.correo : 'Da acceso al sistema a un miembro del personal'}
      icono="usuarios" abierto alCerrar={alCerrar} ancho={660}>
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

        <div className="ficha-previa">
          <span className="ficha-avatar">{iniciales || <Icono nombre="cliente" size={20} />}</span>
          <span className="ficha-textos">
            <strong>{`${f.nombres} ${f.apellidos}`.trim() || 'Nombre del usuario'}</strong>
            <small>{f.correo || 'correo@bbva.pe'} · {etiqueta(f.rol)}</small>
          </span>
        </div>

        <SeccionForm titulo="Datos personales" icono="cliente">
          <Campo etiqueta="Nombres" requerido>
            <input value={f.nombres} onChange={set('nombres')} placeholder="Ej. Luis Alberto" autoFocus required />
          </Campo>
          <Campo etiqueta="Apellidos" requerido>
            <input value={f.apellidos} onChange={set('apellidos')} placeholder="Ej. Quispe Torres" required />
          </Campo>
          <Campo etiqueta="Correo institucional" requerido ancho ayuda="Con este correo iniciará sesión">
            <InputPrefijo icono="correo" type="email" value={f.correo} onChange={set('correo')} placeholder="nombre.apellido@bbva.pe" required />
          </Campo>
        </SeccionForm>

        <SeccionForm titulo="Rol y permisos" icono="llave" columnas={1}>
          <Opciones nombre="rol" opciones={ROLES} valor={f.rol} alCambiar={(v) => setF({ ...f, rol: v })} columnas={2} />
        </SeccionForm>

        {!usuario && (
          <SeccionForm titulo="Acceso" icono="candado" columnas={1}>
            <CampoPassword etiqueta="Contraseña inicial" valor={f.password} alCambiar={(v) => setF({ ...f, password: v })}
              ayuda="Compártela con el usuario por un medio seguro. Podrá cambiarla desde «Mi cuenta»." />
          </SeccionForm>
        )}

        <PieModal alCancelar={alCerrar} enviando={enviando} texto={usuario ? 'Guardar cambios' : 'Crear usuario'}
          deshabilitado={!usuario && !passwordValida(f.password)} />
      </form>
    </Modal>
  )
}

function FormPassword({ usuario, alCerrar, alGuardar }) {
  const [nuevaPassword, setNueva] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await api.patch(`/api/usuarios/${usuario.id}/password`, { nuevaPassword })
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Restablecer contraseña" subtitulo={`${usuario.nombres} ${usuario.apellidos} · ${usuario.correo}`}
      icono="llave" tono="naranja" abierto alCerrar={alCerrar} ancho={520}>
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>
        <CampoPassword etiqueta="Nueva contraseña" valor={nuevaPassword} alCambiar={setNueva} />
        <div className="nota nota-alerta">
          <Icono nombre="alerta" size={16} />
          <span>Se cerrarán todas sus sesiones abiertas y deberá ingresar con la nueva contraseña.</span>
        </div>
        <PieModal alCancelar={alCerrar} enviando={enviando} texto="Restablecer" icono="llave" deshabilitado={!passwordValida(nuevaPassword)} />
      </form>
    </Modal>
  )
}
