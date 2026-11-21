import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { Aviso, Badge, Campo, Encabezado, Modal, Opciones, PieModal, SeccionForm, SelectEnum, TablaCargando, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, fechaHora, moneda } from '../utils/formato'

/** Casos de investigación: agrupan varias alertas relacionadas (por ejemplo, del mismo cliente). */
export default function Casos() {
  const navigate = useNavigate()
  const { tieneRol } = useAuth()
  const puedeGestionar = tieneRol(...PERMISOS.gestionarCaso)
  // Filtros en la URL: /casos?q=12345678 sirve para abrir directamente los casos de un cliente
  const [sp, setSp] = useSearchParams()
  const estado = sp.get('estado') || ''
  const q = sp.get('q') || ''
  const [texto, setTexto] = useState(q)
  const [creando, setCreando] = useState(false)
  const { datos, cargando, error } = useApi('/api/casos', { estado, q })

  useEffect(() => setTexto(q), [q])
  // Busca al dejar de escribir (no en cada tecla)
  useEffect(() => {
    if (texto === q) return undefined
    const t = setTimeout(() => cambiar({ q: texto }), 350)
    return () => clearTimeout(t)
  }, [texto]) // eslint-disable-line react-hooks/exhaustive-deps

  function cambiar(cambios) {
    const nuevo = new URLSearchParams(sp)
    Object.entries(cambios).forEach(([k, v]) => (v ? nuevo.set(k, v) : nuevo.delete(k)))
    setSp(nuevo, { replace: true })
  }

  return (
    <>
      <Encabezado titulo="Casos de investigación"
        descripcion={puedeGestionar ? 'Agrupa alertas relacionadas para investigarlas juntas' : 'Consulta el estado de las investigaciones cuando un cliente pregunte por ellas'}>
        {puedeGestionar && <button className="btn btn-primario" onClick={() => setCreando(true)}>+ Nuevo caso</button>}
      </Encabezado>
      {!puedeGestionar && (
        <div className="nota nota-info nota-pagina">
          <Icono nombre="ojo" size={16} />
          <span><strong>Modo consulta.</strong> Puedes ver los casos y sus alertas para informar al cliente; solo el equipo de fraude los modifica.</span>
        </div>
      )}
      <div className="filtros">
        <span className="input-prefijo filtro-buscar">
          <span className="input-prefijo-icono"><Icono nombre="buscar" size={16} /></span>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por código, título, cliente o DNI" aria-label="Buscar casos" />
        </span>
        <SelectEnum valores={ENUMS.estadoCaso} valor={estado} alCambiar={(v) => cambiar({ estado: v })} todos="Todos los estados" aria-label="Estado" />
      </div>
      <Aviso>{error}</Aviso>
      {cargando && !datos && <TablaCargando columnas={7} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? (
            (q || estado) ? (
              <Vacio icono="buscar" titulo="Sin resultados"
                accion={<button className="btn btn-sec btn-sm" onClick={() => { setTexto(''); cambiar({ q: '', estado: '' }) }}>Limpiar filtros</button>}>
                {q ? <>No hay casos que coincidan con «{q}».</> : 'No hay casos con ese estado.'}
              </Vacio>
            ) : <Vacio icono="caso" titulo="No hay casos">Todavía no se abrió ninguna investigación.</Vacio>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Código</th><th>Título</th><th>Cliente</th><th>Responsable</th><th>Prioridad</th><th>Estado</th><th>Creado</th></tr></thead>
                <tbody>
                  {datos.map((c) => (
                    <tr key={c.id} className="fila-click" onClick={() => navigate(`/casos/${c.id}`)}>
                      <td className="mono">{c.codigo}</td>
                      <td><strong>{c.titulo}</strong></td>
                      <td>{c.cliente ? <>{c.cliente.nombres} {c.cliente.apellidos}<br /><small className="muted">DNI {c.cliente.dni}</small></> : '—'}</td>
                      <td>{c.responsable ? `${c.responsable.nombres} ${c.responsable.apellidos}` : '—'}</td>
                      <td><Badge valor={c.prioridad} /></td>
                      <td><Badge valor={c.estado} /></td>
                      <td>{fechaHora(c.fechaCreacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {puedeGestionar && <FormCaso abierto={creando} alCerrar={() => setCreando(false)} alGuardar={(c) => navigate(`/casos/${c.id}`)} />}
    </>
  )
}

const PRIORIDADES = [
  { valor: 'BAJA', texto: 'Baja', tono: 'verde' },
  { valor: 'MEDIA', texto: 'Media', tono: 'amarillo' },
  { valor: 'ALTA', texto: 'Alta', tono: 'naranja' },
  { valor: 'URGENTE', texto: 'Urgente', tono: 'rojo' },
]

export function FormCaso({ abierto, alCerrar, alGuardar, alertaInicial, clienteId }) {
  const [f, setF] = useState({ titulo: '', descripcion: '', prioridad: 'MEDIA' })
  const [alertaIds, setAlertaIds] = useState(alertaInicial ? [alertaInicial] : [])
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { data } = await api.post('/api/casos', { titulo: f.titulo, descripcion: f.descripcion, prioridad: f.prioridad, alertaIds, clienteId })
      alGuardar(data)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Nuevo caso de investigación" subtitulo="Agrupa alertas relacionadas para investigarlas juntas"
      icono="caso" abierto={abierto} alCerrar={alCerrar} ancho={700}>
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

        <SeccionForm titulo="Datos del caso" icono="caso" columnas={1}>
          <Campo etiqueta="Título" requerido extra={`${f.titulo.length}/150`}>
            <input value={f.titulo} onChange={set('titulo')} maxLength={150} placeholder="Ej. Compras no reconocidas en e-commerce" autoFocus required />
          </Campo>
          <Opciones etiqueta="Prioridad" nombre="prioridad" opciones={PRIORIDADES} valor={f.prioridad}
            alCambiar={(v) => setF({ ...f, prioridad: v })} />
          <Campo etiqueta="Descripción" opcional extra={`${f.descripcion.length}/1000`}>
            <textarea value={f.descripcion} onChange={set('descripcion')} rows={3} maxLength={1000}
              placeholder="Qué se sabe hasta ahora y qué se va a investigar" />
          </Campo>
        </SeccionForm>

        <SeccionForm titulo="Alertas vinculadas" icono="alerta" columnas={1}>
          <SelectorAlertas abierto={abierto} seleccion={alertaIds} alCambiar={setAlertaIds} clienteId={clienteId} />
        </SeccionForm>

        <PieModal alCancelar={alCerrar} enviando={enviando} icono="caso"
          texto={alertaIds.length ? `Crear caso con ${alertaIds.length} alerta${alertaIds.length === 1 ? '' : 's'}` : 'Crear caso'} />
      </form>
    </Modal>
  )
}

/**
 * Lista de alertas activas con casillas y buscador (por código, cliente o últimos dígitos de la tarjeta),
 * para no tener que escribir IDs. Las alertas del mismo cliente del caso aparecen primero.
 * Con "unica" se elige solo una (se usa en el detalle del caso).
 */
export function SelectorAlertas({ abierto, seleccion, alCambiar, clienteId, unica = false, excluir = [] }) {
  const activas = useApi(abierto ? '/api/alertas/cola' : null, { size: 200 })
  const [filtro, setFiltro] = useState('')

  const texto = filtro.trim().toLowerCase()
  const lista = (activas.datos?.content || [])
    .filter((a) => !excluir.includes(a.id))
    .filter((a) => !a.caso || seleccion.includes(a.id))
    .filter((a) => {
      if (!texto) return true
      const c = a.transaccion?.tarjeta?.cliente
      return [a.codigo, c?.nombres, c?.apellidos, c?.dni, a.transaccion?.tarjeta?.ultimosDigitos]
        .some((v) => v && String(v).toLowerCase().includes(texto))
    })
    .sort((x, y) => {
      const mismo = (a) => (clienteId && a.transaccion?.tarjeta?.cliente?.id === clienteId ? 0 : 1)
      return mismo(x) - mismo(y)
    })

  const alternar = (id) => {
    if (unica) alCambiar([id])
    else alCambiar(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id])
  }

  return (
    <div className="campo">
      {!unica && (
        <span className="campo-etiqueta">
          Selecciona las alertas <span className="campo-opcional">(opcional)</span>
          {seleccion.length > 0 && <span className="campo-extra"><span className="perfil-contador">{seleccion.length}</span></span>}
        </span>
      )}
      <div className="selector-buscable">
        <span className="input-prefijo">
          <span className="input-prefijo-icono"><Icono nombre="buscar" size={16} /></span>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por código, cliente, DNI o últimos 4 dígitos…" aria-label="Buscar alerta" />
        </span>
        <ul role="listbox" aria-multiselectable={!unica}>
          {activas.cargando && !activas.datos && <li className="selector-vacio">Cargando alertas…</li>}
          {activas.error && <li className="selector-vacio campo-error">{activas.error}</li>}
          {activas.datos && lista.length === 0 && <li className="selector-vacio">No hay alertas activas que coincidan</li>}
          {lista.map((a) => {
            const c = a.transaccion?.tarjeta?.cliente
            const sel = seleccion.includes(a.id)
            const mismoCliente = clienteId && c?.id === clienteId
            return (
              <li key={a.id} role="option" aria-selected={sel}>
                <button type="button" className={`selector-alerta ${sel ? 'sel' : ''}`} onClick={() => alternar(a.id)}>
                  <span className={`selector-check ${unica ? 'radio' : ''}`}>{sel && <Icono nombre="check" size={12} />}</span>
                  <span className={`prioridad-marca marca-${a.nivelRiesgo}`} />
                  <span className="selector-alerta-datos">
                    <span className="selector-titulo">
                      <span className="mono">{a.codigo}</span> · {c?.nombres} {c?.apellidos}
                      {mismoCliente && <span className="etiqueta-mini">Mismo cliente</span>}
                    </span>
                    <span className="selector-sub">****{a.transaccion?.tarjeta?.ultimosDigitos} · {a.transaccion?.comercio?.nombre || '—'}</span>
                  </span>
                  <span className="selector-alerta-fin">
                    <strong>{moneda(a.transaccion?.monto)}</strong>
                    <Badge valor={a.nivelRiesgo} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {!unica && <span className="campo-ayuda">También puedes agregar alertas después, desde el detalle del caso.</span>}
    </div>
  )
}
