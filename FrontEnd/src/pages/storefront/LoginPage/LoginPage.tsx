import { useState, useEffect, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button, PasswordInput, FloatingInput } from '@/components/common'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { authService } from '@/services/api/authService'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setUser,
  selectIsAuthenticated,
  selectIsAuthInitialized,
} from '@/store/slices/authSlice'
import type { ApiValidationErrorResponse } from '@/types/auth'
import styles from './LoginPage.module.scss'

export const LoginPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized)

  // Lưu và chuyển tiếp target redirect (giữ nguyên pathname và search query)
  const fromState = (
    location.state as { from?: { pathname: string; search?: string } } | undefined
  )?.from
  const redirectTarget = fromState
    ? `${fromState.pathname}${fromState.search || ''}`
    : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  // Redirect if already authenticated (chờ auth khởi tạo xong)
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated) {
      navigate(redirectTarget, { replace: true })
    }
  }, [isAuthInitialized, isAuthenticated, navigate, redirectTarget])

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

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email.'
    }
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.'
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

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await authService.login({
        email: email.trim(),
        password,
      })
      dispatch(setUser(result.user))
      navigate(redirectTarget, { replace: true })
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response

        if (status === 422) {
          const valErrors = (data as ApiValidationErrorResponse).errors || {}
          const newFieldErrors: { email?: string; password?: string } = {}
          if (valErrors.email?.[0]) newFieldErrors.email = valErrors.email[0]
          if (valErrors.password?.[0])
            newFieldErrors.password = valErrors.password[0]
          setFieldErrors(newFieldErrors)
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
              `Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${seconds} giây.`,
          )
        } else if (status === 401) {
          setGeneralError(
            (data as { message?: string })?.message ||
              'Thông tin đăng nhập không chính xác.',
          )
        } else if (status === 403) {
          setGeneralError(
            (data as { message?: string })?.message ||
              'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
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

  const isButtonDisabled =
    isSubmitting || (retryCountdown !== null && retryCountdown > 0)

  // Tránh nhấp nháy UI khi auth đang khởi tạo hoặc đã đăng nhập
  if (!isAuthInitialized || isAuthenticated) {
    return <AuthLoadingScreen />
  }

  return (
    <div className={styles.formWrapper}>
      {/* 1. Logo thương hiệu quay về trang chủ */}
      <div className={styles.logoWrapper}>
        <Link to="/" className={styles.brandLogo} aria-label="MODE STUDIO - Về trang chủ">
          MODE STUDIO
        </Link>
      </div>

      {/* 2. Tiêu đề form */}
      <h1 className={styles.tagline}>ĐĂNG NHẬP</h1>

      {/* 3. Cảnh báo lỗi chung */}
      {generalError && (
        <div className={styles.errorAlert} role="alert" aria-live="polite">
          <span className={styles.errorDot} aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      )}

      {/* 4. Form đăng nhập */}
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <FloatingInput
          id="login-email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (fieldErrors.email) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }))
            }
          }}
          errorMessage={fieldErrors.email}
          autoComplete="email"
          autoFocus
          fullWidth
          disabled={isSubmitting}
        />

        <PasswordInput
          id="login-password"
          label="Mật khẩu"
          variant="floating"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }))
            }
          }}
          errorMessage={fieldErrors.password}
          autoComplete="current-password"
          fullWidth
          disabled={isSubmitting}
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          fullWidth
          isLoading={isSubmitting}
          disabled={isButtonDisabled}
          className={styles.submitBtn}
        >
          {retryCountdown !== null && retryCountdown > 0
            ? `Thử lại sau (${retryCountdown}s)`
            : 'ĐĂNG NHẬP'}
        </Button>
      </form>

      {/* 5. Chuyển đổi sang đăng ký (Đã bỏ dòng chữ Trở về trang chủ) */}
      <div className={styles.footerActions}>
        <p className={styles.promptText}>
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            state={{ from: fromState }}
            className={styles.switchLink}
          >
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
