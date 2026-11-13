import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Truck,
  CreditCard,
  ShoppingBag,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/slices/authSlice'
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartItemsCount,
  selectCartHasUnpurchasableItems,
  selectCartLoading,
  selectCartHasLoaded,
  selectCartIsMerging,
  fetchCart,
} from '@/store/slices/cartSlice'
import { orderService } from '@/services/api/orderService'
import type {
  CreateOrderPayload,
} from '@/types/order'
import type {
  ApiInsufficientStockItem,
  ApiOrderStoreErrorResponse,
} from '@/types/api'
import { formatCurrency } from '@/utils/formatters'
import { STORE_POLICIES } from '@/config/store'
import { Input, Textarea, Button, Badge } from '@/components/common'
import { Breadcrumbs } from '@/components/navigation'
import { Spinner } from '@/components/feedback'
import styles from './CheckoutPage.module.scss'

const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/

export const CheckoutPage = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const user = useAppSelector(selectCurrentUser)
  const items = useAppSelector(selectCartItems)
  const subtotal = useAppSelector(selectCartSubtotal)
  const itemsCount = useAppSelector(selectCartItemsCount)
  const hasUnpurchasableItems = useAppSelector(selectCartHasUnpurchasableItems)
  const isLoading = useAppSelector(selectCartLoading)
  const hasLoaded = useAppSelector(selectCartHasLoaded)
  const isMerging = useAppSelector(selectCartIsMerging)

  // Cờ ref bảo vệ: chặn chuyển hướng giỏ rỗng khi vừa đặt hàng thành công
  const justOrderedRef = useRef(false)
  // Cờ ref khóa gửi: ngăn ngừa double-submit đồng thời
  const submitLockRef = useRef(false)

  // Form State - khởi tạo từ user hiện tại
  const isVnPayEnabled = import.meta.env.VITE_ENABLE_VNPAY === 'true'
  const [recipientName, setRecipientName] = useState(user?.fullName || '')
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '')
  const [shippingAddress, setShippingAddress] = useState('')
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay'>('cod')

  // Validation & Error State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [insufficientStockItems, setInsufficientStockItems] = useState<
    ApiInsufficientStockItem[]
  >([])
  const [isPossibleDuplicateOrder, setIsPossibleDuplicateOrder] =
    useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // QUY TẮC KHỞI TẠO & ĐIỀU HƯỚNG:
  // - Khi isMerging === true hoặc giỏ chưa fetch xong lần đầu (!hasLoaded): giữ trạng thái chờ, tuyệt đối không redirect
  // - Khi đã tải xong mà giỏ rỗng: redirect về /cart (trừ khi vừa đặt hàng thành công justOrderedRef = true)
  useEffect(() => {
    if (justOrderedRef.current) return
    if (isMerging || !hasLoaded) return

    if (items.length === 0) {
      navigate('/cart', { replace: true })
    }
  }, [isMerging, hasLoaded, items.length, navigate])

  // Chi phí vận chuyển và tổng tiền dựa trên STORE_POLICIES (single source of truth)
  const isFreeShipping = subtotal >= STORE_POLICIES.freeShippingThreshold
  const shippingFee = isFreeShipping ? 0 : STORE_POLICIES.standardShippingFee
  const totalAmount = subtotal + shippingFee

  // Kiểm tra giỏ hàng có tồn tại sản phẩm không mua được hoặc hết hàng
  const hasOutOfStock = items.some(
    (it) => (it.variant?.stockQuantity ?? 0) <= 0 || !it.isPurchasable,
  )

  const handleFieldChange = (field: string, value: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    setSubmitError(null)

    if (field === 'recipientName') setRecipientName(value)
    if (field === 'recipientPhone') setRecipientPhone(value)
    if (field === 'shippingAddress') setShippingAddress(value)
    if (field === 'note') setNote(value)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!recipientName.trim()) {
      errors.recipientName = 'Vui lòng nhập họ và tên người nhận.'
    } else if (recipientName.trim().length > 150) {
      errors.recipientName = 'Họ và tên không được vượt quá 150 ký tự.'
    }

    const normalizedPhone = recipientPhone.trim().replace(/[\s.]/g, '')
    if (!normalizedPhone) {
      errors.recipientPhone = 'Vui lòng nhập số điện thoại người nhận.'
    } else if (!PHONE_REGEX.test(normalizedPhone)) {
      errors.recipientPhone =
        'Số điện thoại người nhận không hợp lệ (yêu cầu số điện thoại Việt Nam 10 chữ số).'
    }

    if (!shippingAddress.trim()) {
      errors.shippingAddress = 'Vui lòng nhập địa chỉ giao hàng cụ thể.'
    } else if (shippingAddress.trim().length > 500) {
      errors.shippingAddress = 'Địa chỉ giao hàng không được vượt quá 500 ký tự.'
    }

    if (note.trim().length > 1000) {
      errors.note = 'Ghi chú không được vượt quá 1000 ký tự.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault()

    // 1. Kiểm tra khóa đồng thời
    if (submitLockRef.current || isSubmitting) return

    // 2. Kiểm tra tính hợp lệ của giỏ hàng
    if (hasUnpurchasableItems || hasOutOfStock || items.length === 0) {
      setSubmitError(
        'Giỏ hàng có sản phẩm không thể thanh toán hoặc đã hết hàng. Vui lòng quay lại giỏ hàng để cập nhật.',
      )
      return
    }

    // 3. Xác thực form phía client
    if (!validateForm()) {
      return
    }

    // 4. Kích hoạt khóa gửi đơn
    submitLockRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    setInsufficientStockItems([])
    setIsPossibleDuplicateOrder(false)

    const normalizedPhone = recipientPhone.trim().replace(/[\s.]/g, '')
    const payload: CreateOrderPayload = {
      recipient_name: recipientName.trim(),
      recipient_phone: normalizedPhone,
      shipping_address: shippingAddress.trim(),
      note: note.trim() || undefined,
      payment_method: paymentMethod,
    }

    try {
      const response = await orderService.createOrder(payload)
      const createdOrderCode = response.order.orderCode

      // Đặt cờ ref ngăn redirect về /cart khi giỏ rỗng
      justOrderedRef.current = true

      // Chuyển sang trang đặt hàng thành công trước, rồi mới dispatch fetchCart
      navigate(`/order-success/${createdOrderCode}`, { replace: true })
      dispatch(fetchCart())
    } catch (err: unknown) {
      // Mở khóa gửi
      submitLockRef.current = false
      setIsSubmitting(false)

      const axiosError = err as {
        code?: string
        response?: {
          status?: number
          data?: ApiOrderStoreErrorResponse
        }
      }

      const status = axiosError.response?.status
      const errorData = axiosError.response?.data

      // TRƯỜNG HỢP 1: Lỗi 422 không đủ hàng trong kho
      if (status === 422 && errorData?.insufficient_items?.length) {
        setInsufficientStockItems(errorData.insufficient_items)
        setSubmitError(
          errorData.message ||
            'Một số sản phẩm không đủ số lượng trong kho. Vui lòng kiểm tra lại.',
        )
        // Nạp lại giỏ để cập nhật số tồn kho mới nhất từ DB
        dispatch(fetchCart())
        return
      }

      // TRƯỜNG HỢP 2: Lỗi mạng, 5xx, hoặc 422 giỏ rỗng (nguy cơ server đã nhận và tạo đơn nhưng mất phản hồi)
      const isNetworkError =
        !axiosError.response ||
        axiosError.code === 'ERR_NETWORK' ||
        (typeof window !== 'undefined' && !window.navigator.onLine)
      const isServerError = typeof status === 'number' && status >= 500
      const isCartEmpty422 =
        status === 422 &&
        (Boolean(errorData?.errors?.cart?.length) ||
          errorData?.message?.includes('trống'))

      if (isNetworkError || isServerError || isCartEmpty422) {
        try {
          const freshCartRes = await dispatch(fetchCart()).unwrap()
          if (freshCartRes.cart.items.length === 0) {
            // Giỏ hàng hiện đã rỗng: máy chủ đã tạo đơn hàng thành công trước khi kết nối bị ngắt
            setIsPossibleDuplicateOrder(true)
            setSubmitError(
              'Đơn hàng có thể đã được tiếp nhận trên hệ thống. Vui lòng kiểm tra mục Đơn Hàng Của Tôi trước khi đặt lại để tránh trùng lặp đơn hàng.',
            )
            return
          }
        } catch {
          // Lỗi tiếp tục khi gọi giỏ, thông báo thân thiện
        }

        setSubmitError(
          'Không thể kết nối đến máy chủ để xác nhận đơn hàng. Vui lòng kiểm tra đường truyền và thử lại.',
        )
        return
      }

      // TRƯỜNG HỢP 3: Lỗi 422 validation các trường dữ liệu
      if (status === 422 && errorData?.errors) {
        const nextErrors: Record<string, string> = {}
        if (errorData.errors.recipient_name?.[0]) {
          nextErrors.recipientName = errorData.errors.recipient_name[0]
        }
        if (errorData.errors.recipient_phone?.[0]) {
          nextErrors.recipientPhone = errorData.errors.recipient_phone[0]
        }
        if (errorData.errors.shipping_address?.[0]) {
          nextErrors.shippingAddress = errorData.errors.shipping_address[0]
        }
        if (errorData.errors.note?.[0]) {
          nextErrors.note = errorData.errors.note[0]
        }
        setFieldErrors(nextErrors)
        setSubmitError(
          errorData.message ||
            'Thông tin đặt hàng chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu đỏ.',
        )
        return
      }

      // TRƯỜNG HỢP KHÁC
      setSubmitError(
        errorData?.message ||
          'Không thể hoàn tất đặt hàng vào lúc này. Vui lòng thử lại sau ít phút.',
      )
    }
  }

  // Màn hình chờ khi đang gộp giỏ hoặc nạp giỏ lần đầu
  if (isMerging || !hasLoaded || (isLoading && items.length === 0)) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <Spinner size="lg" variant="dark" />
            <p>Đang chuẩn bị thông tin thanh toán của quý khách...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* BREADCRUMBS */}
        <div className={styles.breadcrumbsWrapper}>
          <Breadcrumbs
            items={[
              { label: 'Trang chủ', to: '/' },
              { label: 'Giỏ hàng', to: '/cart' },
              { label: 'Thanh toán' },
            ]}
          />
        </div>

        {/* HEADER */}
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Thanh Toán Đơn Hàng</h1>
          <Link to="/cart" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Quay lại giỏ hàng</span>
          </Link>
        </header>

        <form key={user?.id ?? 'guest'} onSubmit={handleSubmitOrder} noValidate>
          <div className={styles.layout}>
            {/* CỘT TRÁI: FORM ĐẶT HÀNG */}
            <div className={styles.formColumn}>
              {/* PHẦN 1: THÔNG TIN GIAO HÀNG */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>1</span>
                  <h2 className={styles.sectionTitle}>Thông Tin Giao Hàng</h2>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.rowTwoCols}>
                    <Input
                      id="checkout-recipient-name"
                      label="Họ và tên người nhận *"
                      placeholder="Nguyễn Văn A"
                      value={recipientName}
                      onChange={(e) =>
                        handleFieldChange('recipientName', e.target.value)
                      }
                      errorMessage={fieldErrors.recipientName}
                      disabled={isSubmitting || isPossibleDuplicateOrder}
                      maxLength={150}
                      fullWidth
                    />

                    <Input
                      id="checkout-recipient-phone"
                      label="Số điện thoại *"
                      placeholder="0901234567"
                      value={recipientPhone}
                      onChange={(e) =>
                        handleFieldChange('recipientPhone', e.target.value)
                      }
                      errorMessage={fieldErrors.recipientPhone}
                      helperText="Định dạng số di động Việt Nam 10 chữ số"
                      disabled={isSubmitting || isPossibleDuplicateOrder}
                      maxLength={15}
                      fullWidth
                    />
                  </div>

                  <Textarea
                    id="checkout-shipping-address"
                    label="Địa chỉ giao hàng chi tiết *"
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    value={shippingAddress}
                    onChange={(e) =>
                      handleFieldChange('shippingAddress', e.target.value)
                    }
                    errorMessage={fieldErrors.shippingAddress}
                    disabled={isSubmitting || isPossibleDuplicateOrder}
                    rows={3}
                    maxLength={500}
                    fullWidth
                  />

                  <Textarea
                    id="checkout-note"
                    label="Ghi chú đơn hàng (tùy chọn)"
                    placeholder="Chỉ dẫn giao hàng, thời gian nhận hàng thuận tiện,..."
                    value={note}
                    onChange={(e) =>
                      handleFieldChange('note', e.target.value)
                    }
                    errorMessage={fieldErrors.note}
                    disabled={isSubmitting || isPossibleDuplicateOrder}
                    rows={2}
                    maxLength={1000}
                    fullWidth
                  />
                </div>
              </section>

              {/* PHẦN 2: PHƯƠNG THỨC THANH TOÁN */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>2</span>
                  <h2 className={styles.sectionTitle}>Phương Thức Thanh Toán</h2>
                </div>

                <div className={styles.paymentOptions}>
                  {/* COD */}
                  <label
                    className={`${styles.paymentOption} ${
                      paymentMethod === 'cod' ? styles.selected : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className={styles.radioInput}
                      disabled={isSubmitting || isPossibleDuplicateOrder}
                    />
                    <div className={styles.paymentOptionContent}>
                      <span className={styles.paymentOptionTitle}>
                        <Truck size={18} aria-hidden="true" />
                        Thanh toán khi nhận hàng (COD)
                      </span>
                      <p className={styles.paymentOptionDesc}>
                        Quý khách thanh toán bằng tiền mặt trực tiếp cho nhân viên giao hàng khi nhận sản phẩm.
                      </p>
                    </div>
                  </label>

                  {/* VNPAY (chỉ hiển thị khi VITE_ENABLE_VNPAY=true) */}
                  {isVnPayEnabled && (
                    <label
                      className={`${styles.paymentOption} ${
                        paymentMethod === 'vnpay' ? styles.selected : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="vnpay"
                        checked={paymentMethod === 'vnpay'}
                        onChange={() => setPaymentMethod('vnpay')}
                        disabled={isSubmitting || isPossibleDuplicateOrder}
                        className={styles.radioInput}
                      />
                      <div className={styles.paymentOptionContent}>
                        <div className={styles.paymentOptionTitle}>
                          <CreditCard size={18} aria-hidden="true" />
                          <span>Cổng thanh toán VNPAY / VNPAY-QR</span>
                        </div>
                        <p className={styles.paymentOptionDesc}>
                          Thanh toán qua thẻ ATM, Internet Banking hoặc mã QR ngân hàng.
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </section>
            </div>

            {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
            <aside className={styles.summaryColumn}>
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>
                  <span>Tóm Tắt Đơn Hàng</span>
                  <Badge variant="default" size="sm">
                    {itemsCount} loại món
                  </Badge>
                </h2>

                {/* DANH SÁCH SẢN PHẨM */}
                <ul
                  className={styles.itemsList}
                  aria-label="Danh sách sản phẩm thanh toán"
                >
                  {items.map((item) => {
                    const productName =
                      item.product?.name || 'Sản phẩm không xác định'
                    const thumbnail = item.product?.mainImage?.url || ''
                    const colorName = item.variant?.color?.name
                    const sizeName = item.variant?.size?.name

                    return (
                      <li key={item.id} className={styles.itemRow}>
                        <div className={styles.itemThumbWrapper}>
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={productName}
                              className={styles.itemThumb}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.itemThumbPlaceholder}>
                              <ShoppingBag size={20} strokeWidth={1.5} />
                            </div>
                          )}
                          <span className={styles.itemQuantityBadge}>
                            ×{item.quantity}
                          </span>
                        </div>

                        <div className={styles.itemInfo}>
                          <h3 className={styles.itemName} title={productName}>
                            {productName}
                          </h3>
                          <p className={styles.itemMeta}>
                            {[colorName, sizeName].filter(Boolean).join(' / ')}
                          </p>
                        </div>

                        <span className={styles.itemTotal}>
                          {formatCurrency(item.lineTotal)}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {/* CHI PHÍ */}
                <div className={styles.costBreakdown}>
                  <div className={styles.costRow}>
                    <span>Tạm tính ({itemsCount} loại sản phẩm)</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  <div className={styles.costRow}>
                    <span>Phí vận chuyển</span>
                    {isFreeShipping ? (
                      <span className={styles.costRowHighlight}>Miễn phí</span>
                    ) : (
                      <span>{formatCurrency(shippingFee)}</span>
                    )}
                  </div>
                </div>

                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Tổng thanh toán</span>
                  <span className={styles.totalValue}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                <p className={styles.estimateNote}>
                  * Giá và phí vận chuyển chính thức sẽ được máy chủ xác nhận khi đặt hàng.
                </p>

                {/* BẢNG CẢNH BÁO LỖI NẾU CÓ */}
                {submitError && (
                  <div className={styles.errorBanner} role="alert">
                    <div className={styles.errorTitle}>
                      <AlertCircle size={18} aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>

                    {insufficientStockItems.length > 0 && (
                      <ul className={styles.insufficientList}>
                        {insufficientStockItems.map((insufficient) => (
                          <li key={insufficient.variant_id}>
                            <strong>{insufficient.product_name}</strong>: Chỉ còn{' '}
                            {insufficient.available_stock} sản phẩm (quý khách yêu cầu{' '}
                            {insufficient.requested_quantity})
                          </li>
                        ))}
                      </ul>
                    )}

                    {isPossibleDuplicateOrder && (
                      <div className={styles.duplicateActions}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/orders')}
                        >
                          Kiểm Tra Đơn Hàng Của Tôi
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate('/')}
                        >
                          Về Trang Chủ
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/cart')}
                        >
                          Kiểm Tra Giỏ Hàng
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* NÚT ĐẶT HÀNG */}
                <div className={styles.submitSection}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={
                      isSubmitting ||
                      isPossibleDuplicateOrder ||
                      hasUnpurchasableItems ||
                      hasOutOfStock ||
                      items.length === 0
                    }
                  >
                    {isSubmitting ? 'Đang Xử Lý Đơn Hàng...' : 'Đặt Hàng Ngay'}
                  </Button>

                  <div className={styles.securityFooter}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    <span>Giao dịch an toàn &amp; Bảo mật tuyệt đối</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </main>
  )
}

export default CheckoutPage
