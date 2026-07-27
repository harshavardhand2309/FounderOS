import { css } from '../../utils/css.js'

// T4 — KINETIC CURTAIN.
// Editorial/award-show treatment: three marquee bands of oversized type run in
// opposite directions and ease to a stop as the counter fills, then the screen
// breaks into five vertical panels that slide apart to reveal the hero.

const ROWS = [
  { text: 'TENNIS · PICKLEBALL · BADMINTON · PADEL · ', dir: -1, outline: true },
  { text: 'PLAY SMARTER · OWN EVERY POINT · ', dir: 1, outline: false },
  { text: 'SERVE · RALLY · WINNER · MATCH POINT · ', dir: -1, outline: true },
]
const PANELS = [0, 1, 2, 3, 4]

export default function T4KineticType({ p, pct, phase }) {
  const full = phase !== 'load'
  const exiting = phase === 'exit'

  return (
    <div className={`ld-root t4-root ${full ? 'is-full' : ''} ${exiting ? 'is-exit' : ''}`}>
      <div className="t4-panels" aria-hidden="true">
        {PANELS.map((i) => (
          <span key={i} className="t4-panel" style={css(`transition-delay:${i * 55}ms`)} />
        ))}
      </div>

      <div className="t4-bands" aria-hidden="true">
        {ROWS.map((r, i) => (
          <div key={i} className={`t4-band ${r.outline ? 'is-out' : ''}`}>
            <div className="t4-run" style={css(`animation-direction:${r.dir < 0 ? 'normal' : 'reverse'};animation-duration:${18 + i * 6}s`)}>
              <span>{r.text.repeat(4)}</span>
              <span>{r.text.repeat(4)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="t4-top">
        <span className="t4-brand">LVL-UP<i>SPORTS</i></span>
        <span className="t4-status">LOADING<em /></span>
      </div>

      <div className="t4-foot">
        <div className="t4-count">{String(pct).padStart(3, '0')}</div>
        <div className="t4-meta">
          <div className="t4-rail"><span style={css(`width:${(p * 100).toFixed(2)}%`)} /></div>
          <div className="t4-cap">YOUR AI POWERED COACHING ASSISTANT</div>
        </div>
      </div>
    </div>
  )
}
