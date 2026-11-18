import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryService } from '@/services/api/categoryService'
import { productService } from '@/services/api/productService'
import { HOME_CONFIG, type CategoryGridSectionConfig } from '@/config/homeSections'
import styles from './CategoryIconGrid.module.scss'

export interface CategoryIconGridProps {
  config: CategoryGridSectionConfig
}

interface DisplayCategoryItem {
  name: string
  slug: string
  imageUrl?: string | null
}

export const CategoryIconGrid = ({ config }: CategoryIconGridProps) => {
  const [categories, setCategories] = useState<DisplayCategoryItem[]>([])
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const loadLeafCategories = async () => {
      try {
        const rootCategories = await categoryService.getCategories(signal)
        const hiddenSet = new Set(HOME_CONFIG.hiddenCategorySlugs || [])

        // 1. Chỉ lấy danh mục lá (children của các danh mục gốc), loại trừ hiddenCategorySlugs
        const leafCandidates: {
          name: string
          slug: string
          imageUrl: string | null
          productsCount?: number
        }[] = []

        rootCategories.forEach((parent) => {
          if (parent.children && parent.children.length > 0) {
            parent.children.forEach((child) => {
              if (!hiddenSet.has(child.slug)) {
                leafCandidates.push({
                  name: child.name,
                  slug: child.slug,
                  imageUrl: child.imageUrl || null,
                  productsCount: child.productsCount,
                })
              }
            })
          }
        })

        // 2. Chỉ giữ các danh mục lá có ít nhất 1 sản phẩm published
        const validatedLeaves: DisplayCategoryItem[] = []
        const fallbackCheckCats: typeof leafCandidates = []

        for (const cat of leafCandidates) {
          if (typeof cat.productsCount === 'number') {
            if (cat.productsCount > 0) {
              validatedLeaves.push({
                name: cat.name,
                slug: cat.slug,
                imageUrl: cat.imageUrl,
              })
            }
          } else {
            fallbackCheckCats.push(cat)
          }
        }

        if (fallbackCheckCats.length > 0) {
          const checks = await Promise.allSettled(
            fallbackCheckCats.map(async (cat) => {
              const res = await productService.getProducts(
                { category: cat.slug, perPage: 1 },
                signal
              )
              return { cat, hasProduct: (res.items || []).length > 0 }
            })
          )

          checks.forEach((res) => {
            if (res.status === 'fulfilled' && res.value.hasProduct) {
              validatedLeaves.push({
                name: res.value.cat.name,
                slug: res.value.cat.slug,
                imageUrl: res.value.cat.imageUrl,
              })
            }
          })
        }

        if (!signal.aborted) {
          setCategories(validatedLeaves)
          setIsLoading(false)
        }

        // 3. Với các danh mục chưa có ảnh đại diện do admin upload, lấy ảnh sản phẩm đầu tiên làm fallback
        const missingImageCats = validatedLeaves.filter((c) => !c.imageUrl)
        if (missingImageCats.length > 0) {
          const imageResults = await Promise.allSettled(
            missingImageCats.map(async (cat) => {
              const res = await productService.getProducts(
                { category: cat.slug, perPage: 1 },
                signal
              )
              const firstImg =
                res.items[0]?.mainImage?.url || res.items[0]?.featuredImage || null
              return { slug: cat.slug, img: firstImg }
            })
          )

          if (!signal.aborted) {
            const imgMap: Record<string, string> = {}
            imageResults.forEach((result) => {
              if (result.status === 'fulfilled' && result.value.img) {
                imgMap[result.value.slug] = result.value.img
              }
            })
            setCategoryImages(imgMap)
          }
        }
      } catch {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadLeafCategories()

    return () => {
      controller.abort()
    }
  }, [])

  const handleImageError = (slug: string) => {
    setImageErrors((prev) => ({ ...prev, [slug]: true }))
  }

  if (!isLoading && categories.length === 0) {
    return null
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="category-grid-heading"
      data-header-theme="light"
    >
      <div className={styles.wrapper}>
        <h2 id="category-grid-heading" className={styles.heading}>
          {config.title}
        </h2>

        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={styles.cell}>
                  <div className={styles.iconBox}>
                    <div className={styles.skeletonIcon} />
                  </div>
                  <span className={styles.caption}>...</span>
                </div>
              ))
            : categories.map((cat, index) => {
                const directImage = cat.imageUrl
                const fallbackProductImg = categoryImages[cat.slug]
                const finalImageSrc = directImage || fallbackProductImg
                const hasError = imageErrors[cat.slug]
                const initial = cat.name.trim().charAt(0).toUpperCase()

                return (
                  <Link
                    key={cat.slug}
                    to={`/products?category=${cat.slug}`}
                    className={styles.cell}
                  >
                    <div className={styles.iconBox}>
                      {finalImageSrc && !hasError ? (
                        <img
                          src={finalImageSrc}
                          alt={cat.name}
                          className={styles.iconImage}
                          onError={() => handleImageError(cat.slug)}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={styles.initialFallback}
                          aria-hidden="true"
                          data-index={index}
                        >
                          {initial}
                        </div>
                      )}
                    </div>
                    <span className={styles.caption}>{cat.name}</span>
                  </Link>
                )
              })}
        </div>

        <div className={styles.ctaWrapper}>
          <Link to={config.ctaHref} className={styles.pillButton}>
            {config.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default CategoryIconGrid
