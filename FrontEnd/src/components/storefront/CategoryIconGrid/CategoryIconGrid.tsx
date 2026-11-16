import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryService } from '@/services/api/categoryService'
import { productService } from '@/services/api/productService'
import type { CategoryGridSectionConfig } from '@/config/homeSections'
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
  const [categories, setCategories] = useState<DisplayCategoryItem[]>(() =>
    config.categories.map((c) => ({ name: c.name, slug: c.slug }))
  )
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const loadCategoryImages = async () => {
      setIsLoading(true)
      try {
        const rootCategories = await categoryService.getCategories(signal)

        // Flatten all categories from backend to find image_urls
        const backendMap = new Map<string, string | null>()
        rootCategories.forEach((parent) => {
          backendMap.set(parent.slug, parent.imageUrl || null)
          if (parent.children) {
            parent.children.forEach((child) => {
              backendMap.set(child.slug, child.imageUrl || null)
            })
          }
        })

        // Merge backend images with configured categories in order
        const mergedCategories: DisplayCategoryItem[] = config.categories.map((cfg) => ({
          name: cfg.name,
          slug: cfg.slug,
          imageUrl: backendMap.get(cfg.slug) || null,
        }))

        if (!signal.aborted) {
          setCategories(mergedCategories)
        }

        // For categories without backend imageUrl, fetch first product image
        const missingImageCats = mergedCategories.filter((c) => !c.imageUrl)
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
      } catch {
        // Fallback to configured list without images
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadCategoryImages()

    return () => {
      controller.abort()
    }
  }, [config.categories])

  const handleImageError = (slug: string) => {
    setImageErrors((prev) => ({ ...prev, [slug]: true }))
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
          {categories.map((cat, index) => {
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
                  {isLoading ? (
                    <div className={styles.skeletonIcon} />
                  ) : finalImageSrc && !hasError ? (
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
