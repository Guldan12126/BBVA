import { useState } from 'react'
import { useParams } from 'react-router-dom'
import api, { mensajeError } from '../api/client'
import { Aviso, Cargando } from '../components/UI'
import useApi from '../hooks/useApi'
import { etiqueta, fechaHora, moneda } from '../utils/formato'

/**
 * Página PÚBLICA a la que llega el cliente desde el correo:
 * "¿Reconoces esta compra?" -> Sí, fui yo / No la reconozco.
 */
export default function ValidarCompra() {
  const { token } = useParams()
  const { datos, cargando, error } = useApi(`/api/public/validar-compra/${token}`)
  const [respuesta, setRespuesta] = useState(null)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function responder(reconoce) {
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const { data } = await api.post(`/api/public/validar-compra/${token}`, { reconoce })
      setRespuesta(data)
    } catch (e) {
      setErrorEnvio(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pantalla-publica">
      <div className="tarjeta-publica">
        <div className="marca marca-grande">
          <img src="/escudo.svg" alt="" width="40" height="40" />
          <div>
            <strong>Prevención de Fraude</strong>
            <small>Validación de compra</small>
          </div>
        </div>

        {cargando && <Cargando />}
        <Aviso>{error}</Aviso>

        {datos && !respuesta && (
          <>
            <h1>Hola {datos.cliente}, ¿reconoces esta compra?</h1>
            <dl className="detalles detalles-compra">
              <div><dt>Comercio</dt><dd>{datos.comercio}</dd></div>
              <div><dt>Monto</dt><dd className="monto-grande">{moneda(datos.monto, datos.moneda)}</dd></div>
              <div><dt>Fecha</dt><dd>{fechaHora(datos.fecha)}</dd></div>
              <div><dt>Ciudad</dt><dd>{datos.ciudad}</dd></div>
              <div><dt>Canal</dt><dd>{etiqueta(datos.canal)}</dd></div>
              <div><dt>Tarjeta</dt><dd>{datos.tarjeta}</dd></div>
            </dl>
            <Aviso>{errorEnvio}</Aviso>
            {datos.yaRespondida ? (
              <Aviso tipo="info">Ya respondiste esta consulta ({etiqueta(datos.estado)}). ¡Gracias!</Aviso>
            ) : (
              <>
                <div className="botones-validacion">
                  <button className="btn btn-exito" disabled={enviando} onClick={() => responder(true)}>
                    Sí, fui yo
                  </button>
                  <button className="btn btn-peligro" disabled={enviando} onClick={() => responder(false)}>
                    No la reconozco
                  </button>
                </div>
                <p className="muted texto-pequeno">
                  Este enlace vence el {fechaHora(datos.venceEn)} · Nunca te pediremos tu clave, CVV ni token.
                </p>
              </>
            )}
          </>
        )}

        {respuesta && (
          <Aviso tipo={respuesta.reconocida ? 'ok' : 'info'}>{respuesta.mensaje}</Aviso>
        )}
      </div>
    </div>
  )
}
