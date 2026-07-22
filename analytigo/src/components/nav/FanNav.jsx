import { useState } from 'react'
import useSections from '../../hooks/useSections.js'
import '../../styles/fannav.css'

// "Halo Fan" navigator — at rest, a single glowing orb on the right edge shows
// the current section number inside a progress ring. Hovering (or clicking) it
// fans every section out along a semi-circle of frosted glass chips around the
// orb; chips far from the active section sit slightly dimmer and softer.

const FAN_R = 235 // px radius of the fan
const SWEEP = 150 // degrees of arc the chips fan across

export default function FanNav() {
  const { items, active, go } = useSections()
  const [open, setOpen] = useState(false)

  if (items.length < 2) return null
  const N = items.length

  return (
    <nav
      className={open ? 'fn-root open' : 'fn-root'}
      aria-label="Section navigation"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="fn-orb"
        aria-label={open ? 'Close section menu' : 'Open section menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className="fn-orb-ring"
          style={{ '--p': N > 1 ? active / (N - 1) : 0 }}
          aria-hidden="true"
        />
        <span className="fn-orb-num">{String(active + 1).padStart(2, '0')}</span>
        <span className="fn-orb-total" aria-hidden="true">/{String(N).padStart(2, '0')}</span>
      </button>
      <div className="fn-fan" aria-hidden={!open}>
        {items.map((s, i) => {
          // spread chips across the arc, 12 o'clock → 6 o'clock past the orb
          const a = -SWEEP / 2 + (SWEEP * i) / (N - 1)
          const d = Math.abs(i - active)
          return (
            <button
              key={i}
              type="button"
              className={i === active ? 'fn-chip active' : 'fn-chip'}
              style={{
                '--a': `${a}deg`,
                '--r': `${FAN_R}px`,
                transitionDelay: open ? `${i * 22}ms` : `${(N - 1 - i) * 12}ms`,
                filter: open ? `blur(${Math.min(d * 0.35, 1.4).toFixed(2)}px)` : 'blur(6px)',
              }}
              tabIndex={open ? 0 : -1}
              onClick={() => { go(i); setOpen(false) }}
              aria-label={`Go to ${s.label}`}
              aria-current={i === active ? 'true' : undefined}
            >
              <span className="fn-chip-num">{String(i + 1).padStart(2, '0')}</span>
              {s.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
