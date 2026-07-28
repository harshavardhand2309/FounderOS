import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { css } from '../utils/css.js'
import { useCountUp } from '../hooks/useCountUp.js'
import { useStickyNav } from '../hooks/useStickyNav.js'
import LandingView from '../components/LandingView.jsx'

// Pickleball page — a single hero screen.
export default function Landing() {
  const rootRef = useRef(null)
  const navRef = useRef(null)
  const videoRef = useRef(null)
  // Pickleball analytics is not ready yet. Rather than sending people to the
  // old external dashboard, say so plainly and point them at tennis, which is.
  const [showSoon, setShowSoon] = useState(false)

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

      <LandingView navRef={navRef} videoRef={videoRef} openDashboard={() => setShowSoon(true)} />

      {showSoon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pb-soon-title"
          onClick={() => setShowSoon(false)}
          style={css('position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(6,7,9,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={css('max-width:460px;width:100%;background:#111417;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:32px;box-shadow:0 30px 80px rgba(0,0,0,.6)')}
          >
            <span style={css("display:inline-block;font:800 10px/1 'Sora';letter-spacing:.16em;text-transform:uppercase;color:#e8232e;background:rgba(232,35,46,.12);border:1px solid rgba(232,35,46,.35);border-radius:999px;padding:6px 11px;margin:0 0 16px")}>Cooking</span>
            <h2 id="pb-soon-title" style={css("font:800 24px/1.2 'Sora';color:#eef1f3;margin:0 0 12px")}>Pickleball analytics is still in the kitchen</h2>
            <p style={css("font:400 15px/1.65 'Sora';color:#b7bec6;margin:0 0 24px")}>
              The pickleball metrics page is not finished yet, so we would rather show you nothing
              than show you something half-built. Tennis analytics is live today — kitchen play,
              dinks and third-shot analysis follow next.
            </p>
            <div style={css('display:flex;gap:12px;flex-wrap:wrap')}>
              <Link
                to="/tennis/analytics"
                className="h-lift"
                style={css("display:inline-flex;align-items:center;gap:8px;font:700 14px/1 'Sora';color:#06201d;background:#0fb6a4;padding:14px 22px;border-radius:11px;text-decoration:none")}
              >
                See tennis analytics →
              </Link>
              <button
                onClick={() => setShowSoon(false)}
                style={css("font:600 14px/1 'Sora';color:#cfd5db;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);padding:14px 22px;border-radius:11px;cursor:pointer")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
