import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        textAlign: 'center',
        padding: 'var(--space-8)',
      }}
    >
      <h1 style={{ fontSize: '4.5rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--color-black)' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        Không Tìm Thấy Trang / Page Not Found
      </h2>
      <p style={{ maxWidth: '440px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)', lineHeight: 1.6 }}>
        Trang hoặc sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang đường dẫn khác.
      </p>
      <Link
        to="/"
        style={{
          padding: 'var(--space-3) var(--space-6)',
          backgroundColor: 'var(--color-black)',
          color: 'var(--color-white)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8125rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Trở Về Trang Chủ
      </Link>
    </div>
  )
}

export default NotFoundPage
