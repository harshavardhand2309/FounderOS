import { useEffect, useLayoutEffect, useRef } from 'react'
import { css } from '../utils/css.js'
import { useCountUp } from '../hooks/useCountUp.js'
import { useStickyNav } from '../hooks/useStickyNav.js'
import TennisView from '../components/TennisView.jsx'

const TENNIS_ANALYTICS_UPLOAD_URL = 'https://tennisanalytics-0072.web.app/tennis/upload'

// Tennis page — a single hero screen. Teal theme is exposed as CSS variables on
// the root so every descendant can reference var(--ta) / rgba(var(--tc), x).
export default function Tennis() {
  const rootRef = useRef(null)
  const navRef = useRef(null)
  const videoRef = useRef(null)

  // Always open at the very top — never inherit scroll from the previous route.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useCountUp(rootRef, [])
  useStickyNav(navRef, [])

  // Keep the background video reliably playing (autoplay can be refused; loop on end).
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
    <div
      ref={rootRef}
      style={css(
        '--ta:#0fb6a4;--tc:15,182,164;--ta-bright:#34e6d2;--ta-deep:#0a7a70;min-height:100vh;background:#0a0b0d;overflow-x:hidden;position:relative;isolation:isolate',
      )}
    >
      {/* fine noise overlay */}
      <div style={css('position:fixed;inset:0;z-index:200;pointer-events:none;opacity:.022;mix-blend-mode:overlay;background-image:radial-gradient(rgba(255,255,255,.9) .5px,transparent .6px);background-size:3px 3px')} />

      <TennisView
        navRef={navRef}
        videoRef={videoRef}
        openDashboard={() => window.location.assign(TENNIS_ANALYTICS_UPLOAD_URL)}
      />
    </div>
  )
}
