import { useEffect, useRef, useState } from 'react'
import useSections from '../../hooks/useSections.js'
import '../../styles/orbitnav.css'

// "Orbit Globe" navigator — sections sit on a glassy semi-circle bulging out of
// the right edge, like the visible rim of a globe. The section in focus rides
// the apex; neighbours curve away, fading and blurring with distance. Scrolling
// the mouse wheel over the globe spins it and, after a beat, jumps straight to
// the focused section. Clicking any label jumps immediately.

const STEP = 16 // degrees between neighbouring sections on the wheel
const VISIBLE = 4 // labels shown either side of the focused one
const WHEEL_NOTCH = 70 // wheel delta per spin step
const SETTLE_MS = 550 // idle time before a wheel-spin navigates

export default function OrbitNav() {
  const { items, active, go } = useSections()
  const [sel, setSel] = useState(0)
  const rootRef = useRef(null)
  const selRef = useRef(0)
  const engagedRef = useRef(false)
  const idleT = useRef(0)
  const wheelAcc = useRef(0)
  selRef.current = sel

  // follow the page scroll unless the user is driving the wheel
  useEffect(() => {
    if (!engagedRef.current) setSel(active)
  }, [active])

  // React registers wheel listeners as passive, so attach our own to be able
  // to keep the page from scrolling while the globe is being spun.
  useEffect(() => {
    const root = rootRef.current
    if (!root || items.length < 2) return
    const onWheel = (e) => {
      e.preventDefault()
      engagedRef.current = true
      wheelAcc.current += e.deltaY
      while (Math.abs(wheelAcc.current) >= WHEEL_NOTCH) {
        const dir = Math.sign(wheelAcc.current)
        wheelAcc.current -= dir * WHEEL_NOTCH
        setSel((s) => Math.max(0, Math.min(items.length - 1, s + dir)))
      }
      clearTimeout(idleT.current)
      idleT.current = setTimeout(() => {
        engagedRef.current = false
        go(selRef.current)
      }, SETTLE_MS)
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      root.removeEventListener('wheel', onWheel)
      clearTimeout(idleT.current)
    }
  }, [items, go])

  if (items.length < 2) return null
  const N = items.length

  return (
    <nav className="on-root" ref={rootRef} aria-label="Section navigation">
      <div className="on-hit" aria-hidden="true" />
      <div className="on-pivot">
        <span className="on-glass" aria-hidden="true" />
        <span className="on-ring" aria-hidden="true" />
        <span className="on-ring on-ring-in" aria-hidden="true" />
        <span className="on-apex" aria-hidden="true" />
        {items.map((s, i) => {
          const a = (i - sel) * STEP
          const d = Math.abs(i - sel)
          const hidden = d > VISIBLE
          return (
            <button
              key={i}
              type="button"
              className={i === sel ? 'on-item sel' : 'on-item'}
              style={{
                transform: `rotate(${a}deg) translateX(calc(-1 * var(--on-r))) rotate(${-a}deg) translate(calc(-100% - 16px), -50%)`,
                opacity: hidden ? 0 : Math.max(0.12, 1 - d * 0.21),
                filter: `blur(${Math.min(d * 1.15, 4).toFixed(2)}px)`,
                pointerEvents: hidden ? 'none' : 'auto',
              }}
              tabIndex={hidden ? -1 : 0}
              onClick={() => { setSel(i); go(i) }}
              aria-label={`Go to ${s.label}`}
              aria-current={i === active ? 'true' : undefined}
            >
              <span className="on-label">{s.label}</span>
              <span className="on-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="on-dot" aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <span className="on-hint" aria-hidden="true">{sel + 1} / {N} · scroll</span>
    </nav>
  )
}
