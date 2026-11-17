import { Link } from 'react-router-dom'

export default function NoEncontrado({ mensaje = 'La página que buscas no existe.' }) {
  return (
    <div className="vacio vacio-grande">
      <h1>Ups…</h1>
      <p>{mensaje}</p>
      <Link to="/" className="btn btn-primario">
        Ir al dashboard
      </Link>
    </div>
  )
}
