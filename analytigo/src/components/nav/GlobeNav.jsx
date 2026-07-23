import { useEffect, useRef, useState } from 'react'
import useSections from '../../hooks/useSections.js'
import '../../styles/globenav.css'

// "Lens Globe" navigator — the lens dock's magnifying focus fused with the
// orbit globe's structure. Sections ride a fully transparent semi-circle
// bulging from the right edge; whatever sits under the cursor swells into
// crisp bold focus while the rest curve away, fading and blurring with
// distance. The mouse wheel still spins the globe and, after a beat, jumps
// straight to the focused section; clicking any label jumps immediately.

const STEP = 16 // degrees between neighbouring sections on the wheel
const VISIBLE = 4 // labels shown either side of the selection
const GAP = 77 // ≈ vertical px between neighbouring labels at the apex (R·sin STEP)
const WHEEL_NOTCH = 70 // wheel delta per spin step
const SETTLE_MS = 550 // idle time before a wheel-spin navigates

export default function GlobeNav() {
  const { items, active, go } = useSections()
  const [sel, setSel] = useState(0)
  const [lens, setLens] = useState(null) // fractional focus under the cursor
  const rootRef = useRef(null)
  const selRef = useRef(0)
  const engagedRef = useRef(false)
  const idleT = useRef(0)
  const wheelAcc = useRef(0)
  const moveRaf = useRef(0)
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
      setLens(null) // wheel takes over from the cursor lens
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
  }, [items.length, go])

  useEffect(() => () => { if (moveRaf.current) cancelAnimationFrame(moveRaf.current) }, [])

  if (items.length < 2) return null
  const N = items.length
  const focus = lens ?? sel

  // labels sit ~GAP px apart vertically near the apex, so the cursor's offset
  // from mid-screen maps straight onto a fractional item index
  const onMove = (e) => {
    const y = e.clientY
    if (moveRaf.current) return
    moveRaf.current = requestAnimationFrame(() => {
      moveRaf.current = 0
      const f = selRef.current + (y - window.innerHeight / 2) / GAP
      setLens(Math.max(0, Math.min(N - 1, f)))
    })
  }
  const onLeave = () => {
    if (moveRaf.current) { cancelAnimationFrame(moveRaf.current); moveRaf.current = 0 }
    setLens(null)
  }

  return (
    <nav
      className="gn-root"
      ref={rootRef}
      aria-label="Section navigation"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="gn-hit" aria-hidden="true" />
      <div className="gn-pivot">
        <span className="gn-ring" aria-hidden="true" />
        <span className="gn-ring gn-ring-in" aria-hidden="true" />
        <span className="gn-apex" aria-hidden="true" />
        {items.map((s, i) => {
          const a = (i - sel) * STEP
          const d = Math.abs(i - focus)
          const t = Math.max(0, 1 - d / 3) // 1 in the lens centre → 0 three slots out
          const hidden = Math.abs(i - sel) > VISIBLE
          return (
            <button
              key={i}
              type="button"
              className={i === active ? 'gn-item on' : 'gn-item'}
              style={{
                transform: `rotate(${a}deg) translateX(calc(-1 * var(--gn-r))) rotate(${-a}deg) translate(calc(-100% - 16px), -50%) scale(${(0.84 + t * 0.34).toFixed(3)})`,
                opacity: hidden ? 0 : 0.2 + t * 0.8,
                filter: `blur(${((1 - t) * 2.4).toFixed(2)}px)`,
                pointerEvents: hidden ? 'none' : 'auto',
              }}
              tabIndex={hidden ? -1 : 0}
              onClick={() => { setSel(i); go(i) }}
              aria-label={`Go to ${s.label}`}
              aria-current={i === active ? 'true' : undefined}
            >
              <span className="gn-label">{s.label}</span>
              <span className="gn-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="gn-dot" aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <span className="gn-hint" aria-hidden="true">{sel + 1} / {N} · scroll</span>
    </nav>
  )
}
