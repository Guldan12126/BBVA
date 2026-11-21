import { useRef, useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { BotonVerPassword } from '../components/PantallaAcceso'
import { Aviso, Badge, Encabezado, Modal } from '../components/UI'
import { MENU } from '../menu'
import { etiqueta, fecha, fechaHora } from '../utils/formato'

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
const MAX_ARCHIVO_MB = 5
const LADO_FOTO = 320 // px: la foto se recorta en cuadrado y se reduce a este tamaño

/** Recorta la imagen al centro en cuadrado y la reduce para que pese poco (~30 KB). */
function prepararImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      const lado = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = LADO_FOTO
      canvas.height = LADO_FOTO
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

/** Mismas reglas que @PasswordSegura en el backend. */
const REQUISITOS = [
  { texto: 'Mínimo 8 caracteres', ok: (p) => p.length >= 8 },
  { texto: 'Una letra mayúscula', ok: (p) => /[A-Z]/.test(p) },
  { texto: 'Una letra minúscula', ok: (p) => /[a-z]/.test(p) },
  { texto: 'Un número', ok: (p) => /\d/.test(p) },
]
const NIVELES = [
  { texto: 'Muy débil', tono: 'rojo' },
  { texto: 'Débil', tono: 'rojo' },
  { texto: 'Regular', tono: 'naranja' },
  { texto: 'Buena', tono: 'amarillo' },
  { texto: 'Segura', tono: 'verde' },
]

function Avatar({ foto, iniciales, tamano = 112 }) {
  return (
    <span className="perfil-avatar" style={{ width: tamano, height: tamano, fontSize: tamano * 0.36 }}>
      {foto ? <img src={foto} alt="Foto de perfil" /> : iniciales}
    </span>
  )
}

/** Página "Mi cuenta": foto, datos del usuario, accesos de su rol y cambio de contraseña. */
export default function Perfil() {
  const { usuario, foto, setFoto } = useAuth()
  const iniciales = `${usuario.nombres?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase()

  // ---------- Foto de perfil ----------
  const inputArchivo = useRef(null)
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [guardandoFoto, setGuardandoFoto] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [avisoFoto, setAvisoFoto] = useState(null) // { tipo, texto }

  async function elegirArchivo(archivo) {
    if (!archivo) return
    setAvisoFoto(null)
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      setAvisoFoto({ tipo: 'error', texto: 'Formato no permitido. Usa una imagen JPG, PNG o WEBP.' })
      return
    }
    if (archivo.size > MAX_ARCHIVO_MB * 1024 * 1024) {
      setAvisoFoto({ tipo: 'error', texto: `La imagen supera los ${MAX_ARCHIVO_MB} MB.` })
      return
    }
    try {
      setVistaPrevia(await prepararImagen(archivo))
    } catch (e) {
      setAvisoFoto({ tipo: 'error', texto: e.message })
    }
  }

  async function guardarFoto(valor) {
    setGuardandoFoto(true)
    setAvisoFoto(null)
    try {
      const { data } = await api.put('/api/auth/me/foto', { foto: valor })
      setFoto(data.foto || null)
      setVistaPrevia(null)
      setAvisoFoto({ tipo: 'ok', texto: valor ? 'Tu foto de perfil se actualizó.' : 'Se quitó tu foto de perfil.' })
    } catch (e) {
      setAvisoFoto({ tipo: 'error', texto: mensajeError(e) })
    } finally {
      setGuardandoFoto(false)
    }
  }

  function soltar(e) {
    e.preventDefault()
    setArrastrando(false)
    elegirArchivo(e.dataTransfer.files?.[0])
  }

  // ---------- Contraseña ----------
  const vacio = { passwordActual: '', nuevaPassword: '', confirmarPassword: '' }
  const [form, setForm] = useState(vacio)
  const [ver, setVer] = useState({ actual: false, nueva: false, confirmar: false })
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  const alternar = (campo) => (fn) => setVer((v) => ({ ...v, [campo]: fn(v[campo]) }))
  const cumplidos = REQUISITOS.filter((r) => r.ok(form.nuevaPassword)).length
  const nivel = NIVELES[form.nuevaPassword ? cumplidos : 0]
  const coinciden = form.confirmarPassword && form.confirmarPassword === form.nuevaPassword
  const valido = form.passwordActual && cumplidos === REQUISITOS.length && coinciden

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setEnviando(true)
    try {
      const { data } = await api.post('/api/auth/cambiar-password', form)
      setOk(data.mensaje)
      setForm(vacio)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  // ---------- Accesos del rol ----------
  const modulos = MENU.filter((m) => !m.grupo && m.roles.includes(usuario.rol))

  return (
    <>
      <Encabezado titulo="Mi cuenta" descripcion="Administra tu información personal, tu foto y la seguridad de tu acceso" />

      {/* Tarjeta principal con la foto */}
      <section className="panel sin-padding perfil-hero">
        <div className="perfil-portada" aria-hidden="true" />
        <div className="perfil-hero-cuerpo">
          <div
            className={`perfil-foto ${arrastrando ? 'arrastrando' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setArrastrando(true)
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
          >
            <Avatar foto={foto} iniciales={iniciales} />
            <button
              type="button"
              className="perfil-foto-boton"
              onClick={() => inputArchivo.current?.click()}
              title="Cambiar foto"
              aria-label="Cambiar foto de perfil"
            >
              <Icono nombre="camara" size={16} />
            </button>
            <input
              ref={inputArchivo}
              type="file"
              accept={TIPOS_IMAGEN.join(',')}
              hidden
              onChange={(e) => {
                elegirArchivo(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>

          <div className="perfil-identidad">
            <h2>
              {usuario.nombres} {usuario.apellidos}
            </h2>
            <div className="perfil-meta">
              <Badge valor="ACTIVO" texto={etiqueta(usuario.rol)} />
              <span className="perfil-meta-item">
                <Icono nombre="correo" size={15} /> {usuario.correo}
              </span>
              {usuario.ultimoAcceso && (
                <span className="perfil-meta-item">
                  <Icono nombre="reloj" size={15} /> Último acceso: {fechaHora(usuario.ultimoAcceso)}
                </span>
              )}
            </div>
          </div>

          <div className="perfil-hero-acciones">
            <button type="button" className="btn btn-primario" onClick={() => inputArchivo.current?.click()}>
              <Icono nombre="subir" size={16} /> {foto ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {foto && (
              <button type="button" className="btn btn-sec" disabled={guardandoFoto} onClick={() => guardarFoto(null)}>
                <Icono nombre="basura" size={16} /> Quitar
              </button>
            )}
          </div>
        </div>
        <div className="perfil-hero-pie">
          {avisoFoto ? (
            <Aviso tipo={avisoFoto.tipo} alCerrar={() => setAvisoFoto(null)}>
              {avisoFoto.texto}
            </Aviso>
          ) : (
            <span className="muted texto-pequeno">
              JPG, PNG o WEBP de hasta {MAX_ARCHIVO_MB} MB. También puedes arrastrar la imagen sobre tu foto. Se recorta
              en cuadrado automáticamente.
            </span>
          )}
        </div>
      </section>

      <div className="grid-2 perfil-grid">
        <div className="perfil-columna">
          <section className="panel">
            <div className="panel-titulo">
              <div>
                <h2>Información de la cuenta</h2>
                <p className="panel-sub">Estos datos los gestiona el administrador del sistema</p>
              </div>
            </div>
            <ul className="perfil-datos">
              <li>
                <span className="perfil-dato-icono"><Icono nombre="cliente" size={16} /></span>
                <span><small>Nombre completo</small>{usuario.nombres} {usuario.apellidos}</span>
              </li>
              <li>
                <span className="perfil-dato-icono"><Icono nombre="correo" size={16} /></span>
                <span><small>Correo institucional</small>{usuario.correo}</span>
              </li>
              <li>
                <span className="perfil-dato-icono"><Icono nombre="auditoria" size={16} /></span>
                <span><small>Rol</small>{etiqueta(usuario.rol)}</span>
              </li>
              <li>
                <span className="perfil-dato-icono"><Icono nombre="reloj" size={16} /></span>
                <span><small>Último acceso</small>{fechaHora(usuario.ultimoAcceso)}</span>
              </li>
              {usuario.fechaCreacion && (
                <li>
                  <span className="perfil-dato-icono"><Icono nombre="calendario" size={16} /></span>
                  <span><small>Miembro desde</small>{fecha(usuario.fechaCreacion)}</span>
                </li>
              )}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-titulo">
              <div>
                <h2>Accesos de tu rol</h2>
                <p className="panel-sub">Módulos disponibles para {etiqueta(usuario.rol).toLowerCase()}</p>
              </div>
              <span className="perfil-contador">{modulos.length}</span>
            </div>
            <div className="perfil-modulos">
              {modulos.map((m) => (
                <span key={m.ruta} className="perfil-modulo">
                  <Icono nombre={m.icono} size={15} /> {m.texto}
                </span>
              ))}
            </div>
          </section>
        </div>

        <form className="panel" onSubmit={enviar}>
          <div className="panel-titulo">
            <div>
              <h2>Seguridad</h2>
              <p className="panel-sub">Cambia tu contraseña. Se cerrará la sesión en tus otros dispositivos.</p>
            </div>
            <span className="perfil-escudo"><Icono nombre="candado" size={18} /></span>
          </div>

          <Aviso alCerrar={() => setError(null)}>{error}</Aviso>
          <Aviso tipo="ok" alCerrar={() => setOk(null)}>{ok}</Aviso>

          <label className="campo">
            <span className="campo-etiqueta">Contraseña actual</span>
            <div className="input-icono">
              <Icono nombre="candado" size={16} />
              <input type={ver.actual ? 'text' : 'password'} value={form.passwordActual} onChange={cambiar('passwordActual')}
                autoComplete="current-password" required />
              <BotonVerPassword visible={ver.actual} alCambiar={alternar('actual')} />
            </div>
          </label>

          <label className="campo">
            <span className="campo-etiqueta">Nueva contraseña</span>
            <div className="input-icono">
              <Icono nombre="llave" size={16} />
              <input type={ver.nueva ? 'text' : 'password'} value={form.nuevaPassword} onChange={cambiar('nuevaPassword')}
                autoComplete="new-password" required />
              <BotonVerPassword visible={ver.nueva} alCambiar={alternar('nueva')} />
            </div>
          </label>

          <div className="fuerza">
            <div className="fuerza-barras">
              {REQUISITOS.map((_, i) => (
                <span key={i} className={form.nuevaPassword && i < cumplidos ? `lleno fuerza-${nivel.tono}` : ''} />
              ))}
            </div>
            <span className={`fuerza-texto ${form.nuevaPassword ? `fuerza-${nivel.tono}` : ''}`}>
              {form.nuevaPassword ? nivel.texto : 'Ingresa una contraseña'}
            </span>
          </div>
          <ul className="requisitos">
            {REQUISITOS.map((r) => {
              const cumple = r.ok(form.nuevaPassword)
              return (
                <li key={r.texto} className={cumple ? 'ok' : ''}>
                  <Icono nombre={cumple ? 'check' : 'circulo'} size={15} /> {r.texto}
                </li>
              )
            })}
          </ul>

          <label className="campo">
            <span className="campo-etiqueta">Confirmar nueva contraseña</span>
            <div className="input-icono">
              <Icono nombre="llave" size={16} />
              <input type={ver.confirmar ? 'text' : 'password'} value={form.confirmarPassword} onChange={cambiar('confirmarPassword')}
                autoComplete="new-password" required />
              <BotonVerPassword visible={ver.confirmar} alCambiar={alternar('confirmar')} />
            </div>
            {form.confirmarPassword && !coinciden && <span className="campo-error">Las contraseñas no coinciden</span>}
          </label>

          <div className="perfil-form-pie">
            <button type="button" className="btn btn-sec" onClick={() => setForm(vacio)} disabled={enviando}>
              Limpiar
            </button>
            <button className="btn btn-primario" disabled={!valido || enviando}>
              {enviando ? 'Guardando…' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* Vista previa antes de guardar la foto */}
      <Modal titulo="Nueva foto de perfil" abierto={!!vistaPrevia} alCerrar={() => !guardandoFoto && setVistaPrevia(null)} ancho={460}>
        <div className="foto-previa">
          <Avatar foto={vistaPrevia} iniciales={iniciales} tamano={168} />
          <div className="foto-previa-mini">
            <Avatar foto={vistaPrevia} iniciales={iniciales} tamano={34} />
            <span>
              <strong>
                {usuario.nombres} {usuario.apellidos}
              </strong>
              <small className="muted">Así se verá en el menú</small>
            </span>
          </div>
        </div>
        <div className="modal-pie">
          <button type="button" className="btn btn-sec" onClick={() => inputArchivo.current?.click()} disabled={guardandoFoto}>
            Elegir otra
          </button>
          <button type="button" className="btn btn-primario" onClick={() => guardarFoto(vistaPrevia)} disabled={guardandoFoto}>
            {guardandoFoto ? 'Guardando…' : 'Guardar foto'}
          </button>
        </div>
      </Modal>
    </>
  )
}
