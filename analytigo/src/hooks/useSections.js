import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Shared engine behind every section-navigator variant (see components/nav/).
// Resolves the page's sections by selector at runtime (order-agnostic), tracks
// which one is active while scrolling (rAF-throttled), and smooth-scrolls to a
// target. The smooth-scroll re-reads the target each frame because pinned
// sections collapse + re-anchor as they're scrolled through.

export const SECTIONS = [
  { sel: 'header', label: 'Home' },
  { sel: '#sports', label: 'Your Sport' },
  { sel: '.bm-section', label: 'Bio Motion' },
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

export default function useSections() {
  const [items, setItems] = useState([])
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const elsRef = useRef([])
  const activeRef = useRef(0)
  const progRef = useRef(0)
  const settledRef = useRef(false)
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
    const t = setTimeout(() => { resolve(); settledRef.current = true }, 900) // re-resolve once layout/pins settle
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const els = elsRef.current
    if (els.length < 2) return
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const cy = window.scrollY + vh * 0.42
      let a = 0
      for (let i = 0; i < els.length; i++) if (absTop(els[i]) <= cy) a = i
      if (a !== activeRef.current) { activeRef.current = a; setActive(a) }

      // Progress is measured in SECTIONS, not document pixels, because this
      // page's height is not stable: the four scroll-pinned stages are 420vh
      // while they play their reveal and collapse to 100vh once finished, and
      // the unlock re-anchors scroll to the track's top (Home.jsx). Over a first
      // pass the document loses ~9,700px of the 22,100 it started with — so
      // scrollY / (scrollHeight - innerHeight) snapped backwards four times,
      // once per stage. Second visits start unlocked, which is why it only
      // misbehaved the first time through.
      //
      // Each section owns an equal slice of the bar, and the bar glides to the
      // next slice over the last viewport of approach. That makes it continuous
      // across a section boundary (the departing fraction reaches exactly 1 as
      // the arriving one starts at 0), monotonic, and blind to a track
      // collapsing — a pin refunds scroll, but it never changes which section
      // you are in. It also means the bar always agrees with the highlighted
      // tab, which is the only thing a rail progress bar should claim.
      //
      // Held at 0 until the section list has settled: the first resolve runs
      // while the boot loader is still up, where the sections sit at different
      // offsets and the list can be short — dividing by a smaller count reads
      // high, and the bar would drop when the real layout arrived. The rail is
      // hidden until 0.6vh of scroll anyway, so nothing is on screen yet.
      const next = a + 1 < els.length ? absTop(els[a + 1]) : null
      const frac = next == null ? 0 : clamp(1 - (next - cy) / vh, 0, 1)
      const p = settledRef.current ? ((a + frac) / (els.length - 1)) * 100 : 0
      if (Math.abs(p - progRef.current) > 0.05) { progRef.current = p; setProgress(p) }
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

  // stable identity — consumers hang wheel listeners/effects off `go`
  const go = useCallback((i) => {
    const el = elsRef.current[i]
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, absTop(el))
      return
    }
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current)
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
  }, [])

  useEffect(() => () => { if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current) }, [])

  return { items, active, progress, go, clamp }
}
