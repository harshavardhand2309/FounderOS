import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useSections from '../../hooks/useSections.js'
import '../../styles/stickyrail.css'

// Sticky section rail, in ten switchable directions, so we can judge them on the
// real page rather than in a mockup. Scroll-spy, smooth-scroll and the pinned
// "Pick Your Game" stage are all handled by useSections, which the globe already
// uses — this is a second skin on the same engine, not a second engine.
//
// REVIEW BUILD: the floating picker bottom-left switches direction and remembers
// the choice. Once one is chosen, keep its CSS block, drop the other nine, delete
// DESIGNS/RailPicker and render <StickyRail design="<id>" /> with no picker.

export const DESIGNS = [
  { id: 'scoreboard', name: 'Scoreboard' },
  { id: 'baseline', name: 'Baseline' },
  { id: 'dugout', name: 'Dugout' },
  { id: 'grip', name: 'Grip Tape' },
  { id: 'broadcast', name: 'Broadcast' },
  { id: 'flap', name: 'Split-Flap' },
  { id: 'neon', name: 'Neon Wire' },
  { id: 'stat', name: 'Stat Chips' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'hex', name: 'Hex Shield' },
]

const STORE = 'lvlup:navdesign'

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

export function readDesign() {
  try {
    const q = new URLSearchParams(window.location.search).get('nav')
    if (q) return q === 'off' ? null : q
    const s = localStorage.getItem(STORE)
    return s === 'off' ? null : (s || 'dugout')
  } catch {
    return 'dugout'
  }
}

export default function StickyRail({ design }) {
  const { items, active, go } = useSections()
  const [shown, setShown] = useState(false)
  const [progress, setProgress] = useState(0)
  const itemsRef = useRef(null)
  const btnRefs = useRef([])

  // Hero is index 0 — the brand handles it, so the rail lists the rest.
  const railItems = useMemo(
    () => items.map((it, i) => ({ ...it, i })).filter((it) => it.i > 0),
    [items],
  )

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
      // reveal once the hero is behind us
      setShown(window.scrollY > window.innerHeight * 0.6)
    }
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

  useLayoutEffect(place, [place, design, railItems.length])
  useEffect(() => {
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [place])

  if (!design || railItems.length < 2) return null

  return (
    <div className={`sr-wrap${shown ? ' is-on' : ''}`} data-sr={design}>
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
              <span className="sr-spark" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((k) => (
                  <i key={k} style={{ height: 4 + ((n * 3 + k * 5) % 9) + 'px' }} />
                ))}
              </span>
              <span className="sr-lbl">{SHORT[it.label] || it.label}</span>
            </button>
          ))}
        </div>

        <div className="sr-cta">
          <Link to="/signin" className="sr-signin">Sign In</Link>
          <Link to="/signup" className="sr-go">Get Started</Link>
        </div>

        <i className="sr-prog" style={{ '--sr-p': progress + '%' }} aria-hidden="true" />
      </nav>
    </div>
  )
}

/* ── review-only picker ─────────────────────────────────────────────────── */
export function RailPicker({ design, onChange }) {
  const [open, setOpen] = useState(false)
  const current = DESIGNS.find((d) => d.id === design)

  const set = (id) => {
    try { localStorage.setItem(STORE, id ?? 'off') } catch { /* ignore */ }
    onChange(id)
  }

  return (
    <div className="sr-pick">
      {open && (
        <div className="sr-pick-panel" role="group" aria-label="Navigation style">
          {DESIGNS.map((d) => (
            <button
              key={d.id}
              aria-pressed={design === d.id}
              onClick={() => set(d.id)}
            >
              {d.name}
            </button>
          ))}
          <button aria-pressed={design === null} onClick={() => set(null)}>
            Off (globe only)
          </button>
          <p className="sr-pick-note">
            Your choice is remembered on this device. Share a specific one with
            <code> ?nav={design || 'off'}</code>.
          </p>
        </div>
      )}
      <button className="sr-pick-tab" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Nav style: <b>{current ? current.name : 'Off'}</b> {open ? '▾' : '▴'}
      </button>
    </div>
  )
}
