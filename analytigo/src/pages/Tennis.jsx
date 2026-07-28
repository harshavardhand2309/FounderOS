import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { css } from '../utils/css.js'
import { useCountUp } from '../hooks/useCountUp.js'
import { useStickyNav } from '../hooks/useStickyNav.js'
import TennisView from '../components/TennisView.jsx'

// The analytics dashboard pulls in three.js, recharts and the Excel parser.
// Keeping it behind lazy() means the Tennis page itself stays light and none
// of that is downloaded until someone actually asks for their numbers.
const TennisAnalyticsApp = lazy(() => import('../dash/TennisAnalyticsApp.tsx'))

// Tennis page — a single hero screen. Teal theme is exposed as CSS variables on
// the root so every descendant can reference var(--ta) / rgba(var(--tc), x).
export default function Tennis() {
  const rootRef = useRef(null)
  const navRef = useRef(null)
  const videoRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Analytics is a state of this page, not a different page — the hero stays
  // mounted underneath. Driving it off the URL keeps Back/Forward working.
  const dashOpen = pathname.startsWith('/tennis/analytics')

  // Always open at the very top — never inherit scroll from the previous route.
  useLayoutEffect(() => {
    if (!dashOpen) window.scrollTo(0, 0)
  }, [dashOpen])

  useCountUp(rootRef, [])
  useStickyNav(navRef, [])

  // Don't let the page behind the dashboard scroll with it.
  useEffect(() => {
    if (!dashOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [dashOpen])

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
        openDashboard={() => navigate('/tennis/analytics')}
      />

      {dashOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tennis analytics"
          style={css('position:fixed;inset:0;z-index:300;overflow-y:auto;overscroll-behavior:contain;background:#0c0a1f')}
        >
          <Suspense fallback={<DashLoading />}>
            <TennisAnalyticsApp onExit={() => navigate('/tennis')} />
          </Suspense>
        </div>
      )}
    </div>
  )
}

function DashLoading() {
  return (
    <div style={css("min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#0c0a1f;color:#dfe5ea;font:600 13px/1 'Sora';letter-spacing:.18em;text-transform:uppercase")}>
      <span style={css('width:42px;height:42px;border-radius:50%;border:2px solid rgba(15,182,164,.25);border-top-color:#34e6d2;animation:spinSlow .9s linear infinite')} />
      Loading analytics
    </div>
  )
}
