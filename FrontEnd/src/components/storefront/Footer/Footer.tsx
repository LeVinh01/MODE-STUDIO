import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FOOTER_SECTIONS, SOCIAL_LINKS } from '@/config/navigation'
import { Input, Button } from '@/components/common'
import { cn } from '@/utils/cn'
import styles from './Footer.module.scss'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const Footer = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const handleNewsletterSubmit = (e: FormEvent) => {
    e.preventDefault()

    const trimmed = email.trim()

    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setStatus('error')
      setStatusMessage('Vui lòng nhập địa chỉ email hợp lệ (ví dụ: name@example.com).')
      return
    }

    // Success simulation (UI only, no API call)
    setStatus('success')
    setStatusMessage('Cảm ơn bạn đã đăng ký! Bạn sẽ sớm nhận được bản tin độc quyền từ MODE STUDIO.')
    setEmail('')
  }

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.container}>
        {/* Newsletter Subscription Section */}
        <section className={styles.newsletterSection} aria-labelledby="newsletter-heading">
          <h2 id="newsletter-heading" className={styles.newsletterTitle}>
            Gia Nhập Thế Giới MODE STUDIO
          </h2>
          <p className={styles.newsletterDesc}>
            Đón nhận các bộ sưu tập may đo giới hạn, bản tin xu hướng mùa mới và lời mời tham dự sự kiện thời trang độc quyền.
          </p>

          <form onSubmit={handleNewsletterSubmit} className={styles.newsletterForm} noValidate>
            <div className={styles.inputWrapper}>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status !== 'idle') {
                    setStatus('idle')
                    setStatusMessage('')
                  }
                }}
                placeholder="Nhập địa chỉ email của bạn..."
                aria-label="Địa chỉ email nhận bản tin"
                fullWidth
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Đăng Ký
            </Button>
          </form>

          {/* Feedback message with aria-live */}
          <div
            aria-live="polite"
            className={cn(
              status !== 'idle' && styles.statusMessage,
              status === 'success' && styles.statusSuccess,
              status === 'error' && styles.statusError,
            )}
          >
            {statusMessage}
          </div>
        </section>

        <div className={styles.divider} aria-hidden="true" />

        {/* Navigation Columns Grid */}
        <div className={styles.columnsGrid}>
          {/* Brand Info Column */}
          <div className={styles.brandColumn}>
            <Link to="/" className={styles.brandLogo}>
              MODE STUDIO
            </Link>
            <p className={styles.brandSlogan}>
              Nền tảng thương mại điện tử thời trang may đo và thiết kế tối giản, tôn vinh vẻ đẹp thanh lịch vượt thời gian.
            </p>
          </div>

          {/* Dynamic Link Columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className={styles.column}>
              <h3 className={styles.columnTitle}>{section.title}</h3>
              <ul className={styles.linksList}>
                {section.items.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className={styles.link}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar: Social Links & Copyright */}
        <div className={styles.bottomBar}>
          <ul className={styles.socialList} aria-label="Mạng xã hội">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target={social.target}
                  rel={social.rel}
                  className={styles.socialLink}
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>

          <p className={styles.copyright}>
            © {new Date().getFullYear()} MODE STUDIO. All rights reserved. Khóa luận tốt nghiệp Thương mại điện tử Thời trang Cao cấp.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

