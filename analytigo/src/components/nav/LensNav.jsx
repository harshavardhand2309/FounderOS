import { useRef, useState } from 'react'
import useSections from '../../hooks/useSections.js'
import '../../styles/lensnav.css'

// "Lens Dock" navigator — a right-aligned column of section names that behaves
// like a magnifying dock: labels near the cursor swell into focus while the
// rest recede, shrinking and blurring with distance. With no cursor over it,
// the lens rests on the active section instead.

const ITEM_H = 40 // px per row, used to map cursor position to an index

export default function LensNav() {
  const { items, active, go } = useSections()
  const [focus, setFocus] = useState(null) // fractional index under the cursor
  const listRef = useRef(null)
  const raf = useRef(0)

  if (items.length < 2) return null
  const N = items.length
  const center = focus ?? active

  const onMove = (e) => {
    const y = e.clientY
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const box = listRef.current?.getBoundingClientRect()
      if (!box) return
      setFocus(Math.max(0, Math.min(N - 1, (y - box.top - ITEM_H / 2) / ITEM_H)))
    })
  }

  return (
    <nav className="ln-root" aria-label="Section navigation">
      <div
        className="ln-list"
        ref={listRef}
        onMouseMove={onMove}
        onMouseLeave={() => setFocus(null)}
      >
        {items.map((s, i) => {
          const d = Math.abs(i - center)
          const t = Math.max(0, 1 - d / 3) // 1 at the lens centre → 0 three rows out
          return (
            <button
              key={i}
              type="button"
              className={i === active ? 'ln-item active' : 'ln-item'}
              style={{
                opacity: 0.3 + t * 0.7,
                filter: `blur(${((1 - t) * 1.6).toFixed(2)}px)`,
                transform: `scale(${(0.82 + t * 0.3).toFixed(3)}) translateX(${(-t * 10).toFixed(1)}px)`,
              }}
              onClick={() => go(i)}
              aria-label={`Go to ${s.label}`}
              aria-current={i === active ? 'true' : undefined}
            >
              <span className="ln-label">{s.label}</span>
              <span className="ln-tick" aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <span
        className="ln-progress"
        style={{ '--p': N > 1 ? active / (N - 1) : 0 }}
        aria-hidden="true"
      />
    </nav>
  )
}
