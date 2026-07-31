import { useCallback, useEffect, useRef, useState } from 'react'
import { css } from '../utils/css.js'

// Start buffering a trailer before it is asked for.
//
// The modal only mounts on click, so until then nothing about the file has been
// fetched and the first two seconds are spent downloading rather than playing.
// Hovering the button is a good enough signal of intent to start early: this
// parks a detached <video preload="auto"> on the URL, and when the modal opens
// its own element requests the same URL and is served from cache.
//
// DWELL is what stops that being expensive. Firing on the first pixel of hover
// means a pointer travelling across the page to something else pays for the
// whole trailer — 10.7MB on the homepage — without ever intending to watch it.
// Resting on the button for a moment is the difference between passing over a
// thing and pointing at it, so the fetch waits that long and a pointer that
// leaves first cancels it. Like a shop door that waits a beat rather than
// opening for everyone walking past.
//
// Cached per src so repeat hovers do not start it again, and deliberately never
// released — the buffer is the whole point, and there is one trailer per page.
const DWELL = 140
const warmed = new Map()
let pending = 0

export function warmTrailer(src) {
  if (!src || warmed.has(src) || typeof document === 'undefined') return
  clearTimeout(pending)
  pending = setTimeout(() => {
    if (warmed.has(src)) return
    try {
      const v = document.createElement('video')
      v.preload = 'auto'
      v.muted = true
      v.src = src
      v.load()
      warmed.set(src, v)
    } catch { /* a failed warm just means the old behaviour */ }
  }, DWELL)
}

// The pointer left before it settled — it was passing through, not aiming.
export function cancelWarm() {
  clearTimeout(pending)
}

// Full-screen trailer. Edge to edge on a black ground, no transport controls —
// it runs like a title sequence, not a video player. Escape or the browser's
// Back button returns to the page (the caller drives `open` from the URL hash,
// so Back gets a real history entry to pop).
//
// The video is letterboxed rather than cropped: `cover` would fill the screen
// but cut whatever sits near the frame edges, which on a trailer means the
// titles and the logo. Black bars on a black ground read as intentional.
export default function TrailerModal({ open, onClose, src, poster, title, accent = '#c9f24a' }) {
  const videoRef = useRef(null)
  const restoreRef = useRef(null)
  const hideTimer = useRef(0)
  const [chromeOn, setChromeOn] = useState(true)
  const [needsSound, setNeedsSound] = useState(false)

  // Reveal the close button on movement, then let it fade back out.
  const wake = useCallback(() => {
    setChromeOn(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setChromeOn(false), 2600)
  }, [])

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement

    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // loader.css sets `html { scrollbar-gutter: stable }`, which keeps reserving
    // the scrollbar strip even once the page stops scrolling — leaving an ~11px
    // band of page beside a supposedly full-screen video. Release it while the
    // trailer owns the screen.
    const root = document.documentElement
    const prevGutter = root.style.scrollbarGutter
    root.style.scrollbarGutter = 'auto'
    wake()

    const v = videoRef.current
    // The click that opened this is a user gesture, so sound is normally
    // allowed. If the browser refuses anyway, fall back to muted and offer the
    // sound back rather than playing a silent trailer with no way to fix it.
    if (v) {
      v.muted = false
      const p = v.play()
      if (p && p.catch) {
        p.catch(() => {
          v.muted = true
          setNeedsSound(true)
          const q = v.play()
          if (q && q.catch) q.catch(() => {})
        })
      }
    }

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      root.style.scrollbarGutter = prevGutter
      clearTimeout(hideTimer.current)
      try { videoRef.current?.pause() } catch { /* ignore */ }
      try { restoreRef.current?.focus?.() } catch { /* ignore */ }
    }
  }, [open, onClose, wake])

  if (!open) return null

  const enableSound = (e) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = false
    setNeedsSound(false)
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseMove={wake}
      onTouchStart={wake}
      style={css('position:fixed;inset:0;z-index:600;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden')}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        playsInline
        // by the time this mounts the user has committed — buffer freely
        preload="auto"
        onEnded={onClose}
        style={css('width:100%;height:100%;object-fit:contain;display:block;background:#000')}
      />

      {/* Sound is only offered when the browser blocked it — otherwise there is
          no control on screen at all. */}
      {needsSound && (
        <button
          onClick={enableSound}
          style={{
            ...css("position:absolute;left:50%;bottom:38px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:9px;font:600 13px/1 'Sora';color:#0a0b0d;background:rgba(255,255,255,.92);border:none;padding:12px 20px;border-radius:999px;cursor:pointer;backdrop-filter:blur(8px)"),
            outlineColor: accent,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M17 8.5a5 5 0 0 1 0 7M20 6a9 9 0 0 1 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Tap for sound
        </button>
      )}

      <button
        onClick={onClose}
        aria-label="Close trailer"
        style={{
          ...css('position:absolute;top:22px;right:22px;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.24);color:#fff;cursor:pointer;backdrop-filter:blur(8px);transition:opacity .3s'),
          opacity: chromeOn ? 1 : 0,
          pointerEvents: chromeOn ? 'auto' : 'none',
          outlineColor: accent,
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <span
        aria-hidden="true"
        style={{
          ...css("position:absolute;top:30px;left:26px;font:600 10.5px/1 'JetBrains Mono';letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.5);transition:opacity .3s"),
          opacity: chromeOn ? 1 : 0,
        }}
      >
        Esc or back to return
      </span>
    </div>
  )
}
