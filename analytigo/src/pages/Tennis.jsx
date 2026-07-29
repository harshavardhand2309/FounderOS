import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { css } from '../utils/css.js'
import { useCountUp } from '../hooks/useCountUp.js'
import { useStickyNav } from '../hooks/useStickyNav.js'
import TennisView from '../components/TennisView.jsx'
import TrailerModal from '../components/TrailerModal.jsx'
import useHashFlag from '../hooks/useHashFlag.js'

// The analytics dashboard pulls in three.js, recharts and the Excel parser.
// Keeping it behind lazy() means the Tennis page itself stays light and none of
// that is downloaded until someone actually asks for their numbers. The same
// import() is exposed as a prefetch below, so hovering the button warms the
// chunk and the click opens instantly — module registry dedupes the two.
const loadDash = () => import('../dash/app/dashboard/page.tsx')
const DashboardPage = lazy(loadDash)

// Tennis page — a single hero screen. Teal theme is exposed as CSS variables on
// the root so every descendant can reference var(--ta) / rgba(var(--tc), x).
export default function Tennis() {
  const rootRef = useRef(null)
  const navRef = useRef(null)
  const videoRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // hash-driven so the browser Back button closes the trailer
  const [trailerOpen, openTrailer, closeTrailer] = useHashFlag('trailer')

  // Analytics is a state of this page, not a different page — the hero stays
  // mounted underneath. Driving it off the URL keeps Back/Forward working and
  // makes /tennis/analytics a real, linkable address.
  const dashOpen = pathname.startsWith('/tennis/analytics')
  // Whether *we* pushed the analytics entry. If so, closing unwinds it so Back
  // and the Close button land in exactly the same place; on a deep link there
  // is nothing to unwind, so we replace instead of navigating out of the site.
  const pushedDash = useRef(false)

  const openDashboard = useCallback(() => {
    pushedDash.current = true
    navigate('/tennis/analytics')
  }, [navigate])

  const closeDashboard = useCallback(() => {
    if (pushedDash.current) {
      pushedDash.current = false
      navigate(-1)
    } else {
      navigate('/tennis', { replace: true })
    }
  }, [navigate])

  // Always open at the very top — never inherit scroll from the previous route.
  // Deep-linking straight to the dashboard must not fight its own scroll.
  useLayoutEffect(() => {
    if (!dashOpen) window.scrollTo(0, 0)
  }, [dashOpen])

  useCountUp(rootRef, [])
  useStickyNav(navRef, [])

  // Don't let the hero behind the dashboard scroll with it, and let Escape
  // close it the same way it closes the trailer.
  useEffect(() => {
    if (!dashOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // loader.css sets `html { scrollbar-gutter: stable }`. Once the body stops
    // scrolling that strip is still reserved, so an inset:0 overlay stops ~11px
    // short and a band of the tennis page shows down the right edge. The
    // dashboard brings its own scrollbar, so release the gutter while it is up.
    const root = document.documentElement
    const prevGutter = root.style.scrollbarGutter
    root.style.scrollbarGutter = 'auto'
    const onKey = (e) => { if (e.key === 'Escape') closeDashboard() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      root.style.scrollbarGutter = prevGutter
      document.removeEventListener('keydown', onKey)
    }
  }, [dashOpen, closeDashboard])

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
        onWatchTrailer={() => openTrailer()}
        openDashboard={openDashboard}
        prefetchDashboard={loadDash}
      />

      {dashOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tennis analytics"
          style={css('position:fixed;inset:0;z-index:300;overflow-y:auto;overscroll-behavior:contain;background:#0c0a1f')}
        >
          <Suspense fallback={<DashLoading />}>
            {/* initialSport skips upstream's sport picker — we arrived from the
                Tennis card, so the sport is already known. "Change Sport" in the
                dashboard header still reaches the picker. */}
            <DashboardPage onExit={closeDashboard} initialSport="tennis" />
          </Suspense>
        </div>
      )}

      <TrailerModal
        open={trailerOpen}
        onClose={closeTrailer}
        src="/assets/highlight-Tennis.mp4"
        poster="/assets/tennis-bg-poster.jpg"
        title="Lvl-Up Tennis trailer"
        accent="#34e6d2"
      />
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
