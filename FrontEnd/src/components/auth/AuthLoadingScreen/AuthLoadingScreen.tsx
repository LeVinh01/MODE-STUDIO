import { Spinner } from '@/components/feedback/Spinner'
import styles from './AuthLoadingScreen.module.scss'

export const AuthLoadingScreen = () => {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.card}>
        <span className={styles.subheading}>MODE STUDIO</span>
        <Spinner size="lg" variant="dark" label="Đang xác thực phiên làm việc" />
        <p className={styles.message}>Đang xác thực phiên làm việc...</p>
      </div>
    </div>
  )
}

export default AuthLoadingScreen
