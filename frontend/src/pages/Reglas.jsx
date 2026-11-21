import { useState } from 'react'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { Aviso, Badge, Campo, Encabezado, InputPrefijo, Interruptor, Modal, PieModal, SeccionForm, TablaCargando, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'

/** Reglas configurables del motor de riesgo (se combinan con el score de la IA). */
export default function Reglas() {
  const { tieneRol } = useAuth()
  const { datos, cargando, error, recargar } = useApi('/api/reglas')
  const tipos = useApi('/api/reglas/tipos')
  const [editando, setEditando] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)
  const puedeEditar = tieneRol(...PERMISOS.editarReglas)
  const descripcionTipo = (t) => tipos.datos?.find((x) => x.tipo === t)?.descripcion || t

  async function alternar(r) {
    setErrorAccion(null)
    try {
      await api.patch(`/api/reglas/${r.id}/activa`, null, { params: { valor: !r.activa } })
      recargar()
    } catch (e) {
      setErrorAccion(mensajeError(e))
    }
  }

  return (
    <>
      <Encabezado titulo="Reglas del motor de riesgo" descripcion="Cada regla que se cumple suma su peso al score de reglas (máximo 1)">
        {puedeEditar && <button className="btn btn-primario" onClick={() => setEditando({})}>+ Nueva regla</button>}
      </Encabezado>
      <Aviso>{error || errorAccion}</Aviso>
      {cargando && !datos && <TablaCargando columnas={5} />}
      {datos && (
        <section className="panel sin-padding">
          {datos.length === 0 ? <Vacio /> : (
            <div className="tabla-scroll">
              <table className="tabla">
                <thead><tr><th>Regla</th><th>Tipo</th><th className="der">Umbral</th><th className="der">Peso</th><th>Estado</th>{puedeEditar && <th />}</tr></thead>
                <tbody>
                  {datos.map((r) => (
                    <tr key={r.id} className={r.activa ? '' : 'fila-inactiva'}>
                      <td><strong>{r.nombre}</strong>{r.descripcion && <div className="muted texto-pequeno">{r.descripcion}</div>}</td>
                      <td>{descripcionTipo(r.tipo)}</td>
                      <td className="der mono">{r.valorUmbral}</td>
                      <td className="der mono">{r.peso}</td>
                      <td><Badge valor={r.activa ? 'ACTIVA' : 'INACTIVO'} texto={r.activa ? 'Activa' : 'Inactiva'} /></td>
                      {puedeEditar && (
                        <td className="der nowrap">
                          <button className="btn btn-sec btn-sm" onClick={() => alternar(r)}>{r.activa ? 'Desactivar' : 'Activar'}</button>{' '}
                          <button className="btn btn-sec btn-sm" onClick={() => setEditando(r)}>Editar</button>
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
      {editando && <FormRegla regla={editando} tipos={tipos.datos || []} alCerrar={() => setEditando(null)} alGuardar={() => { setEditando(null); recargar() }} />}
    </>
  )
}

/** Cómo se interpreta el umbral de cada tipo (igual que ReglaFraudeService en el backend). */
const AYUDA_TIPO = {
  MONTO: { icono: 'transaccion', unidad: 'S/', prefijo: true, ejemplo: '5000', condicion: (u) => `el monto de la compra supere S/ ${u}` },
  RATIO_MONTO: { icono: 'actividad', unidad: 'veces', ejemplo: '3', condicion: (u) => `la compra sea más de ${u} veces el gasto promedio del cliente` },
  UBICACION: { icono: 'comercio', unidad: 'km', ejemplo: '300', condicion: (u) => `la compra se haga a más de ${u} km de su ciudad habitual` },
  FRECUENCIA: { icono: 'reloj', unidad: 'compras', ejemplo: '5', condicion: (u) => `la tarjeta tenga ${u} o más compras en la última hora` },
  HORARIO: { icono: 'reloj', unidad: 'h', ejemplo: '5', condicion: (u) => `la compra se haga antes de las ${u}:00 h` },
  COMERCIO_RIESGO: { icono: 'escudo-alerta', unidad: '0 a 1', ejemplo: '0.3', condicion: (u) => `el riesgo base de la categoría sea ${u} o más, o el comercio tenga riesgo alto/crítico` },
}

function FormRegla({ regla, tipos, alCerrar, alGuardar }) {
  const [f, setF] = useState({ nombre: '', descripcion: '', tipo: tipos[0]?.tipo || 'MONTO', valorUmbral: '', peso: '0.2', activa: true, ...regla })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const ayuda = AYUDA_TIPO[f.tipo] || {}
  const peso = Number(f.peso) || 0
  const nivelPeso = peso >= 0.5 ? 'rojo' : peso >= 0.3 ? 'naranja' : peso >= 0.15 ? 'amarillo' : 'verde'
  const umbral = f.valorUmbral === '' ? '…' : f.valorUmbral

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const body = { nombre: f.nombre, descripcion: f.descripcion, tipo: f.tipo, valorUmbral: Number(f.valorUmbral), peso, activa: f.activa }
    try {
      if (regla.id) await api.put(`/api/reglas/${regla.id}`, body)
      else await api.post('/api/reglas', body)
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={regla.id ? 'Editar regla' : 'Nueva regla'}
      subtitulo="Cada regla que se cumple suma su peso al score de reglas (máximo 1)"
      icono="regla" abierto alCerrar={alCerrar} ancho={640}
    >
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

        <SeccionForm titulo="Definición" icono="regla">
          <Campo etiqueta="Nombre de la regla" requerido ancho>
            <input value={f.nombre} onChange={set('nombre')} placeholder="Ej. Compra de monto elevado" autoFocus required />
          </Campo>
          <Campo etiqueta="Tipo de regla" requerido ancho>
            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value, valorUmbral: '' })}>
              {tipos.map((t) => <option key={t.tipo} value={t.tipo}>{t.descripcion}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Valor umbral" requerido ancho>
            <InputPrefijo
              icono={ayuda.icono}
              prefijo={ayuda.prefijo ? ayuda.unidad : undefined}
              sufijo={!ayuda.prefijo ? ayuda.unidad : undefined}
              type="number" step="any" value={f.valorUmbral} onChange={set('valorUmbral')}
              placeholder={ayuda.ejemplo ? `Ej. ${ayuda.ejemplo}` : ''} required
            />
          </Campo>
          {ayuda.condicion && (
            <div className="nota nota-info campo-ancho">
              <Icono nombre="ia" size={16} />
              <span>
                Se cumple cuando <strong>{ayuda.condicion(umbral)}</strong>.
              </span>
            </div>
          )}
        </SeccionForm>

        <SeccionForm titulo="Impacto en el score" icono="actividad" columnas={1}>
          <div className="campo">
            <span className="campo-etiqueta">
              Peso <span className="campo-requerido">*</span>
              <span className={`peso-valor peso-${nivelPeso}`}>+{peso.toFixed(2)}</span>
            </span>
            <div className="peso-control">
              <input type="range" min="0" max="1" step="0.01" value={peso} onChange={set('peso')}
                style={{ '--pct': `${peso * 100}%` }} className={`rango rango-${nivelPeso}`} aria-label="Peso" />
              <input type="number" min="0" max="1" step="0.01" value={f.peso} onChange={set('peso')} className="peso-numero" required aria-label="Peso exacto" />
            </div>
            <span className="campo-ayuda">
              Si se cumple, suma <strong>{Math.round(peso * 100)} puntos</strong> de 100 al score de reglas.
            </span>
          </div>
          <Campo etiqueta="Descripción" opcional extra={`${(f.descripcion || '').length}/300`}>
            <textarea value={f.descripcion || ''} onChange={set('descripcion')} rows={2} maxLength={300}
              placeholder="Explica para qué sirve la regla (se muestra en la tabla)" />
          </Campo>
          <Interruptor activo={f.activa} alCambiar={(v) => setF({ ...f, activa: v })} titulo="Regla activa"
            descripcion={f.activa ? 'Se evaluará en cada transacción nueva' : 'Quedará guardada pero no se evaluará'} />
        </SeccionForm>

        <PieModal alCancelar={alCerrar} enviando={enviando} texto={regla.id ? 'Guardar cambios' : 'Crear regla'} />
      </form>
    </Modal>
  )
}
