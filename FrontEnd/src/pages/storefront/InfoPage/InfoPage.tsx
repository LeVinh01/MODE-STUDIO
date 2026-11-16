import { useLocation, Navigate } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { STORE_INFO } from '@/config/store'
import { SIZE_GUIDE_DATA } from '@/config/sizeGuide'
import { INFO_PAGES_CONFIG, type InfoPageConfig } from '@/config/infoPages'
import styles from './InfoPage.module.scss'

export interface InfoPageProps {
  pageId?: string
}

const PATH_TO_PAGE_ID: Record<string, string> = {
  '/policy/returns': 'policy-returns',
  '/size-guide': 'size-guide',
  '/shipping': 'shipping',
  '/faq': 'faq',
  '/about': 'about',
  '/editorial': 'editorial',
  '/stores': 'stores',
  '/contact': 'contact',
}

export const InfoPage = ({ pageId }: InfoPageProps) => {
  const location = useLocation()

  // Xác định page config từ props hoặc pathname
  const resolvedPageId = pageId || PATH_TO_PAGE_ID[location.pathname]
  const config: InfoPageConfig | undefined = resolvedPageId
    ? INFO_PAGES_CONFIG[resolvedPageId]
    : undefined

  if (!config) {
    return <Navigate to="/404" replace />
  }

  const breadcrumbsItems = [
    { label: 'Trang chủ', to: '/' },
    { label: config.breadcrumbLabel },
  ]

  return (
    <article className={styles.infoPage}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Breadcrumbs items={breadcrumbsItems} />
          <h1 className={styles.title}>{config.title}</h1>
          {config.subtitle && (
            <p className={styles.subtitle}>{config.subtitle}</p>
          )}
        </header>

        <div className={styles.content}>
          {config.sections.map((section, idx) => (
            <section key={idx} className={styles.section}>
              {section.title && (
                <h2 className={styles.sectionTitle}>{section.title}</h2>
              )}

              {section.paragraphs?.map((p, pIdx) => (
                <p key={pIdx} className={styles.paragraph}>
                  {p}
                </p>
              ))}

              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <ul className={styles.bulletList}>
                  {section.bulletPoints.map((item, bIdx) => (
                    <li key={bIdx} className={styles.bulletItem}>
                      <span className={styles.bulletDot} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Bảng Kích Cỡ */}
              {section.isSizeTable && (
                <div className={styles.tableWrapper}>
                  <table className={styles.sizeTable}>
                    <thead>
                      <tr>
                        <th scope="col">Kích cỡ</th>
                        <th scope="col">Vòng ngực (cm)</th>
                        <th scope="col">Vòng eo (cm)</th>
                        <th scope="col">Vòng mông (cm)</th>
                        <th scope="col">Chiều cao (cm)</th>
                        <th scope="col">Cân nặng (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SIZE_GUIDE_DATA.map((row) => (
                        <tr key={row.size}>
                          <td className={styles.sizeCell}>{row.size}</td>
                          <td>{row.bust}</td>
                          <td>{row.waist}</td>
                          <td>{row.hips}</td>
                          <td>{row.height}</td>
                          <td>{row.weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Thẻ Thông tin liên hệ / Showroom */}
              {(section.isContactCard || section.isStoreCard) && (
                <div className={styles.contactCard}>
                  <div className={styles.contactRow}>
                    <MapPin size={18} className={styles.contactIcon} aria-hidden="true" />
                    <span>
                      <strong>Địa chỉ showroom:</strong> {STORE_INFO.address}
                    </span>
                  </div>

                  <div className={styles.contactRow}>
                    <Phone size={18} className={styles.contactIcon} aria-hidden="true" />
                    <span>
                      <strong>Hotline hỗ trợ:</strong>{' '}
                      <a
                        href={`tel:${STORE_INFO.hotlineTel}`}
                        className={styles.contactLink}
                      >
                        {STORE_INFO.hotline}
                      </a>{' '}
                      (Cước gọi theo nhà mạng)
                    </span>
                  </div>

                  <div className={styles.contactRow}>
                    <Mail size={18} className={styles.contactIcon} aria-hidden="true" />
                    <span>
                      <strong>Email:</strong>{' '}
                      <a
                        href={`mailto:${STORE_INFO.email}`}
                        className={styles.contactLink}
                      >
                        {STORE_INFO.email}
                      </a>
                    </span>
                  </div>

                  <div className={styles.contactRow}>
                    <Clock size={18} className={styles.contactIcon} aria-hidden="true" />
                    <span>
                      <strong>Thời gian phục vụ:</strong> {STORE_INFO.workingHours}
                    </span>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}

export default InfoPage
