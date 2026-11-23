import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Button, PasswordInput, FloatingInput } from '@/components/common'
import { authService } from '@/services/api/authService'
import { BRAND_NAME, BRAND_LOGOS, formatPageTitle } from '@/config/brand'
import { useAppSelector } from '@/store/hooks'
import {
  selectIsAuthenticated,
  selectIsAuthInitialized,
} from '@/store/slices/authSlice'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import type { ApiValidationErrorResponse } from '@/types/auth'
import styles from './ResetPasswordPage.module.scss'

export const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''
  const isMissingParams = !token.trim() || !email.trim()

  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized)

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string
    passwordConfirmation?: string
  }>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isTokenInvalid, setIsTokenInvalid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)
  const [logoError, setLogoError] = useState(false)

  // Document Title
  useEffect(() => {
    document.title = formatPageTitle('Đặt lại mật khẩu')
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
    const errors: { password?: string; passwordConfirmation?: string } = {}

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu mới.'
    } else if (password.length < 8) {
      errors.password = 'Mật khẩu phải chứa ít nhất 8 ký tự.'
    }

    if (!passwordConfirmation) {
      errors.passwordConfirmation = 'Vui lòng xác nhận mật khẩu mới.'
    } else if (passwordConfirmation !== password) {
      errors.passwordConfirmation = 'Mật khẩu xác nhận không khớp.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
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
      await authService.resetPassword({
        email: email.trim(),
        token: token.trim(),
        password,
        passwordConfirmation,
      })

      // Điều hướng về trang đăng nhập kèm thông báo thành công
      navigate('/login', {
        replace: true,
        state: {
          successNotice: 'Đặt lại mật khẩu thành công, hãy đăng nhập.',
        },
      })
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response

        if (status === 422) {
          const valErrors = (data as ApiValidationErrorResponse).errors || {}
          const newFieldErrors: { password?: string; passwordConfirmation?: string } = {}

          if (valErrors.password?.[0]) {
            newFieldErrors.password = valErrors.password[0]
          }
          if (valErrors.password_confirmation?.[0]) {
            newFieldErrors.passwordConfirmation = valErrors.password_confirmation[0]
          }
          setFieldErrors(newFieldErrors)

          const message =
            (data as ApiValidationErrorResponse).message ||
            'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'

          if (
            message.toLowerCase().includes('không hợp lệ') ||
            message.toLowerCase().includes('hết hạn') ||
            valErrors.token ||
            valErrors.email
          ) {
            setIsTokenInvalid(true)
          } else {
            setGeneralError(message)
          }
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
      <h1 className={styles.tagline}>ĐẶT LẠI MẬT KHẨU</h1>

      {isMissingParams || isTokenInvalid ? (
        <div className={styles.invalidCard} role="alert">
          <p style={{ margin: '0 0 10px 0', fontWeight: 500 }}>
            Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </p>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8125rem' }}>
            Vì lý do bảo mật, mỗi liên kết chỉ có hiệu lực trong vòng 60 phút và chỉ sử dụng được một lần duy nhất.
          </p>
          <Link to="/forgot-password" className={styles.actionBtn}>
            YÊU CẦU LIÊN KẾT MỚI
          </Link>
          <div className={styles.footerActions} style={{ marginTop: '20px' }}>
            <Link to="/login" className={styles.switchLink}>
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.accountTarget}>
            Thiết lập mật khẩu mới cho tài khoản: <strong>{email}</strong>
          </p>

          {/* 3. Cảnh báo lỗi chung */}
          {generalError && (
            <div className={styles.errorAlert} role="alert" aria-live="polite">
              <span className={styles.errorDot} aria-hidden="true" />
              <span>{generalError}</span>
            </div>
          )}

          {/* 4. Form đặt lại mật khẩu */}
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* Trường email hiển thị dạng chỉ đọc */}
            <FloatingInput
              id="reset-password-email"
              type="email"
              label="Email"
              value={email}
              readOnly
              disabled
              fullWidth
            />

            {/* Mật khẩu mới */}
            <PasswordInput
              id="reset-password"
              label="Mật khẩu mới"
              variant="floating"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }
              }}
              errorMessage={fieldErrors.password}
              helperText="Tối thiểu 8 ký tự"
              autoComplete="new-password"
              autoFocus
              fullWidth
              disabled={isSubmitting}
            />

            {/* Xác nhận mật khẩu mới */}
            <PasswordInput
              id="reset-password-confirmation"
              label="Xác nhận mật khẩu mới"
              variant="floating"
              value={passwordConfirmation}
              onChange={(e) => {
                setPasswordConfirmation(e.target.value)
                if (fieldErrors.passwordConfirmation) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    passwordConfirmation: undefined,
                  }))
                }
              }}
              errorMessage={fieldErrors.passwordConfirmation}
              autoComplete="new-password"
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
                : 'ĐẶT LẠI MẬT KHẨU'}
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

export default ResetPasswordPage
