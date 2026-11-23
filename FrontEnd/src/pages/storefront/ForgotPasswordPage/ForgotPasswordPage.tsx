import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button, FloatingInput } from '@/components/common'
import { authService } from '@/services/api/authService'
import { BRAND_NAME, BRAND_LOGOS, formatPageTitle } from '@/config/brand'
import { useAppSelector } from '@/store/hooks'
import {
  selectIsAuthenticated,
  selectIsAuthInitialized,
} from '@/store/slices/authSlice'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import type { ApiValidationErrorResponse } from '@/types/auth'
import styles from './ForgotPasswordPage.module.scss'

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized)

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>()
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)
  const [logoError, setLogoError] = useState(false)

  // Document Title
  useEffect(() => {
    document.title = formatPageTitle('Quên mật khẩu')
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthInitialized, isAuthenticated, navigate])

  // Countdown timer cho 429 Too Many Requests
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return

    const timer = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [retryCountdown])

  const validate = () => {
    if (!email.trim()) {
      setEmailError('Vui lòng nhập địa chỉ email.')
      return false
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Địa chỉ email không đúng định dạng.')
      return false
    }
    setEmailError(undefined)
    return true
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGeneralError(null)

    if (retryCountdown !== null && retryCountdown > 0) {
      return
    }

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await authService.forgotPassword(email.trim())
      setSuccessMessage(
        result.message ||
          'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
      )
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response

        if (status === 422) {
          const valErrors = (data as ApiValidationErrorResponse).errors || {}
          if (valErrors.email?.[0]) {
            setEmailError(valErrors.email[0])
          }
          setGeneralError(
            (data as ApiValidationErrorResponse).message ||
              'Dữ liệu nhập vào chưa chính xác.',
          )
        } else if (status === 429) {
          let seconds = 60
          const retryHeader = err.response.headers?.['retry-after']
          if (retryHeader) {
            const parsed = parseInt(String(retryHeader), 10)
            if (Number.isFinite(parsed) && parsed > 0) {
              seconds = parsed
            }
          }
          setRetryCountdown(seconds)
          setGeneralError(
            (data as { message?: string })?.message ||
              `Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau ${seconds} giây.`,
          )
        } else {
          setGeneralError(
            (data as { message?: string })?.message ||
              'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
          )
        }
      } else {
        setGeneralError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthInitialized || isAuthenticated) {
    return <AuthLoadingScreen />
  }

  return (
    <div className={styles.formWrapper}>
      {/* 1. Logo thương hiệu quay về trang chủ */}
      <div className={styles.logoWrapper}>
        <Link
          to="/"
          className={styles.brandLogo}
          aria-label={`${BRAND_NAME} - Về trang chủ`}
        >
          {!logoError ? (
            <img
              src={BRAND_LOGOS.burgundy}
              alt={BRAND_NAME}
              width={110}
              height={70}
              className={styles.brandLogoImg}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span>{BRAND_NAME}</span>
          )}
        </Link>
      </div>

      {/* 2. Tiêu đề form */}
      <h1 className={styles.tagline}>QUÊN MẬT KHẨU</h1>

      {successMessage ? (
        <div className={styles.successCard} role="status">
          <p style={{ margin: '0 0 12px 0', fontWeight: 500 }}>
            {successMessage}
          </p>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534' }}>
            Vui lòng kiểm tra hộp thư đến (và cả mục thư rác / spam) để làm theo hướng dẫn thiết lập lại mật khẩu.
          </p>
          <div className={styles.footerActions} style={{ marginTop: '20px' }}>
            <Link to="/login" className={styles.switchLink}>
              Quay lại đăng nhập
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null)
                setEmail('')
              }}
              className={styles.resendBtn}
            >
              Gửi lại với email khác
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.instruction}>
            Nhập địa chỉ email liên kết với tài khoản của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu qua email.
          </p>

          {/* 3. Cảnh báo lỗi chung */}
          {generalError && (
            <div className={styles.errorAlert} role="alert" aria-live="polite">
              <span className={styles.errorDot} aria-hidden="true" />
              <span>{generalError}</span>
            </div>
          )}

          {/* 4. Form quên mật khẩu */}
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <FloatingInput
              id="forgot-password-email"
              type="email"
              label="Email đã đăng ký"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) {
                  setEmailError(undefined)
                }
              }}
              errorMessage={emailError}
              autoComplete="email"
              autoFocus
              fullWidth
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              fullWidth
              isLoading={isSubmitting}
              disabled={isSubmitting || (retryCountdown !== null && retryCountdown > 0)}
              className={styles.submitBtn}
            >
              {retryCountdown !== null && retryCountdown > 0
                ? `Thử lại sau (${retryCountdown}s)`
                : 'GỬI YÊU CẦU'}
            </Button>
          </form>

          {/* 5. Chuyển đổi quay lại đăng nhập */}
          <div className={styles.footerActions}>
            <p className={styles.promptText}>
              Nhớ lại mật khẩu?{' '}
              <Link to="/login" className={styles.switchLink}>
                Quay lại đăng nhập
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default ForgotPasswordPage
