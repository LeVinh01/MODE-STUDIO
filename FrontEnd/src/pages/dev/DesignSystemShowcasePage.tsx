import { useState } from 'react'
import {
  ArrowRight,
  FolderOpen,
  Mail,
  Search,
  ShoppingBag,
} from 'lucide-react'
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Badge,
} from '@/components/common'
import { Spinner, Skeleton, Modal, EmptyState } from '@/components/feedback'
import { Pagination, Breadcrumbs } from '@/components/navigation'
import styles from './DesignSystemShowcasePage.module.scss'

export const DesignSystemShowcasePage = () => {
  const [btnLoading, setBtnLoading] = useState(false)
  const [checkedBox, setCheckedBox] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(3)

  const sizeOptions = [
    { label: 'Chọn kích thước (Size)', value: '', disabled: true },
    { label: 'Extra Small (XS)', value: 'xs' },
    { label: 'Small (S)', value: 's' },
    { label: 'Medium (M)', value: 'm' },
    { label: 'Large (L)', value: 'l' },
    { label: 'Extra Large (XL)', value: 'xl' },
  ]

  const storefrontBreadcrumbs = [
    { label: 'Trang Chủ', to: '/' },
    { label: 'Bộ Sưu Tập Nữ', to: '/products' },
    { label: 'Áo Sơ Mi & Lụa', to: '/products' },
    { label: 'Áo Lụa Satin Cổ Chữ V' },
  ]

  const adminBreadcrumbs = [
    { label: 'Bảng Quản Trị', to: '/admin' },
    { label: 'Quản Lý Sản Phẩm', to: '/admin/products' },
    { label: 'Cấu Hình Biến Thể & Tồn Kho (SKU)' },
  ]

  return (
    <div className={styles.showcaseContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>MODE STUDIO Design System</h1>
        <p className={styles.subtitle}>
          Thư viện thành phần giao diện chuẩn hóa (Design System) cho nền tảng thương mại điện tử MODE STUDIO. Phong cách Minimalist / Modern Luxury / Editorial.
        </p>
        <div className={styles.devBadge}>
          <Badge variant="luxury" dot>
            Dev-Only Environment Showcase
          </Badge>
        </div>
      </header>

      {/* 1. BUTTONS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Nút Bấm / Button</h2>
        <p className={styles.sectionDesc}>
          Hỗ trợ 4 biến thể, 3 kích cỡ, trạng thái loading, disabled, kèm icon Lucide và liên kết router.
        </p>

        <div className={styles.row}>
          <Button variant="primary">Khám Phá Ngay</Button>
          <Button variant="secondary">Xem Chi Tiết</Button>
          <Button variant="ghost">Bỏ Qua</Button>
          <Button variant="link">Chính sách bảo hành</Button>
        </div>

        <div className={styles.row}>
          <Button size="sm" variant="primary">Kích thước Nhỏ (SM)</Button>
          <Button size="md" variant="primary">Kích thước Chuẩn (MD)</Button>
          <Button size="lg" variant="primary">Kích thước Lớn (LG)</Button>
        </div>

        <div className={styles.row}>
          <Button
            variant="primary"
            leftIcon={<ShoppingBag size={18} />}
          >
            Thêm Vào Giỏ
          </Button>
          <Button
            variant="secondary"
            rightIcon={<ArrowRight size={18} />}
          >
            Tiếp Tục Thanh Toán
          </Button>
          <Button
            variant="primary"
            isLoading={btnLoading}
            onClick={() => setBtnLoading(!btnLoading)}
          >
            {btnLoading ? 'Đang Xử Lý...' : 'Nhấp Thử Loading'}
          </Button>
          <Button variant="secondary" disabled>
            Vô Hiệu Hóa (Disabled)
          </Button>
          <Button to="/products" variant="secondary">
            Nút Dạng Link Router
          </Button>
        </div>
      </section>

      {/* 2. FORM CONTROLS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Điều Khiển Nhập Liệu / Form Controls</h2>
        <p className={styles.sectionDesc}>
          Tất cả điều khiển đều hỗ trợ nhãn liên kết id (useId), văn bản hướng dẫn, báo lỗi chuẩn ARIA và focus ring tương phản cao.
        </p>

        <div className={styles.grid}>
          {/* Inputs */}
          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Input Chuẩn</span>
            <Input
              label="Họ và Tên"
              placeholder="Ví dụ: Nguyễn Văn An"
              helperText="Nhập đầy đủ họ tên như trên CCCD"
            />
          </div>

          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Input Kèm Icon</span>
            <Input
              label="Tìm Kiếm Sản Phẩm"
              type="search"
              placeholder="Tìm áo sơ mi lụa, đầm dạ tiệc..."
              leftIcon={<Search size={16} />}
              rightIcon={<Mail size={16} />}
            />
          </div>

          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Input Báo Lỗi Tiếng Việt</span>
            <Input
              label="Số Điện Thoại"
              defaultValue="090123"
              errorMessage="Số điện thoại chưa đủ 10 chữ số hợp lệ."
            />
          </div>

          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Input Disabled</span>
            <Input
              label="Mã Khách Hàng (Tự động)"
              defaultValue="CUST-88392"
              disabled
            />
          </div>

          {/* Textareas */}
          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Textarea Chuẩn</span>
            <Textarea
              label="Ghi Chú Đơn Hàng"
              placeholder="Lời nhắn giao hàng hoặc yêu cầu đóng gói quà tặng..."
              helperText="Tối đa 500 ký tự"
            />
          </div>

          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Textarea Báo Lỗi</span>
            <Textarea
              label="Lý Do Hủy Đơn"
              errorMessage="Vui lòng cung cấp chi tiết lý do yêu cầu hủy đơn hàng."
            />
          </div>

          {/* Selects */}
          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Select Dropdown Chuẩn</span>
            <Select
              label="Chọn Kích Cỡ Áo"
              options={sizeOptions}
              defaultValue=""
              helperText="Bảng size chuẩn thời trang quốc tế"
            />
          </div>

          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Select Báo Lỗi</span>
            <Select
              label="Phương Thức Vận Chuyển"
              options={[
                { label: '-- Vui lòng chọn dịch vụ --', value: '' },
                { label: 'Giao hàng hỏa tốc nội thành (2H)', value: 'express' },
                { label: 'Giao hàng tiêu chuẩn (2-3 ngày)', value: 'standard' },
              ]}
              defaultValue=""
              errorMessage="Vui lòng chọn hình thức giao hàng."
            />
          </div>

          {/* Checkboxes */}
          <div className={styles.componentCard}>
            <span className={styles.cardLabel}>Checkbox Đa Dạng Trạng Thái</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Checkbox
                label="Tôi đồng ý với Điều khoản Dịch vụ & Chính sách Bảo mật"
                checked={checkedBox}
                onChange={(e) => setCheckedBox(e.target.checked)}
              />
              <Checkbox
                label="Chọn tất cả biến thể sản phẩm"
                indeterminate
                helperText="Đang chọn 3 trên tổng số 6 biến thể"
              />
              <Checkbox
                label="Bắt buộc đồng ý điều khoản thanh toán"
                errorMessage="Vui lòng tích chọn trước khi hoàn tất đặt hàng."
              />
              <Checkbox
                label="Đăng ký nhận tạp chí thời trang (Tạm ngừng)"
                disabled
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. BADGES */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Nhãn Trạng Thái &amp; Tem Thương Hiệu / Badge</h2>
        <p className={styles.sectionDesc}>
          Nhãn trạng thái đơn hàng và các tem nhận diện thời trang cao cấp.
        </p>

        <div className={styles.row}>
          <Badge variant="default">Mặc Định</Badge>
          <Badge variant="success" dot>Đã Thanh Toán</Badge>
          <Badge variant="warning" dot>Chờ Xác Nhận</Badge>
          <Badge variant="error" dot>Đã Hủy Đơn</Badge>
          <Badge variant="info" dot>Đang Vận Chuyển</Badge>
          <Badge variant="luxury">Exclusive Edition</Badge>
          <Badge variant="outline">Mùa Thu - Đông 2026</Badge>
        </div>

        <div className={styles.row}>
          <Badge variant="success" size="sm" dot>Đang giao (SM)</Badge>
          <Badge variant="luxury" size="sm">New Arrival</Badge>
          <Badge variant="error" size="sm">-30% SALE</Badge>
        </div>
      </section>

      {/* 4. FEEDBACK (SPINNER & SKELETON) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Phản Hồi Trạng Thái / Spinner &amp; Skeleton</h2>
        <p className={styles.sectionDesc}>
          Vòng xoay tải dữ liệu và khung xương shimmer tông be ấm áp.
        </p>

        <div className={styles.row} style={{ alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Spinner:</span>
          <Spinner size="sm" variant="dark" />
          <Spinner size="md" variant="dark" />
          <Spinner size="lg" variant="dark" />
          <div style={{ background: 'var(--color-black)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)' }}>
            <Spinner size="md" variant="light" />
          </div>
          <Spinner size="md" variant="bronze" />
        </div>

        <div style={{ marginTop: 'var(--space-6)' }}>
          <span className={styles.cardLabel} style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
            Mô phỏng Skeleton Card Sản Phẩm:
          </span>

          <div style={{ maxWidth: '280px', padding: 'var(--space-4)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <Skeleton variant="rectangular" width="100%" height={260} />
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Skeleton variant="text" width="40%" height={14} />
              <Skeleton variant="text" width="85%" height={20} />
              <Skeleton variant="text" width="60%" height={16} />
            </div>
          </div>
        </div>
      </section>

      {/* 5. MODAL (PORTAL & FOCUS TRAP) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Hộp Thoại / Modal (Portal &amp; Focus Trap)</h2>
        <p className={styles.sectionDesc}>
          Hộp thoại render qua React Portal, tự động khóa cuộn trang, bắt phím Esc, click backdrop và bẫy phím Tab (Focus Trap) chuẩn WCAG 2.1.
        </p>

        <div className={styles.row}>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Mở Hộp Thoại Xác Nhận / Open Modal
          </Button>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Xác Nhận Hủy Đơn Hàng"
          description="Hành động này sẽ cập nhật trạng thái đơn hàng #MODE-9842 sang Đã Hủy."
          footer={
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsModalOpen(false)}
              >
                Giữ Lại Đơn Hàng
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsModalOpen(false)}
              >
                Xác Nhận Hủy Đơn
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Sau khi hủy, số tiền thanh toán (nếu có) sẽ được hoàn trả về tài khoản gốc của khách hàng trong vòng 3 - 5 ngày làm việc.
            </p>
            <Textarea
              label="Lý Do Hủy Đơn (Bắt buộc)"
              placeholder="Nhập lý do chi tiết từ khách hàng hoặc hệ thống vận chuyển..."
              rows={3}
            />
          </div>
        </Modal>
      </section>

      {/* 6. EMPTY STATE */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Trạng Thái Trống / EmptyState</h2>
        <p className={styles.sectionDesc}>
          Trình bày trực quan khi chưa có dữ liệu: giỏ hàng trống, không tìm thấy kết quả hoặc danh mục chưa có sản phẩm.
        </p>

        <div className={styles.grid}>
          <div className={styles.componentCard}>
            <EmptyState
              icon={<ShoppingBag />}
              title="Giỏ Hàng Đang Trống"
              description="Bạn chưa chọn sản phẩm nào. Hãy khám phá các thiết kế thời trang may đo tinh xảo mới nhất từ MODE STUDIO."
              action={
                <Button to="/products" variant="primary" size="md">
                  Khám Phá Bộ Sưu Tập
                </Button>
              }
            />
          </div>

          <div className={styles.componentCard}>
            <EmptyState
              icon={<Search />}
              title="Không Tìm Thấy Kết Quả"
              description="Không có thiết kế nào phù hợp với bộ lọc hiện tại. Vui lòng thử tìm kiếm với từ khóa khác."
              action={
                <Button variant="secondary" size="md">
                  Đặt Lại Bộ Lọc
                </Button>
              }
            />
          </div>

          <div className={styles.componentCard}>
            <EmptyState
              icon={<FolderOpen />}
              title="Chưa Có Đơn Hàng Nào"
              description="Hệ thống quản trị chưa ghi nhận đơn đặt hàng nào trong kỳ báo cáo này."
            />
          </div>
        </div>
      </section>

      {/* 7. PAGINATION */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Phân Trang / Pagination</h2>
        <p className={styles.sectionDesc}>
          Điều khiển từ ngoài với nút trước/sau, tự động rút gọn bằng dấu &quot;…&quot;, nút trang hiện tại gắn aria-current=&quot;page&quot;.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Đang xem trang: <strong>{currentPage}</strong> trên tổng số <strong>12</strong> trang
          </p>

          <Pagination
            page={currentPage}
            totalPages={12}
            onChange={(newPage) => setCurrentPage(newPage)}
          />
        </div>
      </section>

      {/* 8. BREADCRUMBS */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. Đường Dẫn Điều Hướng / Breadcrumbs</h2>
        <p className={styles.sectionDesc}>
          Thẻ nav chuẩn hỗ trợ tiếp cận, mục cuối cùng là trang hiện tại (không gắn thẻ liên kết) có aria-current=&quot;page&quot;.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <span className={styles.cardLabel} style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
              Breadcrumbs Phân Hệ Khách Hàng (Storefront):
            </span>
            <Breadcrumbs items={storefrontBreadcrumbs} />
          </div>

          <div>
            <span className={styles.cardLabel} style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
              Breadcrumbs Phân Hệ Quản Trị (Admin Workspace):
            </span>
            <Breadcrumbs items={adminBreadcrumbs} />
          </div>
        </div>
      </section>
    </div>
  )
}

export default DesignSystemShowcasePage
