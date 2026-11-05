import { useParams } from 'react-router-dom'

export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>()

  return (
    <section>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Product Detail</h2>
      <p style={{ color: '#52525b' }}>
        Viewing product: <strong>{slug || 'placeholder-item'}</strong>. Ready for variant selector and gallery.
      </p>
    </section>
  )
}

export default ProductDetailPage

