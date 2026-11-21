import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { Aviso, Badge, Campo, Encabezado, InputPrefijo, Modal, Opciones, PieModal, SeccionForm, TablaCargando, Vacio, useConfirmar } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, etiqueta, fechaHora } from '../utils/formato'

/** Tarjetas, comercios, IPs o dispositivos bloqueados: si una compra coincide, el score sube a 0.99. */
export default function ListaNegra() {
  const { tieneRol } = useAuth()
  const { datos, cargando, error, recargar } = useApi('/api/lista-negra')
  const [agregando, setAgregando] = useState(false)
  const [errorAccion, setErrorAccion] = useState(null)
  const puedeAgregar = tieneRol(...PERMISOS.agregarListaNegra)
  const puedeDesactivar = tieneRol(...PERMISOS.desactivarListaNegra)
  const puedeGestionar = tieneRol(...PERMISOS.gestionarListaNegra)
  const [confirmar, dialogo] = useConfirmar()

  async function ejecutar(peticion) {
    setErrorAccion(null)
    try {
      await peticion()
      recargar()
    } catch (e) {
      setErrorAccion(mensajeError(e))
    }
  }

  return (
    <>
      <Encabezado titulo="Lista negra" descripcion="Cualquier compra que coincida se marca con riesgo crítico">
        {puedeAgregar && <button className="btn btn-primario" onClick={() => setAgregando(true)}>+ Agregar</button>}
      </Encabezado>
      <Aviso>{error || errorAccion}</Aviso>
      {cargando && !datos && <TablaCargando columnas={6} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? <Vacio>La lista negra está vacía</Vacio> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Tipo</th><th>Valor</th><th>Motivo</th><th>Vence</th><th>Estado</th><th>Agregado</th>{puedeDesactivar && <th />}</tr></thead>
                <tbody>
                  {datos.map((l) => (
                    <tr key={l.id} className={l.activo ? '' : 'fila-inactiva'}>
                      <td>{etiqueta(l.tipo)}</td>
                      <td className="mono">{l.valor}</td>
                      <td>{l.motivo || '—'}</td>
                      <td>{l.fechaExpiracion ? fechaHora(l.fechaExpiracion) : 'Permanente'}</td>
                      <td><Badge valor={l.activo ? 'ACTIVO' : 'INACTIVO'} /></td>
                      <td>{fechaHora(l.fechaCreacion)}</td>
                      {puedeDesactivar && (
                        <td className="der nowrap">
                          {l.activo && <button className="btn btn-sec btn-sm" onClick={async () => (await confirmar({ titulo: '¿Desactivar este registro?', mensaje: `Las compras que coincidan con ${l.valor} dejarán de marcarse como críticas.`, textoOk: 'Desactivar', tono: 'primario', icono: 'prohibido' })) && ejecutar(() => api.patch(`/api/lista-negra/${l.id}/desactivar`))}>Desactivar</button>}{' '}
                          {puedeGestionar && <button className="btn btn-peligro-sec btn-sm" onClick={async () => (await confirmar({ titulo: '¿Eliminar este registro?', mensaje: 'Se borrará de forma permanente de la lista negra. Si solo quieres dejar de aplicarlo, usa «Desactivar».', textoOk: 'Eliminar', icono: 'basura' })) && ejecutar(() => api.delete(`/api/lista-negra/${l.id}`))}>Eliminar</button>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {dialogo}
      {agregando && <FormListaNegra alCerrar={() => setAgregando(false)} alGuardar={() => { setAgregando(false); recargar() }} />}
    </>
  )
}

const TIPOS_LISTA = [
  { valor: 'TARJETA', texto: 'Tarjeta', descripcion: 'Una tarjeta concreta', icono: 'tarjeta' },
  { valor: 'COMERCIO', texto: 'Comercio', descripcion: 'Todo el establecimiento', icono: 'comercio' },
  { valor: 'IP', texto: 'Dirección IP', descripcion: 'Compras en línea', icono: 'actividad' },
  { valor: 'DISPOSITIVO', texto: 'Dispositivo', descripcion: 'Celular o computadora', icono: 'telefono' },
]
const VIGENCIAS = [
  { dias: '7', texto: '7 días' },
  { dias: '30', texto: '30 días' },
  { dias: '90', texto: '90 días' },
  { dias: '', texto: 'Permanente' },
]
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

/** Lista con buscador para elegir una tarjeta o un comercio. */
function SelectorBuscable({ items, valor, alCambiar, cargando, placeholder, vacio }) {
  const [q, setQ] = useState('')
  const filtro = q.trim().toLowerCase()
  const visibles = items.filter((i) => !filtro || i.buscar.includes(filtro)).slice(0, 50)
  return (
    <div className="selector-buscable">
      <InputPrefijo icono="buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <ul role="listbox">
        {cargando && <li className="selector-vacio">Cargando…</li>}
        {!cargando && visibles.length === 0 && <li className="selector-vacio">{vacio}</li>}
        {visibles.map((i) => (
          <li key={i.id} role="option" aria-selected={String(i.id) === String(valor)}>
            <button type="button" className={String(i.id) === String(valor) ? 'sel' : ''} onClick={() => alCambiar(String(i.id))}>
              <span className="selector-titulo">{i.titulo}</span>
              <span className="selector-sub">{i.sub}</span>
              {String(i.id) === String(valor) && <Icono nombre="check" size={16} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FormListaNegra({ alCerrar, alGuardar }) {
  const [f, setF] = useState({ tipo: 'TARJETA', valor: '', motivo: '', diasVigencia: '30' })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const tarjetas = useApi(f.tipo === 'TARJETA' ? '/api/tarjetas' : null)
  const comercios = useApi(f.tipo === 'COMERCIO' ? '/api/comercios' : null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const itemsTarjetas = (tarjetas.datos || []).map((t) => {
    const cliente = `${t.cliente?.nombres || ''} ${t.cliente?.apellidos || ''}`.trim()
    return { id: t.id, titulo: t.numeroEnmascarado, sub: `${cliente} · ${etiqueta(t.tipo)} · ${etiqueta(t.estado)}`, buscar: `${t.numeroEnmascarado} ${cliente} ${t.cliente?.dni || ''}`.toLowerCase() }
  })
  const itemsComercios = (comercios.datos || []).map((c) => ({
    id: c.id, titulo: c.nombre, sub: `${etiqueta(c.categoria)} · ${c.ciudad}`, buscar: `${c.nombre} ${c.ciudad}`.toLowerCase(),
  }))

  const errorIp = f.tipo === 'IP' && f.valor && !IPV4.test(f.valor.trim()) ? 'Ingresa una IPv4 válida, ej. 190.12.45.8' : null
  const vigenciaPropia = !VIGENCIAS.some((v) => v.dias === f.diasVigencia)
  const vence = f.diasVigencia
    ? new Date(Date.now() + Number(f.diasVigencia) * 86400000).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  async function enviar(e) {
    e.preventDefault()
    if (!f.valor) {
      setError('Selecciona qué quieres bloquear')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await api.post('/api/lista-negra', {
        ...f, valor: f.valor.trim(), motivo: f.motivo || null, diasVigencia: f.diasVigencia ? Number(f.diasVigencia) : null,
      })
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo="Agregar a la lista negra"
      subtitulo="Bloquea una tarjeta, comercio, IP o dispositivo sospechoso"
      icono="prohibido" tono="rojo" abierto alCerrar={alCerrar} ancho={680}
    >
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

        <SeccionForm titulo="¿Qué quieres bloquear?" icono="prohibido" columnas={1}>
          <Opciones nombre="tipo" opciones={TIPOS_LISTA} valor={f.tipo} columnas={4}
            alCambiar={(v) => setF({ ...f, tipo: v, valor: '' })} />

          {/* Para tarjetas y comercios el backend guarda el ID; para IP y dispositivo, el texto */}
          {f.tipo === 'TARJETA' && (
            <div className="campo">
              <span className="campo-etiqueta">Tarjeta <span className="campo-requerido">*</span></span>
              <SelectorBuscable items={itemsTarjetas} valor={f.valor} alCambiar={(v) => setF({ ...f, valor: v })}
                cargando={tarjetas.cargando} placeholder="Buscar por últimos dígitos, cliente o DNI" vacio="No se encontraron tarjetas" />
            </div>
          )}
          {f.tipo === 'COMERCIO' && (
            <div className="campo">
              <span className="campo-etiqueta">Comercio <span className="campo-requerido">*</span></span>
              <SelectorBuscable items={itemsComercios} valor={f.valor} alCambiar={(v) => setF({ ...f, valor: v })}
                cargando={comercios.cargando} placeholder="Buscar por nombre o ciudad" vacio="No se encontraron comercios" />
            </div>
          )}
          {f.tipo === 'IP' && (
            <Campo etiqueta="Dirección IP" requerido error={errorIp}>
              <InputPrefijo icono="actividad" value={f.valor} onChange={set('valor')} placeholder="190.12.45.8" className="mono" autoFocus required />
            </Campo>
          )}
          {f.tipo === 'DISPOSITIVO' && (
            <Campo etiqueta="Identificador del dispositivo" requerido ayuda="El ID que aparece en el detalle de la transacción">
              <InputPrefijo icono="telefono" value={f.valor} onChange={set('valor')} placeholder="Ej. a3f9-77c1-…" className="mono" autoFocus required />
            </Campo>
          )}
        </SeccionForm>

        <SeccionForm titulo="Vigencia y motivo" icono="reloj" columnas={1}>
          <div className="campo">
            <span className="campo-etiqueta">Duración del bloqueo</span>
            <div className="chips">
              {VIGENCIAS.map((v) => (
                <button type="button" key={v.texto} className={`chip ${f.diasVigencia === v.dias ? 'sel' : ''}`}
                  onClick={() => setF({ ...f, diasVigencia: v.dias })}>
                  {v.texto}
                </button>
              ))}
              <span className={`chip chip-input ${vigenciaPropia ? 'sel' : ''}`}>
                <input type="number" min="1" placeholder="Otro" value={vigenciaPropia ? f.diasVigencia : ''}
                  onChange={(e) => setF({ ...f, diasVigencia: e.target.value })} aria-label="Días personalizados" />
                días
              </span>
            </div>
            <span className="campo-ayuda">{vence ? `Dejará de aplicarse el ${vence}.` : 'Seguirá activo hasta que alguien lo desactive.'}</span>
          </div>
          <Campo etiqueta="Motivo" opcional extra={`${f.motivo.length}/300`}>
            <textarea value={f.motivo} onChange={set('motivo')} rows={2} maxLength={300}
              placeholder="Ej. Fraude confirmado en la alerta ALR-2026-0012" />
          </Campo>
        </SeccionForm>

        <div className="nota nota-peligro">
          <Icono nombre="escudo-alerta" size={16} />
          <span>
            Toda compra que coincida se marcará con <strong>riesgo crítico (99%)</strong>.
          </span>
        </div>

        <PieModal alCancelar={alCerrar} enviando={enviando} texto="Agregar a la lista negra" icono="prohibido" tono="peligro"
          deshabilitado={!f.valor || !!errorIp} />
      </form>
    </Modal>
  )
}
