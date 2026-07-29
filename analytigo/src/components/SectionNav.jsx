import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import '../styles/sectionnav.css'

// Premium floating section navigator — a thin right-side rail with section nodes, a
// traveling glowing orb synced to scroll progress, hover tooltips, and a compact
// mobile FAB + sheet. Pure overlay: it never touches existing sections. Sections are
// resolved by selector at runtime (order-agnostic) so nothing needs an id added.
// Smooth-scroll re-reads the target each frame, so pinned sections collapsing mid-
// scroll can't throw off the landing. Scroll tracking is rAF-throttled + imperative.

const SECTIONS = [
  { sel: 'header', label: 'Home' },
  { sel: '#sports', label: 'Pick Your Game' },
  { sel: '.bm-section', label: 'Bio Motion Analysis' },
  { sel: '.fo-section', label: 'Face Off' },
  { sel: '.cm-section', label: 'AI Commentary' },
  { sel: '#profiles', label: 'Elite Athlete Profiles' },
  { sel: '#recommendations', label: 'AI Recommendations' },
  { sel: '.gv-section', label: 'Go Viral Instantly' },
  { sel: '.eco-section', label: 'Ecosystem' },
  { sel: '#about', label: 'About' },
  { sel: 'footer', label: 'Connect' },
]
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const absTop = (el) => el.getBoundingClientRect().top + window.scrollY

export default function SectionNav() {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const elsRef = useRef([])
  const orbRef = useRef(null)
  const fillRef = useRef(null)
  const railRef = useRef(null)
  const activeRef = useRef(0)
  const scrollRaf = useRef(0)

  useLayoutEffect(() => {
    const resolve = () => {
      const found = SECTIONS
        .map((s) => ({ el: document.querySelector(s.sel), label: s.label }))
        .filter((s) => s.el)
        .sort((a, b) => absTop(a.el) - absTop(b.el))
      elsRef.current = found.map((f) => f.el)
      setItems(found.map((f) => ({ label: f.label })))
    }
    resolve()
    const t = setTimeout(resolve, 900) // re-resolve once layout/pins settle
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const els = elsRef.current
    if (els.length < 2) return
    let raf = 0
    const update = () => {
      raf = 0
      const N = els.length
      const vh = window.innerHeight
      const railH = railRef.current ? railRef.current.offsetHeight : 0
      const cy = window.scrollY + vh * 0.42
      let a = 0
      for (let i = 0; i < N; i++) if (absTop(els[i]) <= cy) a = i
      const secTop = absTop(els[a])
      const secH = els[a].offsetHeight || vh
      const frac = clamp((cy - secTop) / secH, 0, 1)
      const posFrac = Math.min(a + frac, N - 1) / (N - 1) // 0..1 along the rail
      if (orbRef.current) orbRef.current.style.transform = `translate3d(-50%, ${(posFrac * railH).toFixed(1)}px, 0)`
      if (fillRef.current) fillRef.current.style.transform = `translateX(-50%) scaleY(${posFrac.toFixed(4)})`
      if (a !== activeRef.current) { activeRef.current = a; setActive(a) }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [items])

  const go = (i) => {
    const el = elsRef.current[i]
    if (!el) return
    setOpen(false)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, absTop(el))
      return
    }
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current)
    // Pinned sections collapse + re-anchor as they're scrolled through, so the target
    // keeps moving. Re-read it every frame, cap the per-frame step so each pin's unlock
    // can process, and only finish once the target has held steady for several frames.
    let stable = 0
    const step = () => {
      const cur = window.scrollY
      const diff = absTop(el) - cur
      if (Math.abs(diff) <= 2) {
        stable += 1
        if (stable >= 8) { scrollRaf.current = 0; return }
      } else {
        stable = 0
        const cap = window.innerHeight * 0.85
        window.scrollTo(0, cur + Math.sign(diff) * Math.min(Math.abs(diff) * 0.18, cap))
      }
      scrollRaf.current = requestAnimationFrame(step)
    }
    step()
  }

  useEffect(() => () => { if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current) }, [])

  if (items.length < 2) return null
  const N = items.length

  return (
    <>
      <nav className="sn-root" aria-label="Section navigation">
        <div className="sn-rail" ref={railRef}>
          <span className="sn-line" aria-hidden="true" />
          <span className="sn-fill" ref={fillRef} aria-hidden="true" />
          <span className="sn-orb" ref={orbRef} aria-hidden="true" />
          <ul className="sn-nodes">
            {items.map((s, i) => (
              <li key={i} style={{ '--i': i, '--n': N }}>
                <button
                  type="button"
                  className={i === active ? 'sn-node active' : 'sn-node'}
                  onClick={() => go(i)}
                  aria-label={`Go to ${s.label}`}
                  aria-current={i === active ? 'true' : undefined}
                >
                  <span className="sn-dot" aria-hidden="true" />
                  <span className="sn-tip">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* compact mobile control */}
      <button
        type="button"
        className="sn-fab"
        aria-label={open ? 'Close section menu' : 'Open section menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sn-fab-ring" style={{ '--p': N > 1 ? active / (N - 1) : 0 }} aria-hidden="true" />
        <span className="sn-fab-ic">{open ? '✕' : '☰'}</span>
      </button>
      <div className={open ? 'sn-sheet open' : 'sn-sheet'} role="menu" aria-hidden={!open}>
        {items.map((s, i) => (
          <button
            key={i}
            type="button"
            role="menuitem"
            className={i === active ? 'sn-sheet-item active' : 'sn-sheet-item'}
            onClick={() => go(i)}
          >
            <span className="sn-sheet-num">{String(i + 1).padStart(2, '0')}</span>
            {s.label}
          </button>
        ))}
      </div>
      {open && <div className="sn-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  )
}
