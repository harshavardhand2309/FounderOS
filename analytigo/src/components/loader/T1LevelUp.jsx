import { css } from '../../utils/css.js'

// T1 — LEVEL UP METER.
// The brand name taken literally: loading *is* levelling up. An outlined LVL-UP
// wordmark fills with lime from the bottom as an XP rail climbs. At 100% the rail
// physically lengthens and turns white — the geometry itself marks the promotion —
// then the whole plane lifts away behind a lime edge.

const RANKS = ['ROOKIE', 'CONTENDER', 'CHALLENGER', 'ELITE']

export default function T1LevelUp({ p, pct, phase }) {
  const full = phase !== 'load'
  const rank = RANKS[Math.min(RANKS.length - 1, Math.floor(p * RANKS.length))]
  const lvl = Math.max(1, Math.round(p * 99))

  return (
    <div className={`ld-root t1-root ${full ? 'is-full' : ''} ${phase === 'exit' ? 'is-exit' : ''}`}>
      <div className="t1-grid" />
      <div className="t1-glow" style={css(`opacity:${(0.15 + p * 0.85).toFixed(3)}`)} />

      <div className="t1-inner">
        <div className="t1-eyebrow">
          <span className="t1-dot" />
          <span className="t1-eyebrow-a">INITIALISING YOUR COURT</span>
          <span className="t1-eyebrow-b">LEVEL UP</span>
        </div>

        {/* outlined wordmark with a lime fill that rises with progress */}
        <div className="t1-mark">
          <span className="t1-mark-out" aria-hidden="true">LVL-UP</span>
          <span className="t1-mark-fill" style={css(`clip-path:inset(${((1 - p) * 100).toFixed(2)}% 0 0 0)`)} aria-hidden="true">LVL-UP</span>
          <span className="ld-sr">LVL-UP Sports — loading</span>
        </div>
        <div className="t1-sub">SPORTS</div>

        <div className="t1-rail-wrap">
          <div className="t1-bar-head">
            <span>LVL {String(lvl).padStart(2, '0')}</span>
            <span className="t1-rank">{rank}</span>
            <span>LVL 99</span>
          </div>
          <div className="t1-bar">
            <div className="t1-bar-fill" style={css(`width:${(p * 100).toFixed(2)}%`)} />
            <div className="t1-bar-ticks" />
          </div>
        </div>

        <div className="t1-readout">
          <span className="t1-pct">{String(pct).padStart(3, '0')}</span>
          <span className="t1-pct-sign">%</span>
        </div>
      </div>

      <div className="t1-flash" />
    </div>
  )
}
