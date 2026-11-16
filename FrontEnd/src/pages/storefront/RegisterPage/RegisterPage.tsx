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
import styles from './RegisterPage.module.scss'

export const RegisterPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized)

  // Lưu và chuyển tiếp target redirect
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

  // Countdown timer cho 429
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
              'Đã có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.',
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
      <h1 className={styles.tagline}>ĐĂNG KÝ</h1>

      {/* 3. Cảnh báo lỗi chung */}
      {generalError && (
        <div className={styles.errorAlert} role="alert" aria-live="polite">
          <span className={styles.errorDot} aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      )}

      {/* 4. Form đăng ký 5 trường với Floating Label */}
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {/* Trường 1: Họ và tên */}
        <FloatingInput
          id="register-fullname"
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
        />

        {/* Trường 2: Email */}
        <FloatingInput
          id="register-email"
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
          fullWidth
          disabled={isSubmitting}
        />

        {/* Trường 3: Số điện thoại (tùy chọn) */}
        <FloatingInput
          id="register-phone"
          type="tel"
          label="Số điện thoại"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            if (fieldErrors.phone) {
              setFieldErrors((prev) => ({ ...prev, phone: undefined }))
            }
          }}
          errorMessage={fieldErrors.phone}
          helperText="Tùy chọn - Dùng để cập nhật giao nhận đơn hàng"
          autoComplete="tel"
          fullWidth
          disabled={isSubmitting}
        />

        {/* Trường 4: Mật khẩu */}
        <PasswordInput
          id="register-password"
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
          helperText="Tối thiểu 8 ký tự"
          autoComplete="new-password"
          fullWidth
          disabled={isSubmitting}
        />

        {/* Trường 5: Xác nhận mật khẩu (BẮT BUỘC GIỮ) */}
        <PasswordInput
          id="register-password-confirmation"
          label="Xác nhận mật khẩu"
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
          disabled={isButtonDisabled}
          className={styles.submitBtn}
        >
          {retryCountdown !== null && retryCountdown > 0
            ? `Thử lại sau (${retryCountdown}s)`
            : 'ĐĂNG KÝ THÀNH VIÊN'}
        </Button>
      </form>

      {/* 5. Chuyển đổi sang đăng nhập (Đã bỏ dòng chữ Trở về trang chủ) */}
      <div className={styles.footerActions}>
        <p className={styles.promptText}>
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            state={{ from: fromState }}
            className={styles.switchLink}
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
