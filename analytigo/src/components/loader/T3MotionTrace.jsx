import { css } from '../../utils/css.js'
import { win } from './useLoadProgress.js'

// T3 — MOTION TRACE.
// The AI booting up: a pose skeleton assembles joint by joint, a swing arc traces
// through the contact point, and a system-check column ticks over to OK. Exits with
// a lime scan line that sweeps down and wipes the panel away behind it.

const J = {
  head: [150, 50], neck: [150, 92],
  ls: [120, 104], rs: [180, 104],
  le: [98, 152], re: [214, 76],
  lw: [96, 198], rw: [240, 40],
  lh: [128, 196], rh: [172, 196],
  lk: [118, 264], rk: [184, 258],
  la: [110, 332], ra: [198, 326],
}
const BONES = [
  ['neck', 'ls'], ['neck', 'rs'], ['ls', 'le'], ['le', 'lw'], ['rs', 're'], ['re', 'rw'],
  ['ls', 'lh'], ['rs', 'rh'], ['lh', 'rh'], ['lh', 'lk'], ['lk', 'la'], ['rh', 'rk'], ['rk', 'ra'],
]
const JOINTS = Object.keys(J)

const CHECKS = [
  ['POSE ENGINE', 0.12],
  ['33 JOINT MARKERS', 0.3],
  ['COURT CALIBRATION', 0.5],
  ['SWING SIGNATURE', 0.68],
  ['RENDER · 60 FPS', 0.86],
]

export default function T3MotionTrace({ p, pct, phase }) {
  const full = phase !== 'load'
  const exiting = phase === 'exit'
  const skel = win(p, 0.06, 0.72)
  const swing = win(p, 0.5, 0.96)

  return (
    <div className={`ld-root t3-root ${full ? 'is-full' : ''} ${exiting ? 'is-exit' : ''}`}>
      <div className="t3-wash" />
      <span className="t3-br t3-br-tl" /><span className="t3-br t3-br-tr" />
      <span className="t3-br t3-br-bl" /><span className="t3-br t3-br-br" />

      <div className="t3-inner">
        <div className="t3-left">
          <div className="t3-eyebrow">LVL-UP <i>SPORTS</i></div>
          <ul className="t3-checks">
            {CHECKS.map(([label, at]) => (
              <li key={label} className={p >= at ? 'on' : ''}>
                <span className="t3-cdot" />
                <span className="t3-clabel">{label}</span>
                <span className="t3-cdots" />
                <span className="t3-cok">{p >= at ? 'OK' : '··'}</span>
              </li>
            ))}
          </ul>
        </div>

        <svg className="t3-fig" viewBox="0 -34 300 470" fill="none" aria-hidden="true">
          {/* swing arc */}
          <path
            d="M188 214 C 214 190, 236 140, 244 58"
            stroke="#8fd11a" strokeWidth="2.5" strokeLinecap="round"
            pathLength="1" strokeDasharray="1" strokeDashoffset={1 - swing} opacity="0.9"
          />
          <path
            d="M176 224 C 206 198, 230 146, 238 62"
            stroke="#8fd11a" strokeWidth="8" strokeLinecap="round"
            pathLength="1" strokeDasharray="1" strokeDashoffset={1 - swing} opacity="0.13"
          />
          {BONES.map(([a, b], i) => {
            const t = win(skel, i / BONES.length * 0.75, i / BONES.length * 0.75 + 0.3)
            const [x1, y1] = J[a]
            const [x2, y2] = J[b]
            return (
              <line
                key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(196,226,255,.85)" strokeWidth="2" strokeLinecap="round"
                pathLength="1" strokeDasharray="1" strokeDashoffset={1 - t}
              />
            )
          })}
          <circle cx={J.head[0]} cy={J.head[1]} r="21" stroke="rgba(196,226,255,.85)" strokeWidth="2"
            opacity={skel > 0.05 ? 1 : 0} />
          {JOINTS.map((k, i) => {
            const t = win(skel, i / JOINTS.length * 0.8, i / JOINTS.length * 0.8 + 0.2)
            return <circle key={k} cx={J[k][0]} cy={J[k][1]} r="3.6" fill="#8fd11a" opacity={t} />
          })}
          {/* racket */}
          <g opacity={win(p, 0.62, 0.86)}>
            <line x1={J.rw[0]} y1={J.rw[1]} x2="256" y2="18" stroke="rgba(196,226,255,.9)" strokeWidth="2" />
            <ellipse cx="262" cy="8" rx="15" ry="19" stroke="rgba(196,226,255,.9)" strokeWidth="2" transform="rotate(28 262 8)" />
          </g>
        </svg>

        <div className="t3-right">
          <div className="t3-pct">{String(pct).padStart(3, '0')}<i>%</i></div>
          <div className="t3-cap">ANALYSING MOTION</div>
        </div>
      </div>

      <div className="t3-rail"><span style={css(`width:${(p * 100).toFixed(2)}%`)} /></div>
      <div className="t3-scan" />
    </div>
  )
}
