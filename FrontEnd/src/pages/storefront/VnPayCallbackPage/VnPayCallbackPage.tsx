import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import axios from 'axios'
import { useAppSelector } from '@/store/hooks'
import { selectIsAuthenticated } from '@/store/slices/authSlice'
import { paymentService } from '@/services/api/paymentService'
import type { ApiVnPayVerifyResponse } from '@/types/api'
import { formatCurrency } from '@/utils/formatters'
import { getApiErrorMessage } from '@/utils/apiError'
import { Button } from '@/components/common'
import { Spinner } from '@/components/feedback'
import styles from './VnPayCallbackPage.module.scss'

type CallbackStatus =
  | 'verifying'
  | 'success'
  | 'success_abnormal'
  | 'cancelled'
  | 'failed'
  | 'invalid_signature'
  | 'not_found'
  | 'amount_mismatch'
  | 'network_error'

export const VnPayCallbackPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  // Cờ guard: Chỉ cho phép gọi verify ĐÚNG 1 LẦN (chống gọi trùng do React StrictMode)
  const hasVerifiedRef = useRef(false)

  const hasQueryParams = Boolean(location.search && location.search.includes('vnp_'))
  const [status, setStatus] = useState<CallbackStatus>(hasQueryParams ? 'verifying' : 'not_found')
  const [verifyResult, setVerifyResult] = useState<ApiVnPayVerifyResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>(
    hasQueryParams ? '' : 'Không tìm thấy thông tin phản hồi từ cổng thanh toán VNPAY.',
  )
  const [orderCode, setOrderCode] = useState<string>('')
  const [isRetryingPayment, setIsRetryingPayment] = useState(false)

  useEffect(() => {
    // Nếu không có tham số vnp_* hoặc đã gọi một lần rồi thì không gọi lại
    if (!hasQueryParams || hasVerifiedRef.current) return
    hasVerifiedRef.current = true

    const controller = new AbortController()

    // Trích xuất toàn bộ query params trả về từ VNPay
    const searchParams = new URLSearchParams(location.search)
    const params: Record<string, string> = {}
    searchParams.forEach((val, key) => {
      params[key] = val
    })

    paymentService
      .verifyVnPayReturn(params, controller.signal)
      .then((data) => {
        setVerifyResult(data)
        if (data.order_code) {
          setOrderCode(data.order_code)
        }

        if (data.status === 'success') {
          setStatus('success')
        } else if (data.status === 'success_abnormal') {
          setStatus('success_abnormal')
        } else if (data.response_code === '24') {
          setStatus('cancelled')
        } else {
          setStatus('failed')
          setErrorMessage(data.message || 'Thanh toán không thành công qua cổng VNPAY.')
        }
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') {
          return
        }

        const axiosErr = err as {
          response?: {
            status?: number
            data?: {
              status?: string
              message?: string
              order_code?: string
            }
          }
        }

        const resStatus = axiosErr.response?.status
        const resData = axiosErr.response?.data

        if (resData?.order_code) {
          setOrderCode(resData.order_code)
        }

        if (resStatus === 400) {
          setStatus('invalid_signature')
          setErrorMessage(resData?.message || 'Chữ ký giao dịch không hợp lệ.')
        } else if (resStatus === 404) {
          setStatus('not_found')
          setErrorMessage(resData?.message || 'Không tìm thấy thông tin giao dịch trên hệ thống.')
        } else if (resStatus === 422) {
          setStatus('amount_mismatch')
          setErrorMessage(resData?.message || 'Số tiền giao dịch không khớp với đơn hàng.')
        } else {
          setStatus('network_error')
          setErrorMessage(getApiErrorMessage(err, 'Không thể kết nối đến máy chủ để xác thực giao dịch.'))
        }
      })

    return () => {
      controller.abort()
    }
  }, [location.search, hasQueryParams])

  // Xử lý thao tác "Thanh toán lại" khi giao dịch chưa thành công
  const handleRetryPayment = async () => {
    if (!orderCode) {
      navigate('/orders')
      return
    }

    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: `/orders/${orderCode}` },
      })
      return
    }

    try {
      setIsRetryingPayment(true)
      const res = await paymentService.createVnPayPayment(orderCode)
      window.location.assign(res.payment_url)
    } catch (err: unknown) {
      setIsRetryingPayment(false)
      navigate(`/orders/${orderCode}`, {
        state: {
          paymentError: getApiErrorMessage(
            err,
            'Không thể khởi tạo phiên thanh toán mới. Quý khách vui lòng thử lại từ trang chi tiết đơn hàng.',
          ),
        },
      })
    }
  }

  // 1. Màn hình Đang xác thực
  if (status === 'verifying') {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={`${styles.statusIcon} ${styles.loading}`}>
              <Spinner size="lg" variant="dark" />
            </div>
            <h1 className={styles.title}>Đang Xác Thực Giao Dịch</h1>
            <p className={styles.subtitle}>
              Hệ thống đang tiến hành đối soát và xác thực chữ ký bảo mật từ cổng thanh toán VNPAY.
              Quý khách vui lòng không đóng hoặc tải lại trang trong giây lát...
            </p>
          </div>
        </div>
      </main>
    )
  }

  // 2. Màn hình Thanh toán thành công
  if (status === 'success') {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={`${styles.statusIcon} ${styles.success}`}>
              <CheckCircle2 size={40} strokeWidth={2} />
            </div>

            <h1 className={styles.title}>Thanh Toán Thành Công!</h1>
            <p className={styles.subtitle}>
              Giao dịch thanh toán trực tuyến qua VNPAY đã được ghi nhận thành công. MODE STUDIO đã
              tiếp nhận đơn hàng và đang tiến hành xử lý đóng gói.
            </p>

            <div className={styles.detailsList}>
              {orderCode && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Mã đơn hàng</span>
                  <span className={styles.detailValue}>{orderCode}</span>
                </div>
              )}

              {verifyResult?.amount && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Số tiền đã thanh toán</span>
                  <span className={styles.detailValue}>
                    {formatCurrency(verifyResult.amount)}
                  </span>
                </div>
              )}

              {verifyResult?.bank_code && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Ngân hàng thanh toán</span>
                  <span className={styles.detailValue}>{verifyResult.bank_code}</span>
                </div>
              )}

              {verifyResult?.provider_transaction_no && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Mã giao dịch VNPAY</span>
                  <span className={styles.detailValue}>
                    {verifyResult.provider_transaction_no}
                  </span>
                </div>
              )}

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Phương thức</span>
                <span className={styles.detailValue}>Cổng thanh toán VNPAY</span>
              </div>
            </div>

            <div className={styles.actions}>
              {isAuthenticated && orderCode ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(`/orders/${orderCode}`)}
                >
                  Xem Đơn Hàng
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/orders')}
                >
                  Xem Danh Sách Đơn Hàng
                </Button>
              )}

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/products')}
              >
                Tiếp Tục Mua Sắm
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // 3. Màn hình Giao dịch bất thường (Đơn đã hủy hoặc trùng giao dịch trước đó)
  if (status === 'success_abnormal') {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={`${styles.statusIcon} ${styles.warning}`}>
              <AlertTriangle size={40} strokeWidth={2} />
            </div>

            <h1 className={styles.title}>Ghi Nhận Giao Dịch Thành Công</h1>
            <p className={styles.subtitle}>
              Khoản thanh toán của quý khách đã được trừ thành công qua tài khoản ngân hàng. Tuy
              nhiên, đơn hàng đã bị hủy hoặc đã được thanh toán bởi một giao dịch trước đó.
            </p>

            <div className={styles.abnormalAlert}>
              <AlertTriangle size={20} />
              <div>
                <strong>Cần hỗ trợ hoàn tiền thủ công:</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  Giao dịch đã được hệ thống ghi nhận đầy đủ. Quý khách vui lòng liên hệ bộ phận chăm
                  sóc khách hàng của MODE STUDIO qua số điện thoại hoặc email hỗ trợ để được kiểm tra
                  và hoàn lại số tiền nhanh chóng nhất.
                </p>
              </div>
            </div>

            <div className={styles.detailsList}>
              {orderCode && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Mã đơn hàng</span>
                  <span className={styles.detailValue}>{orderCode}</span>
                </div>
              )}

              {verifyResult?.provider_transaction_no && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Mã giao dịch</span>
                  <span className={styles.detailValue}>
                    {verifyResult.provider_transaction_no}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              {isAuthenticated && orderCode && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(`/orders/${orderCode}`)}
                >
                  Xem Chi Tiết Đơn Hàng
                </Button>
              )}

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/')}
              >
                Về Trang Chủ
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // 4. Màn hình Khách chủ động hủy giao dịch (code 24)
  if (status === 'cancelled') {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={`${styles.statusIcon} ${styles.warning}`}>
              <RotateCcw size={40} strokeWidth={2} />
            </div>

            <h1 className={styles.title}>Giao Dịch Đã Bị Hủy</h1>
            <p className={styles.subtitle}>
              Quý khách đã dừng hoặc hủy thanh toán trên cổng VNPAY. Đơn hàng của quý khách vẫn đang
              được bảo lưu ở trạng thái chờ xử lý để quý khách có thể thanh toán lại bất kỳ lúc nào.
            </p>

            {orderCode && (
              <div className={styles.detailsList}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Mã đơn hàng</span>
                  <span className={styles.detailValue}>{orderCode}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Trạng thái đơn</span>
                  <span className={styles.detailValue}>Chờ thanh toán</span>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              {orderCode && (
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={isRetryingPayment}
                  onClick={handleRetryPayment}
                >
                  Thanh Toán Lại Ngay
                </Button>
              )}

              {isAuthenticated && orderCode && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate(`/orders/${orderCode}`)}
                >
                  Xem Đơn Hàng
                </Button>
              )}

              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate('/products')}
              >
                Tiếp Tục Mua Sắm
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // 5. Màn hình Thất bại / Lỗi chữ ký / Sai số tiền / Lỗi mạng
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={`${styles.statusIcon} ${styles.error}`}>
            <XCircle size={40} strokeWidth={2} />
          </div>

          <h1 className={styles.title}>Thanh Toán Không Thành Công</h1>
          <p className={styles.subtitle}>
            {errorMessage ||
              'Đã có lỗi xảy ra trong quá trình xử lý giao dịch qua cổng thanh toán VNPAY.'}
          </p>

          <div className={styles.errorAlert}>
            <AlertTriangle size={20} />
            <div>
              <strong>Thông tin:</strong>
              <p style={{ margin: '4px 0 0 0' }}>
                Đơn hàng của quý khách chưa được thanh toán thành công. Quý khách có thể bấm &quot;Thanh
                toán lại&quot; hoặc quay về mục đơn hàng để chọn lại hình thức thanh toán.
              </p>
            </div>
          </div>

          {orderCode && (
            <div className={styles.detailsList}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Mã đơn hàng</span>
                <span className={styles.detailValue}>{orderCode}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Trạng thái đơn</span>
                <span className={styles.detailValue}>Chưa thanh toán</span>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            {orderCode && (
              <Button
                variant="primary"
                size="lg"
                isLoading={isRetryingPayment}
                onClick={handleRetryPayment}
              >
                Thanh Toán Lại
              </Button>
            )}

            {isAuthenticated && orderCode ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate(`/orders/${orderCode}`)}
              >
                Xem Đơn Hàng
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/products')}
              >
                Tiếp Tục Mua Sắm
              </Button>
            )}

            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/')}
            >
              Về Trang Chủ
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default VnPayCallbackPage
