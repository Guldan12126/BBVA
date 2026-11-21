import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api, { mensajeError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icono from '../components/Icono'
import { Aviso, Badge, BarraRiesgo, Campo, Cargando, InputPrefijo, Modal, Opciones, PieModal, SeccionForm, SelectEnum, Vacio } from '../components/UI'
import useApi from '../hooks/useApi'
import { PERMISOS } from '../menu'
import { ENUMS, etiqueta, fechaHora, moneda, numero } from '../utils/formato'
import { FormCliente } from './Clientes'

const COLOR_NIVEL_TX = { BAJO: '#2e9d5b', MEDIO: '#d9a400', ALTO: '#e07b00', CRITICO: '#d0343c' }
const iniciales = (c) => `${c?.nombres?.[0] || ''}${c?.apellidos?.[0] || ''}`.toUpperCase()

/** Barra de 24 h con el horario habitual de compras resaltado. */
function HorarioHabitual({ inicio, fin }) {
  if (inicio == null || fin == null) return <span className="muted">—</span>
  const dentro = (h) => (inicio <= fin ? h >= inicio && h < fin : h >= inicio || h < fin)
  return (
    <div className="horario">
      <div className="horario-barra">
        {Array.from({ length: 24 }, (_, h) => <span key={h} className={dentro(h) ? 'on' : ''} title={`${h}:00`} />)}
      </div>
      <div className="horario-marcas"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>
    </div>
  )
}

/** Tarjeta visual (como la física) con su estado y acciones. */
function TarjetaVisual({ t, alBloquear, alDesbloquear }) {
  const bloqueada = t.estado === 'BLOQUEADA_TEMPORAL' || t.estado === 'BLOQUEADA'
  return (
    <div className={`tarjeta-item ${bloqueada ? 'bloqueada' : ''} ${t.estado === 'CANCELADA' ? 'cancelada' : ''}`}>
      <div className={`tarjeta-mini ${t.tipo === 'DEBITO' ? 'debito' : ''}`}>
        <div className="tarjeta-previa-fila">
          <span className="tarjeta-chip" />
          <span className="tarjeta-tipo">{etiqueta(t.tipo)}</span>
        </div>
        <div className="tarjeta-numero">{t.numeroEnmascarado}</div>
        <div className="tarjeta-previa-fila">
          <span><small>Vence</small>{t.fechaVencimiento || '—'}</span>
          {t.limiteCredito != null && <span className="der"><small>Límite</small>{moneda(t.limiteCredito)}</span>}
        </div>
        {bloqueada && <span className="tarjeta-sello"><Icono nombre="candado" size={14} /> Bloqueada</span>}
      </div>
      <div className="tarjeta-item-pie">
        <Badge valor={t.estado} />
        {t.estado === 'ACTIVA' && (
          <button className="btn btn-peligro-sec btn-sm" onClick={alBloquear}><Icono nombre="candado" size={14} /> Bloquear</button>
        )}
        {bloqueada && (
          <button className="btn btn-sec btn-sm" onClick={alDesbloquear}><Icono nombre="llave" size={14} /> Desbloquear</button>
        )}
      </div>
    </div>
  )
}

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tieneRol } = useAuth()
  const { datos: c, setDatos, cargando, error } = useApi(`/api/clientes/${id}`)
  const tarjetas = useApi(`/api/clientes/${id}/tarjetas`)
  const perfil = useApi(`/api/clientes/${id}/perfil`)
  const notificaciones = useApi(`/api/clientes/${id}/notificaciones`)
  const transacciones = useApi('/api/transacciones', { clienteId: id, size: 10 })
  const verCasos = tieneRol(...PERMISOS.verCasos)
  const casos = useApi(verCasos ? '/api/casos' : null, { clienteId: id })
  const [editando, setEditando] = useState(false)
  const [nuevaTarjeta, setNuevaTarjeta] = useState(false)
  const [bloqueo, setBloqueo] = useState(null) // { tarjeta, accion: 'bloquear' | 'desbloquear' }
  const [aviso, setAviso] = useState(null)
  const esAdmin = tieneRol(...PERMISOS.editarCatalogos)

  if (cargando && !c) return <Cargando />
  if (error) return <Aviso>{error}</Aviso>
  if (!c) return null
  const p = perfil.datos
  const txs = transacciones.datos?.content || []
  const listaTarjetas = tarjetas.datos || []
  const activas = listaTarjetas.filter((t) => t.estado === 'ACTIVA').length
  const bloqueadas = listaTarjetas.filter((t) => t.estado === 'BLOQUEADA' || t.estado === 'BLOQUEADA_TEMPORAL').length
  const riesgosas = txs.filter((t) => t.nivelRiesgo === 'ALTO' || t.nivelRiesgo === 'CRITICO').length
  const grafico = [...txs].reverse().map((t) => ({
    id: t.id, monto: Number(t.monto), nivel: t.nivelRiesgo, comercio: t.comercio?.nombre,
    dia: new Date(t.fechaHora).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
  }))

  return (
    <>
      <Link to="/clientes" className="volver"><Icono nombre="flecha-izq" size={16} /> Clientes</Link>
      <Aviso tipo="ok" alCerrar={() => setAviso(null)}>{aviso}</Aviso>

      {/* ---------- Ficha del cliente ---------- */}
      <section className="panel cliente-hero">
        <div className="cliente-identidad">
          <span className="cliente-avatar">{iniciales(c)}</span>
          <div className="cliente-nombre">
            <h1>{c.nombres} {c.apellidos}</h1>
            <div className="cliente-meta">
              <span className="chip-dato"><Icono nombre="documento" size={13} /> DNI {c.dni}</span>
              <span className="chip-dato"><Icono nombre="comercio" size={13} /> {c.ciudad}</span>
              {riesgosas > 0 && (
                <span className="chip-dato chip-alerta"><Icono nombre="alerta" size={13} /> {riesgosas} compras de riesgo alto recientes</span>
              )}
            </div>
          </div>
          {esAdmin && (
            <button className="btn btn-sec" onClick={() => setEditando(true)}><Icono nombre="regla" size={15} /> Editar datos</button>
          )}
        </div>

        <div className="cliente-contacto">
          <a href={c.telefono ? `tel:${c.telefono}` : undefined} className={`contacto-item ${c.telefono ? '' : 'vacio-dato'}`}>
            <span className="contacto-icono"><Icono nombre="telefono" size={16} /></span>
            <span><small>Teléfono</small>{c.telefono || 'No registrado'}</span>
          </a>
          <a href={c.correo ? `mailto:${c.correo}` : undefined} className={`contacto-item ${c.correo ? '' : 'vacio-dato'}`}>
            <span className="contacto-icono"><Icono nombre="correo" size={16} /></span>
            <span><small>Correo</small>{c.correo || 'No registrado (no recibe avisos)'}</span>
          </a>
          <div className={`contacto-item ${c.direccion ? '' : 'vacio-dato'}`}>
            <span className="contacto-icono"><Icono nombre="comercio" size={16} /></span>
            <span><small>Dirección</small>{c.direccion || 'No registrada'}</span>
          </div>
        </div>

        <div className="cliente-stats">
          <div><strong>{listaTarjetas.length}</strong><small>Tarjetas</small></div>
          <div><strong className="txt-verde">{activas}</strong><small>Activas</small></div>
          <div><strong className={bloqueadas ? 'txt-rojo' : ''}>{bloqueadas}</strong><small>Bloqueadas</small></div>
          <div><strong>{p ? numero(p.totalTransacciones) : '—'}</strong><small>Compras analizadas</small></div>
          <div><strong>{p ? moneda(p.montoPromedio) : '—'}</strong><small>Gasto promedio</small></div>
        </div>
      </section>

      <div className="dash-fila dash-fila-2-1">
        {/* ---------- Tarjetas ---------- */}
        <section className="panel">
          <div className="panel-titulo">
            <div>
              <h2>Tarjetas</h2>
              <p className="panel-sub">Solo se guardan los últimos 4 dígitos de cada tarjeta</p>
            </div>
            {esAdmin && <button className="btn btn-primario btn-sm" onClick={() => setNuevaTarjeta(true)}><Icono nombre="tarjeta" size={14} /> Agregar tarjeta</button>}
          </div>
          {listaTarjetas.length ? (
            <div className="tarjetas-grid">
              {listaTarjetas.map((t) => (
                <TarjetaVisual key={t.id} t={t}
                  alBloquear={() => setBloqueo({ tarjeta: t, accion: 'bloquear' })}
                  alDesbloquear={() => setBloqueo({ tarjeta: t, accion: 'desbloquear' })} />
              ))}
            </div>
          ) : (
            <Vacio icono="tarjeta" titulo="Sin tarjetas"
              accion={esAdmin && <button className="btn btn-primario btn-sm" onClick={() => setNuevaTarjeta(true)}>Agregar la primera tarjeta</button>}>
              Este cliente todavía no tiene tarjetas registradas.
            </Vacio>
          )}
        </section>

        {/* ---------- Perfil de comportamiento ---------- */}
        <section className="panel">
          <div className="panel-titulo">
            <div>
              <h2>Comportamiento habitual</h2>
              <p className="panel-sub">El modelo compara cada compra nueva con este perfil</p>
            </div>
          </div>
          {p ? (
            <>
              <div className="perfil-tiles">
                <div><small>Gasto promedio</small><strong>{moneda(p.montoPromedio)}</strong></div>
                <div><small>Compra más alta</small><strong>{moneda(p.montoMaximo)}</strong></div>
                <div><small>Ciudad habitual</small><strong>{p.ciudadHabitual || '—'}</strong></div>
                <div><small>Compras analizadas</small><strong>{numero(p.totalTransacciones)}</strong></div>
              </div>
              <div className="campo">
                <span className="campo-etiqueta">
                  Horario habitual <span className="campo-extra">{p.horaHabitualInicio}:00 a {p.horaHabitualFin}:00 h</span>
                </span>
                <HorarioHabitual inicio={p.horaHabitualInicio} fin={p.horaHabitualFin} />
              </div>
              <small className="muted">Actualizado {fechaHora(p.ultimaActualizacion)}</small>
            </>
          ) : <Vacio icono="actividad" titulo="Sin perfil todavía">Se crea automáticamente con su primera compra.</Vacio>}
        </section>
      </div>

      {/* ---------- Transacciones ---------- */}
      <section className="panel sin-padding">
        <div className="panel-cabecera">
          <div className="panel-titulo">
            <div>
              <h2>Últimas transacciones</h2>
              <p className="panel-sub">Monto de cada compra frente a su gasto promedio (línea punteada)</p>
            </div>
            <Link to={`/transacciones?clienteId=${id}`} className="btn btn-sec btn-sm">Ver todas <Icono nombre="flecha" size={14} /></Link>
          </div>
          {grafico.length > 1 && (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={grafico} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--borde)" />
                <XAxis dataKey="dia" fontSize={11} tick={{ fill: 'var(--texto-suave)' }} axisLine={false} tickLine={false} />
                <YAxis width={56} fontSize={11} tick={{ fill: 'var(--texto-suave)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `S/ ${v}`} />
                <Tooltip cursor={{ fill: 'var(--primario-claro)', opacity: 0.5 }}
                  contentStyle={{ background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 10, fontSize: 13 }}
                  formatter={(v, _, item) => [moneda(v), item?.payload?.comercio || 'Monto']} />
                {p?.montoPromedio != null && (
                  <ReferenceLine y={Number(p.montoPromedio)} stroke="var(--texto-suave)" strokeDasharray="4 4"
                    label={{ value: 'Promedio', position: 'insideTopRight', fontSize: 11, fill: 'var(--texto-suave)' }} />
                )}
                <Bar dataKey="monto" radius={[5, 5, 0, 0]} maxBarSize={34} onClick={(x) => navigate(`/transacciones/${x.id}`)} cursor="pointer">
                  {grafico.map((x) => <Cell key={x.id} fill={COLOR_NIVEL_TX[x.nivel] || '#1464a5'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {txs.length ? (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Código</th><th>Fecha</th><th>Comercio</th><th className="der">Monto</th><th>Probabilidad</th><th>Nivel</th><th>Estado</th></tr></thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className="fila-click" onClick={() => navigate(`/transacciones/${t.id}`)}>
                    <td className="mono">{t.codigo}</td>
                    <td className="nowrap">{fechaHora(t.fechaHora)}</td>
                    <td>{t.comercio?.nombre}</td>
                    <td className="der">{moneda(t.monto)}</td>
                    <td><BarraRiesgo valor={t.scoreRiesgo} /></td>
                    <td><Badge valor={t.nivelRiesgo} /></td>
                    <td><Badge valor={t.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Vacio icono="transaccion">Este cliente aún no tiene transacciones.</Vacio>}
      </section>

      {/* ---------- Casos de investigación ---------- */}
      {verCasos && (
        <section className="panel">
          <div className="panel-titulo">
            <div>
              <h2>Casos de investigación</h2>
              <p className="panel-sub">Investigaciones de fraude abiertas o cerradas sobre este cliente</p>
            </div>
            {casos.datos?.length > 0 && <span className="perfil-contador">{casos.datos.length}</span>}
          </div>
          {casos.datos?.length ? (
            <ul className="lista-casos">
              {casos.datos.map((k) => (
                <li key={k.id}>
                  <Link to={`/casos/${k.id}`} className="lista-casos-fila">
                    <span className="acceso-icono"><Icono nombre="caso" size={16} /></span>
                    <span className="lista-casos-datos">
                      <strong>{k.titulo}</strong>
                      <small className="muted"><span className="mono">{k.codigo}</span> · abierto {fechaHora(k.fechaCreacion)}{k.fechaCierre ? ` · cerrado ${fechaHora(k.fechaCierre)}` : ''}</small>
                    </span>
                    <Badge valor={k.prioridad} />
                    <Badge valor={k.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : casos.cargando ? null : <Vacio icono="caso">Este cliente no tiene casos de investigación.</Vacio>}
        </section>
      )}

      {/* ---------- Avisos ---------- */}
      <section className="panel">
        <div className="panel-titulo">
          <div>
            <h2>Avisos enviados al cliente</h2>
            <p className="panel-sub">Mensajes para que confirme o rechace compras sospechosas</p>
          </div>
          {notificaciones.datos?.length > 0 && <span className="perfil-contador">{notificaciones.datos.length}</span>}
        </div>
        {notificaciones.datos?.length ? (
          <ul className="timeline">
            {notificaciones.datos.map((n) => {
              const tono = n.estado === 'RECONOCIDA' ? 'verde' : n.estado === 'NO_RECONOCIDA' ? 'rojo' : n.estado === 'EXPIRADA' ? 'naranja' : ''
              return (
                <li key={n.id} className={tono ? `tono-${tono}` : ''}>
                  <span className="timeline-icono"><Icono nombre="correo" size={14} /></span>
                  <div>
                    <div className="timeline-linea"><strong>Aviso por {etiqueta(n.canal)}</strong> <Badge valor={n.estado} /></div>
                    {n.mensaje && <p className="timeline-nota">{n.mensaje}</p>}
                    <small className="muted">
                      {fechaHora(n.fechaEnvio)}
                      {n.alerta && <> · <Link to={`/alertas/${n.alerta.id}`}>{n.alerta.codigo}</Link></>}
                    </small>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <Vacio icono="correo">Aún no se le han enviado avisos.</Vacio>}
      </section>

      {editando && <FormCliente abierto cliente={c} alCerrar={() => setEditando(false)} alGuardar={(d) => { setDatos(d); setEditando(false); setAviso('Cliente actualizado') }} />}
      <FormTarjeta abierto={nuevaTarjeta} clienteId={c.id} titular={`${c.nombres} ${c.apellidos}`} alCerrar={() => setNuevaTarjeta(false)}
        alGuardar={() => { setNuevaTarjeta(false); tarjetas.recargar(); setAviso('Tarjeta registrada') }} />
      <ModalBloqueo datos={bloqueo} alCerrar={() => setBloqueo(null)}
        alGuardar={(msg) => { setBloqueo(null); tarjetas.recargar(); setAviso(msg) }} />
    </>
  )
}

/** Algoritmo de Luhn (el mismo que TarjetaUtils.esNumeroValido en el backend). */
function luhnValido(digitos) {
  if (digitos.length < 13 || digitos.length > 19) return false
  let suma = 0
  for (let i = 0; i < digitos.length; i++) {
    let n = Number(digitos[digitos.length - 1 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    suma += n
  }
  return suma % 10 === 0
}

/** Calcula el dígito verificador de Luhn que le falta a un número (sin su último dígito). */
function digitoVerificador(sinUltimo) {
  for (let d = 0; d <= 9; d++) if (luhnValido(sinUltimo + d)) return String(d)
  return null
}

/** Número de prueba aleatorio de 16 dígitos que cumple Luhn (VISA empieza con 4, Mastercard con 51-55). */
function numeroDePrueba() {
  const inicio = Math.random() < 0.5 ? '4' : `5${1 + Math.floor(Math.random() * 5)}`
  let base = inicio
  while (base.length < 15) base += Math.floor(Math.random() * 10)
  return base + digitoVerificador(base)
}

function marcaTarjeta(d) {
  if (/^4/.test(d)) return 'VISA'
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard'
  if (/^3[47]/.test(d)) return 'Amex'
  if (/^3(0[0-5]|[68])/.test(d)) return 'Diners'
  return ''
}

const VACIO_TARJETA = { numero: '', tipo: 'CREDITO', fechaVencimiento: '', limiteCredito: '' }
const TIPOS_TARJETA = [
  { valor: 'CREDITO', texto: 'Crédito', descripcion: 'Con línea de crédito', icono: 'tarjeta' },
  { valor: 'DEBITO', texto: 'Débito', descripcion: 'Asociada a una cuenta', icono: 'transaccion' },
]

function FormTarjeta({ abierto, clienteId, titular, alCerrar, alGuardar }) {
  const [f, setF] = useState(VACIO_TARJETA)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const digitos = f.numero.replace(/\D/g, '')
  const agrupado = digitos.replace(/(\d{4})(?=\d)/g, '$1 ')
  const completo = digitos.length >= 13
  const valido = luhnValido(digitos)
  const marca = marcaTarjeta(digitos)
  // Si el número está completo pero no pasa Luhn, se sugiere cuál debería ser el último dígito
  const sugerido = completo && !valido ? digitos.slice(0, -1) + digitoVerificador(digitos.slice(0, -1)) : null

  // Vencimiento: se agrega la "/" automáticamente y se valida que no esté vencida
  const [mm, aa] = f.fechaVencimiento.split('/')
  const vencida = f.fechaVencimiento.length === 5 && (() => {
    const fin = new Date(2000 + Number(aa), Number(mm), 0, 23, 59)
    return Number(mm) < 1 || Number(mm) > 12 || fin < new Date()
  })()

  function cambiarVencimiento(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`
    setF({ ...f, fechaVencimiento: v })
  }

  function cerrar() {
    setF(VACIO_TARJETA)
    setError(null)
    alCerrar()
  }

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await api.post('/api/tarjetas', {
        clienteId, numero: digitos, tipo: f.tipo,
        fechaVencimiento: f.fechaVencimiento || null,
        limiteCredito: f.tipo === 'CREDITO' && f.limiteCredito ? Number(f.limiteCredito) : null,
      })
      setF(VACIO_TARJETA)
      alGuardar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const relleno = (digitos + '•'.repeat(Math.max(0, 16 - digitos.length))).slice(0, Math.max(16, digitos.length))
  const vistaNumero = relleno.replace(/(.{4})(?=.)/g, '$1 ')

  return (
    <Modal titulo="Nueva tarjeta" subtitulo={titular ? `Titular: ${titular}` : 'Asocia una tarjeta al cliente'}
      icono="tarjeta" abierto={abierto} alCerrar={cerrar} ancho={600}>
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>

        {/* Vista previa de la tarjeta */}
        <div className={`tarjeta-previa ${f.tipo === 'DEBITO' ? 'debito' : ''}`}>
          <div className="tarjeta-previa-fila">
            <span className="tarjeta-chip" />
            <span className="tarjeta-marca">{marca || 'BBVA'}</span>
          </div>
          <div className="tarjeta-numero">{vistaNumero}</div>
          <div className="tarjeta-previa-fila">
            <span>
              <small>Titular</small>
              {titular || 'NOMBRE DEL CLIENTE'}
            </span>
            <span className="der">
              <small>Vence</small>
              {f.fechaVencimiento || 'MM/AA'}
            </span>
          </div>
        </div>

        <SeccionForm titulo="Datos de la tarjeta" icono="tarjeta">
          <div className="campo campo-ancho">
            <span className="campo-etiqueta">
              Número de tarjeta <span className="campo-requerido">*</span>
              <span className="campo-extra">
                {completo && valido
                  ? <span className="campo-ok"><Icono nombre="check" size={14} /> Número válido</span>
                  : <span>{digitos.length} dígitos</span>}
                <button type="button" className="btn-texto" onClick={() => setF({ ...f, numero: numeroDePrueba() })}>
                  <Icono nombre="actualizar" size={13} /> Generar número de prueba
                </button>
              </span>
            </span>
            <span className={completo && !valido ? 'campo-con-error' : ''}>
              <InputPrefijo icono="candado" value={agrupado} inputMode="numeric" autoComplete="off" className="mono"
                placeholder="4111 1111 1111 1111" maxLength={23} autoFocus required aria-label="Número de tarjeta"
                onChange={(e) => setF({ ...f, numero: e.target.value.replace(/\D/g, '').slice(0, 19) })} />
            </span>
            {sugerido ? (
              <div className="nota nota-alerta luhn-ayuda">
                <Icono nombre="alerta" size={16} />
                <span>
                  <strong>Este número no existe como tarjeta real.</strong> Todas las tarjetas cumplen una regla matemática
                  (algoritmo de Luhn): el <strong>último dígito</strong> se calcula a partir de los demás y sirve para detectar
                  errores de tipeo. Revisa que lo hayas copiado bien. Si es un número de prueba, el último dígito debería
                  ser <strong>{sugerido.slice(-1)}</strong>.
                  <button type="button" className="btn btn-sec btn-sm luhn-boton" onClick={() => setF({ ...f, numero: sugerido })}>
                    Usar {sugerido.replace(/(\d{4})(?=\d)/g, '$1 ')}
                  </button>
                </span>
              </div>
            ) : (
              <span className="campo-ayuda">
                Entre 13 y 19 dígitos. Por seguridad solo se guardan los últimos 4.
              </span>
            )}
          </div>
          <Opciones etiqueta="Tipo" nombre="tipoTarjeta" opciones={TIPOS_TARJETA} valor={f.tipo}
            alCambiar={(v) => setF({ ...f, tipo: v })} />
          <Campo etiqueta="Vencimiento" opcional error={vencida ? 'La fecha no es válida o ya venció' : null}>
            <InputPrefijo icono="calendario" value={f.fechaVencimiento} onChange={cambiarVencimiento}
              inputMode="numeric" placeholder="MM/AA" pattern="\d{2}/\d{2}" />
          </Campo>
          {f.tipo === 'CREDITO' && (
            <Campo etiqueta="Límite de crédito" opcional>
              <InputPrefijo prefijo="S/" type="number" min="0" step="0.01" value={f.limiteCredito}
                onChange={(e) => setF({ ...f, limiteCredito: e.target.value })} placeholder="5,000.00" />
            </Campo>
          )}
        </SeccionForm>

        <PieModal alCancelar={cerrar} enviando={enviando} texto="Registrar tarjeta" deshabilitado={!valido || vencida} />
      </form>
    </Modal>
  )
}

function ModalBloqueo({ datos, alCerrar, alGuardar }) {
  const [motivo, setMotivo] = useState('')
  const [temporal, setTemporal] = useState(true)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  if (!datos) return null
  const { tarjeta, accion } = datos
  const bloquear = accion === 'bloquear'

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const body = bloquear ? { temporal, motivo } : { motivo }
      await api.patch(`/api/tarjetas/${tarjeta.id}/${accion}`, body)
      setMotivo('')
      alGuardar(bloquear ? 'Tarjeta bloqueada' : 'Tarjeta desbloqueada')
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={bloquear ? 'Bloquear tarjeta' : 'Desbloquear tarjeta'}
      subtitulo={`${tarjeta.numeroEnmascarado} · ${etiqueta(tarjeta.tipo)}`}
      icono={bloquear ? 'candado' : 'escudo-ok'} tono={bloquear ? 'rojo' : 'verde'} abierto alCerrar={alCerrar} ancho={520}
    >
      <form onSubmit={enviar} className="form-modal">
        <Aviso alCerrar={() => setError(null)}>{error}</Aviso>
        {bloquear && (
          <Opciones etiqueta="Tipo de bloqueo" nombre="tipoBloqueo" valor={temporal ? 'T' : 'D'} alCambiar={(v) => setTemporal(v === 'T')}
            opciones={[
              { valor: 'T', texto: 'Temporal', descripcion: 'Mientras se investiga', icono: 'reloj' },
              { valor: 'D', texto: 'Definitivo', descripcion: 'Fraude confirmado', icono: 'prohibido', tono: 'rojo' },
            ]} />
        )}
        <Campo etiqueta="Motivo" opcional extra={`${motivo.length}/300`}>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={300}
            placeholder={bloquear ? 'Ej. Cliente reporta compras que no reconoce' : 'Ej. Cliente confirmó que las compras eran suyas'} autoFocus />
        </Campo>
        <div className={`nota ${bloquear ? 'nota-peligro' : 'nota-info'}`}>
          <Icono nombre={bloquear ? 'alerta' : 'check'} size={16} />
          <span>{bloquear ? 'La tarjeta quedará bloqueada hasta que alguien la desbloquee desde esta ficha.' : 'La tarjeta volverá a estar activa.'}</span>
        </div>
        <PieModal alCancelar={alCerrar} enviando={enviando} texto={bloquear ? 'Bloquear tarjeta' : 'Desbloquear'}
          icono={bloquear ? 'candado' : 'check'} tono={bloquear ? 'peligro' : 'primario'} />
      </form>
    </Modal>
  )
}
