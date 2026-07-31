import { useEffect, useState } from 'react'
import { readChoice, writeChoice } from '../../lib/reviewChoice.js'
import { CURSORS } from '../SportCursor.jsx'
import { TEAM_DESIGNS } from '../About.jsx'
import './reviewpicker.css'

// REVIEW BUILD ONLY. One floating panel for every variant still being decided,
// so they can be judged on the real page rather than in a mockup.
//
// When a direction is chosen: keep its block, delete the others, delete this
// component, lib/reviewChoice.js, and the exported *_DESIGNS lists.

const GROUPS = [
  { key: 'cursor', label: 'Pointer', fallback: 'ball', options: CURSORS },
  { key: 'team', label: 'The Team', fallback: 'diptych', options: TEAM_DESIGNS },
]

export default function ReviewPicker() {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(() =>
    Object.fromEntries(GROUPS.map((g) => [g.key, readChoice(g.key, g.fallback)])),
  )

  // Esc closes it — it sits over the page and should never trap anything.
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  const pick = (key, value) => {
    setSel((s) => ({ ...s, [key]: value }))
    writeChoice(key, value)
  }

  return (
    <div className="rp">
      {open && (
        <div className="rp-panel">
          {GROUPS.map((g) => (
            <div className="rp-group" key={g.key}>
              <div className="rp-label">{g.label}</div>
              <div className="rp-opts">
                {g.options.map((o) => (
                  <button
                    key={o.id}
                    aria-pressed={sel[g.key] === o.id}
                    onClick={() => pick(g.key, o.id)}
                    title={o.note}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
              <p className="rp-note">{g.options.find((o) => o.id === sel[g.key])?.note}</p>
            </div>
          ))}
          <p className="rp-share">
            Share one with <code>?cursor={sel.cursor}&amp;team={sel.team}</code>
          </p>
        </div>
      )}
      <button className="rp-tab" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Design review {open ? '▾' : '▴'}
      </button>
    </div>
  )
}
