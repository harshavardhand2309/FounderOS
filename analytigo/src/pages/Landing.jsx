import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { css } from '../utils/css.js'
import { useCountUp } from '../hooks/useCountUp.js'
import { useStickyNav } from '../hooks/useStickyNav.js'
import LandingView from '../components/LandingView.jsx'
import TrailerModal, { warmTrailer, cancelWarm } from '../components/TrailerModal.jsx'
import useHashFlag from '../hooks/useHashFlag.js'
import useFullBleed from '../hooks/useFullBleed.js'

// One source of truth for the trailer, so the poster, the <video> and the
// hover-warm can never drift apart.
const TRAILER = '/assets/Highlight-Pickleball.mp4'
const TRAILER_POSTER = '/assets/Highlight-Pickleball-poster.jpg'

// Pickleball page — a single hero screen.
export default function Landing() {
  const rootRef = useRef(null)
  const navRef = useRef(null)
  const videoRef = useRef(null)
  // hash-driven so the browser Back button closes the trailer
  const [trailerOpen, openTrailer, closeTrailer] = useHashFlag('trailer')

  // one 100vh hero, no scroll — drop the reserved scrollbar strip so the video
  // and its gradients reach the right edge
  useFullBleed()

  // Always open at the very top — never inherit the scroll position from the
  // previous route (e.g. the homepage).
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useCountUp(rootRef, [])
  useStickyNav(navRef, [])

  // Keep the hero video reliably playing (autoplay can be refused; loop on end).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    v.loop = true
    const onEnded = () => {
      try {
        v.currentTime = 0
        v.play()
      } catch {
        /* ignore */
      }
    }
    v.addEventListener('ended', onEnded)
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
    return () => v.removeEventListener('ended', onEnded)
  }, [])

  return (
    <div ref={rootRef} style={css('min-height:100vh;background:#0a0b0d;overflow-x:hidden;position:relative;isolation:isolate')}>
      {/* fine noise overlay */}
      <div style={css('position:fixed;inset:0;z-index:200;pointer-events:none;opacity:.022;mix-blend-mode:overlay;background-image:radial-gradient(rgba(255,255,255,.9) .5px,transparent .6px);background-size:3px 3px')} />

      <LandingView
        navRef={navRef}
        videoRef={videoRef}
        onWatchTrailer={() => openTrailer()}
        onPrepareTrailer={() => warmTrailer(TRAILER)}
        onCancelTrailer={cancelWarm}
      />

      <TrailerModal
        open={trailerOpen}
        onClose={closeTrailer}
        src={TRAILER}
        poster={TRAILER_POSTER}
        title="Lvl-Up Pickleball trailer"
        accent="#e8232e"
      />
    </div>
  )
}
