import { useParams } from 'react-router-dom'

export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>()

  return (
    <section>
      <h2>Chi Tiết Sản Phẩm / Product Detail</h2>
      <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
        Đang xem sản phẩm: <strong>{slug || 'san-pham-mau'}</strong>. Sẵn sàng tích hợp chọn biến thể (màu sắc, size, SKU) và hình ảnh phóng to.
      </p>
    </section>
  )
}

export default ProductDetailPage
