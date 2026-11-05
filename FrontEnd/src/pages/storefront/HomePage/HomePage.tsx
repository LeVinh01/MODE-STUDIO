import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Truck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { ProductCard } from '@/components/storefront/ProductCard'
import { MOCK_PRODUCTS } from '@/mocks/products'
import { STORE_SERVICE_HIGHLIGHTS } from '@/config/store'
import { formatCurrency } from '@/utils/formatters'
import styles from './HomePage.module.scss'

export const HomePage = () => {
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({
    'prod-001': true,
  })

  const handleToggleWishlist = (productId: string) => {
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  // 1. Calculate dynamic category counts from mock data
  const womenCount = MOCK_PRODUCTS.filter(
    (p) => p.category.slug === 'women',
  ).length
  const menCount = MOCK_PRODUCTS.filter((p) => p.category.slug === 'men').length
  const accessoriesCount = MOCK_PRODUCTS.filter(
    (p) => p.category.slug === 'accessories',
  ).length

  // 2. Featured new arrivals (first 4 items)
  const newArrivals = MOCK_PRODUCTS.slice(0, 4)

  // 3. AI Styling mockup items (3 complementary items from mock products)
  const aiMockupItems = [
    MOCK_PRODUCTS[0], // Blazer Len Cashmere
    MOCK_PRODUCTS[4], // Quần Tây Xếp Ly
    MOCK_PRODUCTS[5], // Túi Da Bò Ý
  ]

  // Icon mapping for service highlights
  const serviceIcons = {
    Truck: <Truck size={24} aria-hidden="true" />,
    RefreshCw: <RefreshCw size={24} aria-hidden="true" />,
    ShieldCheck: <ShieldCheck size={24} aria-hidden="true" />,
    Sparkles: <Sparkles size={24} aria-hidden="true" />,
  }

  return (
    <div className={styles.homePage}>
      {/* ====================================================================
          1. HERO EDITORIAL SECTION (Only single <h1> on the entire page)
          ==================================================================== */}
      <section className={styles.heroSection} aria-labelledby="hero-heading">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.heroTagline}>May Đo Hiện Đại &amp; Tối Giản</span>
              <h1 id="hero-heading" className={styles.heroTitle}>
                Vẻ Đẹp Vượt Thời Gian Trong Từng Đường May
              </h1>
              <p className={styles.heroLead}>
                Khám phá bộ sưu tập thời trang may đo mang tinh thần Modern Luxury.
                Từng đường kim, mũi chỉ và chất liệu tự nhiên thượng hạng được chế tác
                tinh xảo để tôn vinh sự thanh lịch trường tồn.
              </p>
              <div className={styles.heroActions}>
                <Button to="/products" variant="primary" size="lg">
                  Khám Phá Bộ Sưu Tập
                </Button>
                <Button to="/products?category=women" variant="secondary" size="lg">
                  Xem Lookbook Mùa Thu
                </Button>
              </div>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.heroVisualInner}>
                <span className={styles.heroMonogram}>MODE STUDIO</span>
                <span className={styles.heroSeason}>AUTUMN / WINTER 2026</span>
                <span className={styles.heroVisualCaption}>
                  Haute Couture &amp; Ready-to-Wear
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          2. CATEGORY STRIP SECTION
          ==================================================================== */}
      <section className={styles.categorySection} aria-labelledby="category-heading">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTagline}>BỘ SƯU TẬP CHỦ ĐẠO</span>
              <h2 id="category-heading" className={styles.sectionTitle}>
                Danh Mục Tuyển Chọn
              </h2>
              <p className={styles.sectionSubtitle}>
                Các phân khúc thiết kế may đo cao cấp định hình phong cách cá nhân
              </p>
            </div>
          </div>

          <div className={styles.categoryGrid}>
            {/* Category 1: Women */}
            <Link to="/products?category=women" className={styles.categoryCard}>
              <div className={styles.categoryVisual} aria-hidden="true">
                <span className={styles.categoryPlaceholderIcon}>WOMEN</span>
              </div>
              <div className={styles.categoryContent}>
                <span className={styles.categoryCount}>{womenCount} Thiết Kế</span>
                <h3 className={styles.categoryName}>Thời Trang Nữ</h3>
                <span className={styles.categoryCta}>
                  Khám Phá Ngay <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Category 2: Men */}
            <Link to="/products?category=men" className={styles.categoryCard}>
              <div className={styles.categoryVisual} aria-hidden="true">
                <span className={styles.categoryPlaceholderIcon}>MEN</span>
              </div>
              <div className={styles.categoryContent}>
                <span className={styles.categoryCount}>{menCount} Thiết Kế</span>
                <h3 className={styles.categoryName}>Thời Trang Nam</h3>
                <span className={styles.categoryCta}>
                  Khám Phá Ngay <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Category 3: Accessories */}
            <Link to="/products?category=accessories" className={styles.categoryCard}>
              <div className={styles.categoryVisual} aria-hidden="true">
                <span className={styles.categoryPlaceholderIcon}>ACC</span>
              </div>
              <div className={styles.categoryContent}>
                <span className={styles.categoryCount}>
                  {accessoriesCount} Thiết Kế
                </span>
                <h3 className={styles.categoryName}>Phụ Kiện Tinh Tuyển</h3>
                <span className={styles.categoryCta}>
                  Khám Phá Ngay <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. NEW ARRIVALS (FEATURED PRODUCTS GRID)
          ==================================================================== */}
      <section
        className={styles.newArrivalsSection}
        aria-labelledby="new-arrivals-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTagline}>SEASONAL HIGHLIGHTS</span>
              <h2 id="new-arrivals-heading" className={styles.sectionTitle}>
                Hàng Mới Về
              </h2>
            </div>
            <Link to="/products" className={styles.viewAllLink}>
              Xem Tất Cả Thiết Kế <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles.productsGrid}>
            {newArrivals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={Boolean(wishlist[product.id])}
                onWishlistToggle={handleToggleWishlist}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. EDITORIAL LOOKBOOK / BRAND CAMPAIGN BANNER
          ==================================================================== */}
      <section
        className={styles.lookbookSection}
        aria-labelledby="lookbook-heading"
      >
        <div className={styles.container}>
          <div className={styles.lookbookContainer}>
            <span className={styles.lookbookTagline}>THE EDITORIAL ESSAY</span>
            <h2 id="lookbook-heading" className={styles.lookbookTitle}>
              The Autumn Transcendence 2026
            </h2>
            <blockquote className={styles.lookbookQuote}>
              &ldquo;Thời trang không chỉ là trang phục bạn khoác lên mình, mà là
              ngôn ngữ tĩnh lặng của sự tự tin, phẩm vị và chuẩn mực thanh lịch
              vượt thời gian.&rdquo;
            </blockquote>
            <div className={styles.lookbookActions}>
              <Button to="/products" variant="primary" size="md">
                Khám Phá Chiến Dịch
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. AI STYLING RECOMMENDATION (STATIC PLACEHOLDER)
          ==================================================================== */}
      {/* AI Styling & Recommendation Area: Static placeholder reserved for future Machine Learning integration */}
      <section
        className={styles.aiStylingSection}
        aria-labelledby="ai-styling-heading"
      >
        <div className={styles.container}>
          <div className={styles.aiHeader}>
            <div className={styles.aiBadgeRow}>
              <span className={styles.aiSparkleIcon}>
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <Badge variant="luxury" size="sm">
                TÍNH NĂNG ĐANG PHÁT TRIỂN
              </Badge>
            </div>
            <h2 id="ai-styling-heading" className={styles.sectionTitle}>
              Gợi Ý Phối Đồ Dành Riêng Cho Bạn
            </h2>
            <p className={styles.aiDesc}>
              Hệ thống ứng dụng trí tuệ nhân tạo (AI) giúp gợi ý sản phẩm và phối đồ
              may đo thông minh theo phong cách cá nhân, gam màu ưa chuộng và hoàn cảnh
              xuất hiện của bạn.
            </p>
          </div>

          <div className={styles.aiMockupGrid}>
            {/* Left: Complete Look Preview */}
            <div className={styles.aiLookPreview}>
              <div className={styles.aiLookVisual} aria-hidden="true">
                <span className={styles.aiLookVisualMonogram}>LOOK 01</span>
                <span className={styles.aiLookVisualSub}>
                  The Monochrome Elegance
                </span>
              </div>
              <div className={styles.aiLookMeta}>
                <div className={styles.aiMetaRow}>
                  <span className={styles.aiMetaLabel}>Phong cách:</span>
                  <span className={styles.aiMetaValue}>Minimalist Luxury</span>
                </div>
                <div className={styles.aiMetaRow}>
                  <span className={styles.aiMetaLabel}>Tông màu:</span>
                  <span className={styles.aiMetaValue}>Taupe, Đen &amp; Kem</span>
                </div>
                <div className={styles.aiMetaRow}>
                  <span className={styles.aiMetaLabel}>Dịp sử dụng:</span>
                  <span className={styles.aiMetaValue}>
                    Công sở cao cấp &amp; Tiệc tối
                  </span>
                </div>
                <div className={styles.aiMetaRow}>
                  <span className={styles.aiMetaLabel}>Mức độ tương thích:</span>
                  <span className={styles.aiMetaBadge}>
                    Phù hợp cao (Ví dụ minh họa)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Component items in the curated outfit */}
            <div className={styles.aiOutfitsSide}>
              <h3 className={styles.aiOutfitsTitle}>
                Các Thiết Kế Trong Set Đồ (Minh Họa)
              </h3>

              <div className={styles.aiItemsList}>
                {aiMockupItems.map((item) => (
                  <div key={item.id} className={styles.aiItemRow}>
                    <div className={styles.aiItemThumb} aria-hidden="true">
                      <span>{item.category.name.slice(0, 3).toUpperCase()}</span>
                    </div>
                    <div className={styles.aiItemInfo}>
                      <span className={styles.aiItemCategory}>
                        {item.category.name}
                      </span>
                      <span className={styles.aiItemName}>{item.name}</span>
                      <span className={styles.aiItemPrice}>
                        {formatCurrency(item.basePrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.aiActionBox}>
                <Button variant="secondary" size="md" disabled fullWidth>
                  Trải Nghiệm Phối Đồ Cùng AI (Sắp Ra Mắt)
                </Button>
                <span className={styles.aiFootnote}>
                  * Tính năng khóa luận tốt nghiệp đang được hoàn thiện thuật toán
                  gợi ý và phối đồ thông minh.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. SERVICE HIGHLIGHTS (BRAND VALUE PROPOSITION)
          ==================================================================== */}
      <section className={styles.servicesSection} aria-label="Cam kết dịch vụ">
        <div className={styles.container}>
          <div className={styles.servicesGrid}>
            {STORE_SERVICE_HIGHLIGHTS.map((service) => (
              <div key={service.id} className={styles.serviceCard}>
                <div className={styles.serviceIconWrapper}>
                  {serviceIcons[service.iconName]}
                </div>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
                <p className={styles.serviceDesc}>{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
