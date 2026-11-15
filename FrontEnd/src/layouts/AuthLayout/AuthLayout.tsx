import { Outlet, useLocation } from 'react-router-dom'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { AUTH_IMAGES } from '@/config/authImages'

export const AuthLayout = () => {
  const location = useLocation()
  const isRegister = location.pathname.includes('/register')

  // Vị trí ảnh: Đăng nhập = 'right' (Form Trái, Ảnh Phải); Đăng ký = 'left' (Ảnh Trái, Form Phải)
  const imagePosition: 'left' | 'right' = isRegister ? 'left' : 'right'
  const imageSrc = isRegister ? AUTH_IMAGES.register : AUTH_IMAGES.login

  return (
    <AuthSplitLayout
      imagePosition={imagePosition}
      imageSrc={imageSrc}
    >
      <div key={location.pathname}>
        <Outlet />
      </div>
    </AuthSplitLayout>
  )
}

export default AuthLayout
