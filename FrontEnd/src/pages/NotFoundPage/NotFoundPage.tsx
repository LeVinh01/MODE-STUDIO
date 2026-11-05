import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '4rem', fontWeight: 300, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 400, color: '#52525b', marginBottom: '1.5rem' }}>
        Page Not Found
      </h2>
      <p style={{ maxWidth: '420px', color: '#71717a', marginBottom: '2rem', lineHeight: 1.6 }}>
        The piece or page you are looking for does not exist or has been relocated.
      </p>
      <Link
        to="/"
        style={{
          padding: '0.75rem 1.5rem',
          background: '#111',
          color: '#fff',
          textDecoration: 'none',
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
        }}
      >
        Return to Home
      </Link>
    </div>
  )
}

export default NotFoundPage

