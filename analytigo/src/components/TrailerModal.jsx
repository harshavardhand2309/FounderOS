import { useEffect, useRef } from 'react'
import { css } from '../utils/css.js'

// Full-screen trailer player. The Watch Trailer buttons on the Tennis and
// Pickleball heroes had no handler at all — they rendered, hovered, and did
// nothing. Now that the trailer is the only call to action on those pages, it
// has to actually play something.
//
// accent is the page's own colour (teal on Tennis, red on Pickleball) so the
// player belongs to the page it opened from.
export default function TrailerModal({ open, onClose, src, poster, title, accent = '#c9f24a' }) {
  const closeRef = useRef(null)
  const videoRef = useRef(null)
  const restoreRef = useRef(null)

  // Esc to close, and keep focus inside the dialog while it is open.
  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      // Pause on unmount so audio never outlives the dialog.
      try { videoRef.current?.pause() } catch { /* ignore */ }
      try { restoreRef.current?.focus?.() } catch { /* ignore */ }
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={css('position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(6,7,9,.86);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)')}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={css('position:relative;width:100%;max-width:1040px;border-radius:16px;overflow:hidden;background:#000;border:1px solid rgba(255,255,255,.14);box-shadow:0 40px 100px rgba(0,0,0,.7)')}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          preload="metadata"
          style={css('display:block;width:100%;height:auto;max-height:78vh;background:#000')}
        />
      </div>

      <button
        ref={closeRef}
        onClick={onClose}
        aria-label="Close trailer"
        style={{
          ...css('position:absolute;top:20px;right:20px;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);color:#eef1f3;cursor:pointer;backdrop-filter:blur(8px)'),
          outlineColor: accent,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
