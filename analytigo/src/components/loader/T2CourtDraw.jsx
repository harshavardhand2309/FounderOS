import { css } from '../../utils/css.js'
import { win } from './useLoadProgress.js'

// T2 — COURT LINE DRAW.
// A regulation court draws itself on a white plane, then morphs through all four
// racket codes — the brand's whole scope stated as one continuous line animation.
// The four aspect ratios sit within 10% of each other (2.167 / 2.2 / 2.2 / 2.0),
// so the outer rectangle barely moves and the eye reads only the inner markings
// redrawing. At 100% the plane splits along the net and the halves part.
//
// Every dimension below is regulation — see each sport's governing body note.

// W is always the court's LENGTH, so every code is drawn to the same span and
// only the depth and the inner markings change. Depths below are that span times
// the sport's true aspect ratio, so all four rectangles are exactly to scale
// against each other.
const W = 780
const H_MAX = 390 // padel is the deepest court, so it sets the canvas

const SPORTS = [
  {
    id: 'TENNIS',
    // ITF: 78 × 36 ft doubles → 10 units per foot
    h: 360,
    lines: (h) => [
      `M0 ${0.125 * h} H${W}`, // singles sidelines — 4.5ft doubles alleys
      `M0 ${0.875 * h} H${W}`,
      `M${0.230769 * W} ${0.125 * h} V${0.875 * h}`, // service lines, 21ft from the net
      `M${0.769231 * W} ${0.125 * h} V${0.875 * h}`,
      `M${0.230769 * W} ${0.5 * h} H${0.769231 * W}`, // centre service line
    ],
  },
  {
    id: 'PICKLEBALL',
    // USAP: 44 × 20 ft → 17.727 units per foot
    h: 354.5,
    lines: (h) => [
      `M${0.340909 * W} 0 V${h}`, // non-volley zone ("kitchen"), 7ft each side of the net
      `M${0.659091 * W} 0 V${h}`,
      `M0 ${0.5 * h} H${0.340909 * W}`, // centrelines, baseline to kitchen
      `M${0.659091 * W} ${0.5 * h} H${W}`,
    ],
  },
  {
    id: 'BADMINTON',
    // BWF: 13.40 × 6.10 m doubles → 58.209 units per metre.
    // Same footprint as pickleball, so the outer rectangle barely moves here.
    h: 355.1,
    lines: (h) => [
      `M0 ${0.075415 * h} H${W}`, // singles sidelines — 5.18m singles width
      `M0 ${0.924585 * h} H${W}`,
      `M${0.352245 * W} 0 V${h}`, // short service lines, 1.98m from the net
      `M${0.647755 * W} 0 V${h}`,
      `M${0.056718 * W} 0 V${h}`, // doubles long service lines, 0.76m from the back
      `M${0.943282 * W} 0 V${h}`,
      `M0 ${0.5 * h} H${0.352245 * W}`, // centre lines, short service line to back boundary
      `M${0.647755 * W} ${0.5 * h} H${W}`,
    ],
  },
  {
    id: 'PADEL',
    // FIP: 20 × 10 m → 39 units per metre. Only three markings exist on a padel
    // court, which is why it reads as the most open of the four.
    h: 390,
    lines: (h) => [
      `M${0.1525 * W} 0 V${h}`, // service lines, 6.95m from the net
      `M${0.8475 * W} 0 V${h}`,
      `M${0.1525 * W} ${0.5 * h} H${0.8475 * W}`, // centre service line
    ],
  },
]

// where each morph happens across the load
const MORPHS = [
  [0.3, 0.46],
  [0.5, 0.64],
  [0.68, 0.84],
]
const lerp = (a, b, t) => a + (b - a) * t

export default function T2CourtDraw({ p, pct, phase }) {
  const full = phase !== 'load'
  const exiting = phase === 'exit'

  // which pair of courts are we between, and how far
  let from = 0
  let t = 0
  MORPHS.forEach(([a, b], i) => {
    const w = win(p, a, b)
    if (w > 0) {
      from = i
      t = w
    }
  })
  const to = Math.min(SPORTS.length - 1, from + 1)
  const A = SPORTS[from]
  const B = SPORTS[to]
  const h = lerp(A.h, B.h, t)
  const label = (t > 0.5 ? B : A).id

  const draw = win(p, 0, 0.24) // initial stroke-on of the first court
  const off = 1 - draw
  const yShift = (H_MAX - h) / 2

  return (
    <div className={`ld-root t2-root ${full ? 'is-full' : ''} ${exiting ? 'is-exit' : ''}`}>
      {/* the plane splits along the net and the two halves part */}
      <div className="t2-half t2-half-l" />
      <div className="t2-half t2-half-r" />

      <div className="t2-inner">
        <div className="t2-top">
          <span className="t2-brand">
            {/* Same mark, size and corner as the nav logo it hands off to, so the
                loader reads as the page assembling itself rather than a splash
                screen that gets replaced. */}
            <img className="t2-logo" src="/assets/Logo.png" alt="" aria-hidden="true" />
            LVL-UP<span className="t2-brand-chip">SPORTS</span>
          </span>
          <span className="t2-step">{label}</span>
        </div>

        <svg className="t2-court" viewBox={`-24 -24 ${W + 48} ${H_MAX + 48}`} fill="none" aria-hidden="true">
          <g transform={`translate(0 ${yShift.toFixed(1)})`}>
            {/* outer boundary — the one line that never leaves */}
            <path
              d={`M0 0 H${W} V${h.toFixed(1)} H0 Z`}
              stroke="#11150f" strokeWidth="3.4" strokeLinejoin="miter"
              pathLength="1" strokeDasharray="1" strokeDashoffset={off}
            />
            {/* inner lines cross-fade between the two codes */}
            {A.lines(h).map((d, i) => (
              <path key={`a${i}`} d={d} stroke="#11150f" strokeWidth="2" opacity={(1 - t) * draw}
                pathLength="1" strokeDasharray="1" strokeDashoffset={off} />
            ))}
            {from !== to && B.lines(h).map((d, i) => (
              <path key={`b${i}`} d={d} stroke="#11150f" strokeWidth="2" opacity={t * draw} />
            ))}
            {/* the net — drawn in the only lime dark enough to hold on white */}
            <path
              d={`M${0.5 * W} -18 V${(h + 18).toFixed(1)}`}
              stroke="#4f8a0c" strokeWidth="4"
              pathLength="1" strokeDasharray="1" strokeDashoffset={1 - win(p, 0.14, 0.34)}
            />
          </g>
        </svg>

        <div className="t2-bot">
          <div className="t2-sports">
            {SPORTS.map((s, i) => (
              <span key={s.id} className={i <= (t > 0.5 ? to : from) ? 'on' : ''} />
            ))}
          </div>
          <div className="t2-rail"><span style={css(`width:${(p * 100).toFixed(2)}%`)} /></div>
          <div className="t2-pct">{String(pct).padStart(3, '0')}<i>%</i></div>
        </div>
      </div>
    </div>
  )
}
