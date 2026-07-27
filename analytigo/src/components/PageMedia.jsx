import { useEffect, useRef, useState } from 'react'

// Framed media for the stand-alone pages. Video autoplays muted and loops, with
// a real play/pause control so it is not motion the visitor cannot stop, and it
// stays paused for anyone who prefers reduced motion. Images get a slow hover
// zoom instead. Nothing here is decorative-only: each frame carries a caption.

export default function PageMedia({ src, poster, alt, caption, tag, tall = false }) {
  const isVideo = /\.(mp4|webm|mov)$/i.test(src || '')
  const vidRef = useRef(null)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!isVideo) return
    let reduced = false
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* matchMedia is optional */ }
    if (reduced) {
      setPlaying(false)
      vidRef.current?.pause()
    }
  }, [isVideo])

  const toggle = () => {
    const v = vidRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  return (
    <figure className={tall ? 'pg-media pg-media-tall' : 'pg-media'}>
      <div className="pg-media-frame">
        {isVideo ? (
          <>
            <video ref={vidRef} autoPlay muted loop playsInline preload="metadata" poster={poster} aria-label={alt} />
            <button type="button" className="pg-media-btn" onClick={toggle} aria-pressed={!playing}>
              {playing ? '❙❙ Pause' : '▶ Play'}
            </button>
          </>
        ) : (
          <img src={src} alt={alt} loading="lazy" />
        )}
        {tag && <span className="pg-media-tag">{tag}</span>}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
