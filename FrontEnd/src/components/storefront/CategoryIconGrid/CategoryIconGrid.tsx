import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryService } from '@/services/api/categoryService'
import { productService } from '@/services/api/productService'
import type { CategoryGridSectionConfig } from '@/config/homeSections'
import styles from './CategoryIconGrid.module.scss'

export interface CategoryIconGridProps {
  config: CategoryGridSectionConfig
}

interface FlattenedCategoryItem {
  id: string
  name: string
  slug: string
  imageUrl?: string | null
}

export const CategoryIconGrid = ({ config }: CategoryIconGridProps) => {
  const [categories, setCategories] = useState<FlattenedCategoryItem[]>([])
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const loadCategories = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const rootCategories = await categoryService.getCategories(signal)

        // Flatten all 7 categories: 3 root parents + 4 children
        const flattened: FlattenedCategoryItem[] = []
        rootCategories.forEach((parent) => {
          flattened.push({
            id: parent.id,
            name: parent.name,
            slug: parent.slug,
            imageUrl: parent.imageUrl,
          })
          if (parent.children && parent.children.length > 0) {
            parent.children.forEach((child) => {
              flattened.push({
                id: child.id,
                name: child.name,
                slug: child.slug,
                imageUrl: child.imageUrl,
              })
            })
          }
        })

        if (!signal.aborted) {
          setCategories(flattened)
        }

        // For categories without an image, fetch first product image in parallel
        const missingImageCats = flattened.filter((c) => !c.imageUrl)
        const imageResults = await Promise.allSettled(
          missingImageCats.map(async (cat) => {
            const res = await productService.getProducts(
              { category: cat.slug, perPage: 1 },
              signal,
            )
            const firstImg =
              res.items[0]?.mainImage?.url || res.items[0]?.featuredImage || null
            return { slug: cat.slug, img: firstImg }
          }),
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
      } catch (err: unknown) {
        if (!signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Không thể tải danh mục.',
          )
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      controller.abort()
    }
  }, [])

  const handleImageError = (slug: string) => {
    setImageErrors((prev) => ({ ...prev, [slug]: true }))
  }

  return (
    <section className={styles.section} aria-labelledby="category-grid-heading">
      <div className={styles.container}>
        <h2 id="category-grid-heading" className={styles.heading}>
          {config.title}
        </h2>

        {isLoading ? (
          <div className={styles.grid}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={styles.skeletonCell}>
                <div className={styles.skeletonCircle} />
                <div className={styles.skeletonText} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.errorNotice}>
            <p>Không thể hiển thị danh mục ({error}).</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {categories.map((cat) => {
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
                  aria-label={`Danh mục: ${cat.name}`}
                >
                  <div className={styles.iconWrapper}>
                    {finalImageSrc && !hasError ? (
                      <img
                        src={finalImageSrc}
                        alt=""
                        loading="lazy"
                        className={styles.iconImage}
                        onError={() => handleImageError(cat.slug)}
                      />
                    ) : (
                      <div className={styles.letterCircle} aria-hidden="true">
                        <span>{initial}</span>
                      </div>
                    )}
                  </div>
                  <span className={styles.caption}>{cat.name}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pill outline button under grid */}
        <div className={styles.buttonWrapper}>
          <Link to={config.ctaHref} className={styles.allCategoriesButton}>
            {config.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
