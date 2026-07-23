import { useEffect, useRef, useState } from 'react'
import '../styles/autoplay.css'

// Shared auto-advance engine + progress dots for the tabbed showcases
// (Ghost Play, AI Recommendations). The slideshow only runs while the section
// is actually on screen and the browser tab is visible; it pauses while the
// user hovers the interactive area and never runs for reduced-motion users.
// Any manual selection restarts the clock. `epoch` bumps on every (re)start so
// the active dot's fill animation stays in sync with the JS timer.

export function useAutoPlay(count, ms, watchRef) {
  const [active, setActive] = useState(0)
  const [inView, setInView] = useState(false)
  const [paused, setPaused] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ).current

  useEffect(() => {
    const el = watchRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting && e.intersectionRatio >= 0.3),
      { threshold: [0, 0.3] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [watchRef])

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const running = inView && !paused && !tabHidden && !reduced

  // restart the cycle from zero whenever the show resumes
  useEffect(() => {
    if (running) setEpoch((e) => e + 1)
  }, [running])

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => {
      setActive((a) => (a + 1) % count)
      setEpoch((e) => e + 1)
    }, ms)
    return () => clearTimeout(t)
  }, [running, active, epoch, count, ms])

  const go = (i) => {
    setActive(i)
    setEpoch((e) => e + 1)
  }

  return { active, go, running, epoch, setPaused }
}

export function PlayDots({ count, active, epoch, running, ms, onSelect, label }) {
  return (
    <div className="ap-dots" role="tablist" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === active}
          aria-label={`${label} — slide ${i + 1} of ${count}`}
          className={i === active ? 'ap-dot on' : 'ap-dot'}
          onClick={() => onSelect(i)}
        >
          {i === active && (
            <span
              key={epoch}
              className="ap-fill"
              style={{ animationDuration: ms + 'ms', animationPlayState: running ? 'running' : 'paused' }}
              aria-hidden="true"
            />
          )}
        </button>
      ))}
    </div>
  )
}
