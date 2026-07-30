import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useSections from '../../hooks/useSections.js'
import '../../styles/stickyrail.css'

// Sticky section rail — Grip Tape, chosen from the ten variants that were built
// to be judged on the real page. The other nine, the review picker and the
// runtime switch are gone, and Grip's styling is now the rail's own.
//
// Scroll-spy, section progress, smooth-scroll and the pinned "Pick Your Game"
// stage all live in useSections, so this file is only the skin.

// Ten full section names do not fit one row at laptop widths, so the rail gets
// a short form while the sections keep their real names.
const SHORT = {
  'Your Sport': 'Sport',
  'Bio Motion': 'Bio Motion',
  'Face Off': 'Face Off',
  'AI Commentary': 'Commentary',
  'Elite Athlete Profiles': 'Profiles',
  'AI Recommendations': 'Coaching',
  'Go Viral Instantly': 'Go Viral',
  Ecosystem: 'Ecosystem',
  About: 'About',
  Connect: 'Connect',
}

export default function StickyRail() {
  // `progress` is section-relative, not scrollHeight-relative — see useSections.
  const { items, active, progress, go } = useSections()
  const [shown, setShown] = useState(false)
  const itemsRef = useRef(null)
  const btnRefs = useRef([])

  // Home is index 0 — the brand handles it, so the rail lists the rest.
  const railItems = useMemo(
    () => items.map((it, i) => ({ ...it, i })).filter((it) => it.i > 0),
    [items],
  )

  useEffect(() => {
    // reveal once the hero is behind us
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.6)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // magic-line marker follows the active button
  const place = useCallback(() => {
    const host = itemsRef.current
    if (!host) return
    const el = btnRefs.current[active]
    if (!el) return
    host.style.setProperty('--sr-mx', el.offsetLeft + 'px')
    host.style.setProperty('--sr-mw', el.offsetWidth + 'px')
    const a = el.getBoundingClientRect()
    const r = host.getBoundingClientRect()
    if (a.left < r.left || a.right > r.right) {
      host.scrollTo({ left: el.offsetLeft - host.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' })
    }
  }, [active])

  useLayoutEffect(place, [place, railItems.length])
  useEffect(() => {
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [place])

  if (railItems.length < 2) return null

  return (
    <div className={`sr-wrap${shown ? ' is-on' : ''}`}>
      <nav className="sr-nav" aria-label="Section shortcuts">
        <button className="sr-brand" onClick={() => go(0)} aria-label="Back to top">
          <img className="sr-mark" src="/assets/Logo.png" alt="" aria-hidden="true" />
          <span className="sr-word">LVL-UP</span>
        </button>

        <div className="sr-items" ref={itemsRef}>
          <i className="sr-marker" aria-hidden="true" />
          {railItems.map((it, n) => (
            <button
              key={it.label}
              ref={(el) => { btnRefs.current[it.i] = el }}
              className="sr-item"
              aria-current={active === it.i ? 'true' : 'false'}
              onClick={() => go(it.i)}
            >
              <span className="sr-num">{String(n + 1).padStart(2, '0')}</span>
              <span className="sr-lbl">{SHORT[it.label] || it.label}</span>
            </button>
          ))}
        </div>

        <div className="sr-cta">
          <Link to="/signin" className="sr-signin">Sign In</Link>
          <Link to="/signup" className="sr-go">Get Started</Link>
        </div>

        <i
          className="sr-prog"
          style={{ '--sr-p': progress.toFixed(2) + '%' }}
          role="progressbar"
          aria-label="Page progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </nav>
    </div>
  )
}
