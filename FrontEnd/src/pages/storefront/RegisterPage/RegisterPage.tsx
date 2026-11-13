import { useState, useEffect, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Input, Button, PasswordInput } from '@/components/common'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { authService } from '@/services/api/authService'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setUser,
  selectIsAuthenticated,
  selectIsAuthInitialized,
} from '@/store/slices/authSlice'
import type { ApiValidationErrorResponse } from '@/types/auth'
import styles from './RegisterPage.module.scss'

export const RegisterPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized)

  // Preserve redirect target
  const fromState = (
    location.state as { from?: { pathname: string; search?: string } } | undefined
  )?.from
  const redirectTarget = fromState
    ? `${fromState.pathname}${fromState.search || ''}`
    : '/'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string
    email?: string
    phone?: string
    password?: string
    passwordConfirmation?: string
  }>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated) {
      navigate(redirectTarget, { replace: true })
    }
  }, [isAuthInitialized, isAuthenticated, navigate, redirectTarget])

  // Countdown timer for 429
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
    const errors: {
      fullName?: string
      email?: string
      phone?: string
      password?: string
      passwordConfirmation?: string
    } = {}

    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên.'
    }

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email.'
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.'
    } else if (password.length < 8) {
      errors.password = 'Mật khẩu phải chứa ít nhất 8 ký tự.'
    }

    if (!passwordConfirmation) {
      errors.passwordConfirmation = 'Vui lòng xác nhận mật khẩu.'
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

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        passwordConfirmation,
      })
      dispatch(setUser(result.user))
      navigate(redirectTarget, { replace: true })
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response

        if (status === 422) {
          const valErrors = (data as ApiValidationErrorResponse).errors || {}
          const newFieldErrors: {
            fullName?: string
            email?: string
            phone?: string
            password?: string
            passwordConfirmation?: string
          } = {}

          if (valErrors.full_name?.[0])
            newFieldErrors.fullName = valErrors.full_name[0]
          if (valErrors.email?.[0]) newFieldErrors.email = valErrors.email[0]
          if (valErrors.phone?.[0]) newFieldErrors.phone = valErrors.phone[0]
          if (valErrors.password?.[0])
            newFieldErrors.password = valErrors.password[0]
          if (valErrors.password_confirmation?.[0])
            newFieldErrors.passwordConfirmation =
              valErrors.password_confirmation[0]

          setFieldErrors(newFieldErrors)
          setGeneralError(
            (data as ApiValidationErrorResponse).message ||
              'Dữ liệu đăng ký chưa hợp lệ.',
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
              `Quá nhiều lượt đăng ký từ mạng của bạn. Vui lòng thử lại sau ${seconds} giây.`,
          )
        } else {
          setGeneralError(
            (data as { message?: string })?.message ||
              'Đã có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại.',
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

  // Không hiển thị form khi auth chưa khởi tạo xong hoặc khi đã đăng nhập (tránh nhảy giao diện)
  if (!isAuthInitialized || isAuthenticated) {
    return <AuthLoadingScreen />
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.subheading}>MODE STUDIO</span>
          <h1 className={styles.title}>Tạo Tài Khoản</h1>
          <p className={styles.description}>
            Tham gia MODE STUDIO để nhận các ưu đãi và quản lý đơn hàng
          </p>
        </div>

        {generalError && (
          <div className={styles.errorAlert} role="alert">
            <span className={styles.errorDot} aria-hidden="true" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            id="register-fullname"
            type="text"
            label="Họ và tên"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (fieldErrors.fullName) {
                setFieldErrors((prev) => ({ ...prev, fullName: undefined }))
              }
            }}
            errorMessage={fieldErrors.fullName}
            autoComplete="name"
            autoFocus
            fullWidth
            disabled={isSubmitting}
            placeholder="Nguyễn Văn A"
          />

          <Input
            id="register-email"
            type="email"
            label="Địa chỉ email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }
            }}
            errorMessage={fieldErrors.email}
            autoComplete="email"
            fullWidth
            disabled={isSubmitting}
            placeholder="ten@example.com"
          />

          <Input
            id="register-phone"
            type="tel"
            label="Số điện thoại (tùy chọn)"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (fieldErrors.phone) {
                setFieldErrors((prev) => ({ ...prev, phone: undefined }))
              }
            }}
            errorMessage={fieldErrors.phone}
            autoComplete="tel"
            fullWidth
            disabled={isSubmitting}
            placeholder="0912345678"
          />

          <PasswordInput
            id="register-password"
            label="Mật khẩu"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }))
              }
            }}
            errorMessage={fieldErrors.password}
            helperText={!fieldErrors.password ? 'Tối thiểu 8 ký tự' : undefined}
            autoComplete="new-password"
            fullWidth
            disabled={isSubmitting}
            placeholder="••••••••"
          />

          <PasswordInput
            id="register-password-confirmation"
            label="Xác nhận mật khẩu"
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
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            disabled={isButtonDisabled}
            className={styles.submitBtn}
          >
            {retryCountdown !== null && retryCountdown > 0
              ? `Thử lại sau (${retryCountdown}s)`
              : 'Đăng Ký Tài Khoản'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.loginPrompt}>
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              state={{ from: fromState }}
              className={styles.loginLink}
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
