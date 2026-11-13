import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useBlocker } from 'react-router-dom'
import { User as UserIcon, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Input, PasswordInput, Button } from '@/components/common'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { Modal } from '@/components/feedback/Modal'
import { authService } from '@/services/api/authService'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectCurrentUser, setUser } from '@/store/slices/authSlice'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils/apiError'
import styles from './AccountPage.module.scss'

const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/

export const AccountPage = () => {
  const dispatch = useAppDispatch()
  const currentUser = useAppSelector(selectCurrentUser)

  // ---------------------------------------------------------
  // 1. STATE THÔNG TIN CÁ NHÂN
  // ---------------------------------------------------------
  const [fullName, setFullName] = useState(currentUser?.fullName || '')
  const [phone, setPhone] = useState(currentUser?.phone || '')

  const [profileErrors, setProfileErrors] = useState<{
    fullName?: string
    phone?: string
  }>({})
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null)
  const [profileGeneralError, setProfileGeneralError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Kiểm tra trạng thái thay đổi chưa lưu (dirty)
  const isProfileDirty =
    Boolean(currentUser) &&
    (fullName.trim() !== (currentUser?.fullName || '').trim() ||
      phone.trim() !== (currentUser?.phone || '').trim())

  // Cảnh báo rời trang qua useBlocker (React Router v6 data router)
  const blocker = useBlocker(
    useCallback(
      ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: { pathname: string }
        nextLocation: { pathname: string }
      }) => isProfileDirty && !isSavingProfile && currentLocation.pathname !== nextLocation.pathname,
      [isProfileDirty, isSavingProfile],
    ),
  )

  // Cảnh báo F5 / đóng tab khi form thông tin dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProfileDirty && !isSavingProfile) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isProfileDirty, isSavingProfile])

  // Xử lý lưu thông tin cá nhân
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileSuccessMsg(null)
    setProfileGeneralError(null)
    setProfileErrors({})

    const trimmedName = fullName.trim()
    const trimmedPhone = phone.trim().replace(/[\s.]/g, '')

    // Validate client-side
    const nextErrors: { fullName?: string; phone?: string } = {}
    if (!trimmedName) {
      nextErrors.fullName = 'Vui lòng nhập họ và tên.'
    } else if (trimmedName.length > 150) {
      nextErrors.fullName = 'Họ và tên không được vượt quá 150 ký tự.'
    }

    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      nextErrors.phone =
        'Số điện thoại không hợp lệ (yêu cầu số điện thoại Việt Nam 10 chữ số).'
    }

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors)
      return
    }

    setIsSavingProfile(true)
    try {
      const res = await authService.updateProfile({
        fullName: trimmedName,
        phone: trimmedPhone || null,
      })

      dispatch(setUser(res.user))
      setFullName(res.user.fullName)
      setPhone(res.user.phone || '')
      setProfileSuccessMsg('Cập nhật thông tin tài khoản thành công.')
    } catch (err: unknown) {
      const fieldErrs = getApiFieldErrors(err)
      const mappedFieldErrs: { fullName?: string; phone?: string } = {}
      if (fieldErrs.full_name) mappedFieldErrs.fullName = fieldErrs.full_name
      if (fieldErrs.phone) mappedFieldErrs.phone = fieldErrs.phone

      if (Object.keys(mappedFieldErrs).length > 0) {
        setProfileErrors(mappedFieldErrs)
      } else {
        setProfileGeneralError(
          getApiErrorMessage(err, 'Không thể cập nhật thông tin tài khoản. Vui lòng thử lại.'),
        )
      }
    } finally {
      setIsSavingProfile(false)
    }
  }

  // ---------------------------------------------------------
  // 2. STATE ĐỔI MẬT KHẨU
  // ---------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null)
  const [passwordGeneralError, setPasswordGeneralError] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Xử lý đổi mật khẩu
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordSuccessMsg(null)
    setPasswordGeneralError(null)
    setPasswordErrors({})

    // Validate client-side
    const nextErrors: {
      currentPassword?: string
      newPassword?: string
      confirmPassword?: string
    } = {}

    if (!currentPassword) {
      nextErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    }

    if (!newPassword) {
      nextErrors.newPassword = 'Vui lòng nhập mật khẩu mới.'
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'Mật khẩu mới phải có tối thiểu 8 ký tự.'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.'
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Xác nhận mật khẩu mới không khớp.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors)
      return
    }

    setIsChangingPassword(true)
    try {
      const res = await authService.updatePassword({
        currentPassword,
        password: newPassword,
        passwordConfirmation: confirmPassword,
      })

      // Đổi thành công: xóa form và hiển thị thông báo
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccessMsg(
        res.message ||
          'Đổi mật khẩu thành công. Các phiên đăng nhập trên thiết bị khác đã được thu hồi.',
      )
    } catch (err: unknown) {
      const fieldErrs = getApiFieldErrors(err)
      const mappedErrors: {
        currentPassword?: string
        newPassword?: string
        confirmPassword?: string
      } = {}

      if (fieldErrs.current_password) {
        mappedErrors.currentPassword = fieldErrs.current_password
      }
      if (fieldErrs.password) {
        mappedErrors.newPassword = fieldErrs.password
      }
      if (fieldErrs.password_confirmation) {
        mappedErrors.confirmPassword = fieldErrs.password_confirmation
      }

      if (Object.keys(mappedErrors).length > 0) {
        setPasswordErrors(mappedErrors)
      } else {
        setPasswordGeneralError(
          getApiErrorMessage(err, 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.'),
        )
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  const breadcrumbsItems = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Thông tin tài khoản' },
  ]

  return (
    <div className={styles.accountPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Breadcrumbs items={breadcrumbsItems} />
          <h1 className={styles.title}>Thông Tin Tài Khoản</h1>
          <p className={styles.subtitle}>
            Quản lý hồ sơ cá nhân và cập nhật mật khẩu bảo mật tài khoản MODE STUDIO
          </p>
        </div>

        <div className={styles.grid}>
          {/* ========================================================
              CARD 1: THÔNG TIN CÁ NHÂN
              ======================================================== */}
          <section className={styles.card} aria-labelledby="profile-heading">
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} aria-hidden="true">
                <UserIcon size={20} />
              </div>
              <div>
                <h2 id="profile-heading" className={styles.cardTitle}>
                  Hồ Sơ Cá Nhân
                </h2>
                <p className={styles.cardDesc}>
                  Cập nhật thông tin họ tên và số điện thoại liên lạc của bạn
                </p>
              </div>
            </div>

            {profileSuccessMsg && (
              <div className={styles.alertSuccess} role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileGeneralError && (
              <div className={styles.alertError} role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{profileGeneralError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className={styles.form} noValidate>
              <div className={styles.formRow}>
                <Input
                  id="profile-fullname"
                  label="Họ và tên *"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (profileErrors.fullName) {
                      setProfileErrors((prev) => ({ ...prev, fullName: undefined }))
                    }
                  }}
                  errorMessage={profileErrors.fullName}
                  disabled={isSavingProfile}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  fullWidth
                  required
                />

                <Input
                  id="profile-email"
                  type="email"
                  label="Địa chỉ email (Chỉ xem)"
                  value={currentUser?.email || ''}
                  disabled
                  helperText="Email tài khoản cố định và không thể thay đổi."
                  fullWidth
                />
              </div>

              <div className={styles.formRow}>
                <Input
                  id="profile-phone"
                  type="tel"
                  label="Số điện thoại"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (profileErrors.phone) {
                      setProfileErrors((prev) => ({ ...prev, phone: undefined }))
                    }
                  }}
                  errorMessage={profileErrors.phone}
                  helperText="Định dạng số di động Việt Nam (10 chữ số)"
                  disabled={isSavingProfile}
                  placeholder="0901234567"
                  maxLength={15}
                  fullWidth
                />
              </div>

              <div className={styles.actions}>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSavingProfile}
                  disabled={!isProfileDirty || isSavingProfile}
                >
                  Lưu Thay Đổi
                </Button>
              </div>
            </form>
          </section>

          {/* ========================================================
              CARD 2: ĐỔI MẬT KHẨU
              ======================================================== */}
          <section className={styles.card} aria-labelledby="password-heading">
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon} aria-hidden="true">
                <Lock size={20} />
              </div>
              <div>
                <h2 id="password-heading" className={styles.cardTitle}>
                  Bảo Mật &amp; Đổi Mật Khẩu
                </h2>
                <p className={styles.cardDesc}>
                  Đổi mật khẩu định kỳ giúp bảo vệ tài khoản và đơn hàng của bạn
                </p>
              </div>
            </div>

            {passwordSuccessMsg && (
              <div className={styles.alertSuccess} role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordGeneralError && (
              <div className={styles.alertError} role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{passwordGeneralError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className={styles.form} noValidate>
              <PasswordInput
                id="current-password"
                label="Mật khẩu hiện tại *"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      currentPassword: undefined,
                    }))
                  }
                }}
                errorMessage={passwordErrors.currentPassword}
                autoComplete="current-password"
                disabled={isChangingPassword}
                placeholder="Nhập mật khẩu hiện tại"
                fullWidth
                required
              />

              <div className={styles.formRow}>
                <PasswordInput
                  id="new-password"
                  label="Mật khẩu mới *"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (passwordErrors.newPassword) {
                      setPasswordErrors((prev) => ({
                        ...prev,
                        newPassword: undefined,
                      }))
                    }
                  }}
                  errorMessage={passwordErrors.newPassword}
                  helperText={!passwordErrors.newPassword ? 'Tối thiểu 8 ký tự' : undefined}
                  autoComplete="new-password"
                  disabled={isChangingPassword}
                  placeholder="Nhập mật khẩu mới"
                  fullWidth
                  required
                />

                <PasswordInput
                  id="confirm-password"
                  label="Xác nhận mật khẩu mới *"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (passwordErrors.confirmPassword) {
                      setPasswordErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }))
                    }
                  }}
                  errorMessage={passwordErrors.confirmPassword}
                  autoComplete="new-password"
                  disabled={isChangingPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  fullWidth
                  required
                />
              </div>

              <div className={styles.actions}>
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  isLoading={isChangingPassword}
                  disabled={isChangingPassword}
                >
                  Đổi Mật Khẩu
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Modal Cảnh báo Rời Trang khi có dữ liệu chưa lưu */}
      <Modal
        isOpen={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Xác nhận rời khỏi trang"
        footer={
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => blocker.reset?.()}
            >
              Ở lại
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => blocker.proceed?.()}
            >
              Rời đi
            </Button>
          </div>
        }
      >
        <p className={styles.modalText}>
          Bạn có thay đổi thông tin chưa lưu. Nếu rời khỏi trang lúc này, các thay đổi của bạn sẽ không được bảo lưu.
        </p>
      </Modal>
    </div>
  )
}

export default AccountPage
