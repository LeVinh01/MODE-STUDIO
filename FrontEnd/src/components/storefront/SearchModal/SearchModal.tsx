import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Modal } from '@/components/feedback/Modal'
import { Input, Button } from '@/components/common'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSearchOpen } from '@/store/slices/uiSlice'
import styles from './SearchModal.module.scss'

const POPULAR_SUGGESTIONS = [
  'Áo Sơ Mi Lụa',
  'Đầm Dạ Hội Maxi',
  'Áo Khoác Blazer',
  'Quần Linen Ống Rộng',
  'Túi Da Mini',
]

export const SearchModal = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isOpen = useAppSelector((state) => state.ui.isSearchOpen)
  const [query, setQuery] = useState('')

  const handleClose = () => {
    dispatch(setSearchOpen(false))
  }

  const handleSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    handleClose()
    setQuery('')
    navigate(`/products?search=${encodeURIComponent(trimmed)}`)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tìm Kiếm Trong Bộ Sưu Tập"
      description="Nhập tên trang phục, phụ kiện hoặc phong cách thời trang bạn muốn tìm."
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.form} role="search">
        <div className={styles.inputWrapper}>
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm áo blazer, đầm satin, chân váy xếp ly..."
            leftIcon={<Search size={18} />}
            fullWidth
          />
        </div>
        <Button type="submit" variant="primary">
          Tìm
        </Button>
      </form>

      <div className={styles.suggestionsSection}>
        <span className={styles.suggestionsTitle}>Gợi Ý Tìm Kiếm Phổ Biến:</span>
        <div className={styles.tagList}>
          {POPULAR_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSearch(tag)}
              className={styles.tagButton}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default SearchModal

