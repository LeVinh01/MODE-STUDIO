import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause } from 'lucide-react'
import type { HeroSectionConfig } from '@/config/homeSections'
import styles from './HeroVideoBanner.module.scss'

export interface HeroVideoBannerProps {
  config: HeroSectionConfig
}

const checkReducedMotionOrSaveData = (): boolean => {
  if (typeof window === 'undefined') return false
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isSaveData =
    typeof navigator !== 'undefined' &&
    Boolean((navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData)
  return prefersReducedMotion || isSaveData
}

export const HeroVideoBanner = ({ config }: HeroVideoBannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldDisableVideo, setShouldDisableVideo] = useState(checkReducedMotionOrSaveData)
  const [isPlaying, setIsPlaying] = useState(() => !checkReducedMotionOrSaveData())
  const [videoError, setVideoError] = useState(false)
  const [posterError, setPosterError] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setShouldDisableVideo(true)
        setIsPlaying(false)
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const handleTogglePlay = () => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false)
        })
    }
  }

  const showVideo = !shouldDisableVideo && !videoError && Boolean(config.videoSrc)

  return (
    <section
      className={styles.heroSection}
      aria-label="Banner nổi bật"
      data-header-theme="dark"
    >
      {/* Background Media */}
      <div className={styles.mediaContainer}>
        {showVideo ? (
          <video
            ref={videoRef}
            className={styles.video}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={config.poster}
            aria-hidden="true"
            onError={() => setVideoError(true)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          >
            <source src={config.videoSrc} type="video/mp4" />
          </video>
        ) : !posterError && config.poster ? (
          <img
            src={config.poster}
            alt=""
            className={styles.posterImage}
            onError={() => setPosterError(true)}
          />
        ) : (
          <div className={styles.fallbackBlock} aria-hidden="true" />
        )}

        {/* Dark contrast overlay (25% - 30%) */}
        <div className={styles.overlay} aria-hidden="true" />
      </div>

      {/* Foreground Content */}
      <div className={styles.contentContainer}>
        <div className={styles.textContent}>
          <h1 className={styles.title}>{config.title}</h1>
          <p className={styles.subtitle}>{config.subtitle}</p>
          <div className={styles.ctaWrapper}>
            <Link to={config.ctaHref} className={styles.ctaButton}>
              {config.ctaLabel}
            </Link>
          </div>
        </div>

        {/* Video Control on bottom-right */}
        {showVideo && (
          <button
            type="button"
            className={styles.playPauseButton}
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Tạm dừng video' : 'Phát video'}
            aria-pressed={!isPlaying}
          >
            {isPlaying ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} className={styles.playIconOffset} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </section>
  )
}
