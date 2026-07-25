import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { css } from '../utils/css.js'

// Face Off — a scroll-pinned, cinematic head-to-head reveal. The two athletes slide
// in from opposite edges (two halves of the same backdrop), an AI "analysis" panel
// builds in the centre, and only once they're aligned does the full comparison
// interface fade up. The section unlocks for good after the first full reveal.

const METRICS = [
  { k: 'rating', label: 'Rating' },
  { k: 'winRate', label: 'Win Rate', suf: '%' },
  { k: 'power', label: 'Power' },
  { k: 'accuracy', label: 'Accuracy' },
  { k: 'consistency', label: 'Consistency' },
  { k: 'speed', label: 'Speed' },
  { k: 'coverage', label: 'Court Coverage' },
  { k: 'performance', label: 'Performance' },
  { k: 'mental', label: 'Mental Strength' },
]

const A = {
  name: 'Aadhitya', sport: 'Tennis', tag: 'CHALLENGER', accent: '#3fae86', rgb: '63,174,134',
  rating: 95, winRate: 84, ranking: 3, power: 91, accuracy: 94, consistency: 92, speed: 88, coverage: 89, performance: 92, mental: 89,
}
const B = {
  name: 'Suresh', sport: 'Tennis', tag: 'WORLD NO. 30', accent: '#d0aa54', rgb: '208,170,84',
  rating: 94, winRate: 83, ranking: 30, power: 93, accuracy: 90, consistency: 89, speed: 91, coverage: 92, performance: 91, mental: 92,
}

const SCOPES = ['Professional Athletes', 'Regional Players', 'Local Competitors']

// Stage-2 AI "analysis" read-outs — cosmetic build-up that fills with scroll progress
const ANALYZE = [
  { label: 'AI MATCH ANALYSIS', target: 100, win: [0.06, 0.34] },
  { label: 'COMPATIBILITY SCORE', target: 87, win: [0.14, 0.42] },
  { label: 'WIN PROBABILITY', target: 64, win: [0.22, 0.5] },
  { label: 'PLAYING STYLE MATCH', target: 92, win: [0.3, 0.58] },
]

const PARTICLES = [
  { l: '12%', t: '24%', s: 5, d: '0s' }, { l: '88%', t: '30%', s: 4, d: '1.1s' },
  { l: '20%', t: '72%', s: 6, d: '.5s' }, { l: '82%', t: '68%', s: 5, d: '1.8s' },
  { l: '46%', t: '16%', s: 4, d: '.9s' }, { l: '54%', t: '84%', s: 5, d: '1.4s' },
  { l: '32%', t: '44%', s: 3, d: '2.1s' }, { l: '70%', t: '50%', s: 4, d: '.3s' },
]

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const ramp = (p, a, b) => clamp01((p - a) / (b - a))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

const aWins = (m) => (m.rank ? A[m.k] < B[m.k] : A[m.k] > B[m.k])
const barOf = (p, m) => (m.rank ? Math.max(10, 100 - (p[m.k] - 1) * 7) : p[m.k])
const disp = (p, m) => (m.rank ? '#' + p[m.k] : p[m.k] + (m.suf || ''))

function Head({ p, align }) {
  return (
    <div style={css(`flex:1;text-align:${align}`)}>
      <div style={css(`font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.14em;color:${p.accent};margin-bottom:9px`)}>{p.tag}</div>
      <div className="ag-h2" style={css("font:800 27px/1.05 'Sora';letter-spacing:-.02em;margin-bottom:6px;text-shadow:0 2px 18px rgba(0,0,0,.55)")}>{p.name}</div>
      <div style={css("font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.06em;color:#9aa3ad;margin-bottom:14px")}>{p.sport.toUpperCase()}</div>
      <div style={css(`font:800 42px/1 'Sora';color:${p.accent};text-shadow:0 0 26px rgba(${p.rgb},.5)`)}>
        {p.rating}
        <span style={css("font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:#9aa3ad;margin-left:7px")}>RATING</span>
      </div>
    </div>
  )
}

export default function FaceOff() {
  const trackRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const analyzeRef = useRef(null)
  const fillRefs = useRef([])
  const finalRef = useRef(null)
  const [done, setDone] = useState(false)
  const doneRef = useRef(false)
  const pendingRef = useRef(null)
  const [bars, setBars] = useState(false)
  const barsRef = useRef(false)
  // players enter immediately when the section comes into view (time-based, not scroll-
  // scrubbed) so there is never a blank backdrop before the image appears
  const [entered, setEntered] = useState(false)
  const enteredRef = useRef(false)

  // Scroll-pinned reveal driven by the section's progress through its tall track.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const lockBars = () => { if (!barsRef.current) { barsRef.current = true; setBars(true) } }
    const apply = (p) => {
      // players are handled by the CSS entrance (see .fo-entered) — not scrubbed here
      // Stage 2 — AI analysis panel builds, then bows out as the real UI arrives
      const aIn = easeOut(ramp(p, 0.04, 0.2))
      const aOut = ramp(p, 0.56, 0.68)
      if (analyzeRef.current) {
        analyzeRef.current.style.opacity = (aIn * (1 - aOut)).toFixed(3)
        analyzeRef.current.style.transform = `translate3d(-50%,calc(-50% + ${(aOut * -16).toFixed(1)}px),0) scale(${(0.94 + 0.06 * aIn - aOut * 0.05).toFixed(3)})`
      }
      ANALYZE.forEach((m, i) => {
        const f = fillRefs.current[i]
        if (f) f.style.width = (easeOut(ramp(p, m.win[0], m.win[1])) * m.target).toFixed(1) + '%'
      })
      // Stage 3 — full comparison fades + slides up once players are aligned
      const fIn = ramp(p, 0.66, 0.9)
      if (finalRef.current) {
        finalRef.current.style.opacity = fIn.toFixed(3)
        finalRef.current.style.transform = `translate3d(0,${((1 - easeOut(fIn)) * 46).toFixed(1)}px,0)`
        finalRef.current.style.pointerEvents = fIn > 0.6 ? 'auto' : 'none'
      }
      if (p > 0.74) lockBars()
    }
    const update = () => {
      raf = 0
      if (doneRef.current) return
      const vw = window.innerWidth || 1200
      const vh = window.innerHeight || 800
      const rect = track.getBoundingClientRect()
      // trigger the time-based player entrance the moment the section reaches the viewport
      if (!enteredRef.current && rect.top <= vh * 0.85 && rect.bottom >= vh * 0.15) {
        enteredRef.current = true
        setEntered(true)
      }
      if (vw <= 1080) { // desktop-only pin; below that show the comparison normally
        lockBars()
        if (finalRef.current) { finalRef.current.style.opacity = '1'; finalRef.current.style.transform = 'none' }
        return
      }
      const span = rect.height - vh
      const p = span > 0 ? clamp01(-rect.top / span) : 0
      apply(p)
      if (p >= 0.96) {
        doneRef.current = true
        pendingRef.current = window.scrollY + rect.top
        setDone(true)
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Unlock: collapse the track to a normal block, lock everything to its final state,
  // and re-anchor scroll synchronously so nothing visually jumps.
  useLayoutEffect(() => {
    if (!done) return
    if (leftRef.current) { leftRef.current.style.transform = 'translate3d(0,0,0)'; leftRef.current.style.opacity = '1'; leftRef.current.style.filter = 'none' }
    if (rightRef.current) { rightRef.current.style.transform = 'translate3d(0,0,0)'; rightRef.current.style.opacity = '1'; rightRef.current.style.filter = 'none' }
    if (analyzeRef.current) analyzeRef.current.style.opacity = '0'
    if (finalRef.current) { finalRef.current.style.opacity = '1'; finalRef.current.style.transform = 'none'; finalRef.current.style.pointerEvents = 'auto' }
    if (!barsRef.current) { barsRef.current = true; setBars(true) }
    if (pendingRef.current != null) { window.scrollTo(0, pendingRef.current); pendingRef.current = null }
  }, [done])

  return (
    <section className="fo-section fo-track" ref={trackRef} style={css(`position:relative;z-index:1;height:${done ? 100 : 360}vh`)}>
      <div className={`fo-stage${entered ? ' fo-entered' : ''}`} style={css(`position:${done ? 'static' : 'sticky'};top:0;height:100vh;overflow:hidden`)}>
        {/* two halves of the same backdrop — slide in from opposite edges on viewport enter */}
        <div className="fo-half fo-half-l" ref={leftRef} />
        <div className="fo-half fo-half-r" ref={rightRef} />
        <div className="fo-scrim" />
        <div className="fo-glow" />
        {PARTICLES.map((pt, i) => (
          <span key={i} className="fo-particle" style={css(`left:${pt.l};top:${pt.t};width:${pt.s}px;height:${pt.s}px;animation-delay:${pt.d}`)} />
        ))}

        {/* Stage 2 — AI analysis build-up */}
        <div className="fo-analyze" ref={analyzeRef} style={{ opacity: 0 }}>
          <div className="fo-analyze-orb">VS</div>
          <div className="fo-analyze-title">ANALYZING MATCHUP</div>
          <div className="fo-analyze-list">
            {ANALYZE.map((m, i) => (
              <div className="fo-analyze-row" key={m.label}>
                <span>{m.label}</span>
                <div className="fo-analyze-bartrack"><div className="fo-analyze-fill" ref={(el) => { fillRefs.current[i] = el }} /></div>
              </div>
            ))}
          </div>
          <div className="fo-analyze-foot">LVL-UP AI · CALCULATING</div>
        </div>

        {/* Stage 3 — full comparison interface */}
        <div className="fo-final" ref={finalRef} style={done ? { opacity: 1 } : { opacity: 0 }}>
          <div className="fo-final-in" style={css('position:relative;z-index:2;max-width:1240px;margin:0 auto;padding:0 48px')}>
            <div className="fo-head" style={css('text-align:center;margin-bottom:26px')}>
              <div className="fo-eyebrow-pill" style={css('display:inline-flex;align-items:center;gap:9px;padding:7px 15px;border-radius:999px;border:1px solid rgba(208,170,84,.45);background:rgba(208,170,84,.13);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);margin-bottom:16px')}>
                <span style={css('width:7px;height:7px;border-radius:50%;background:#d0aa54;box-shadow:0 0 10px #d0aa54')} />
                <span style={css("font:600 12px/1 'JetBrains Mono',monospace;letter-spacing:.16em;color:#e8cf8f")}>HEAD-TO-HEAD INTELLIGENCE</span>
              </div>
              <h2 className="ag-h2 fo-h2" style={css("font:800 clamp(32px,3.6vw,50px)/1.02 'Sora';letter-spacing:-.03em;margin:0 0 8px;color:#f6f0e2;text-shadow:0 4px 30px rgba(0,0,0,.6),0 0 34px rgba(208,170,84,.28)")}>Face Off</h2>
              <p className="fo-subhead" style={css("font:600 clamp(14px,1.5vw,17px)/1.4 'Sora';letter-spacing:.01em;color:#f2e8cf;margin:0 0 12px;text-shadow:0 1px 12px rgba(0,0,0,.6)")}>Benchmark against any athlete, anywhere in the world.</p>
              <p className="fo-desc" style={css("font:400 15px/1.5 'Sora';color:#d8d1c4;max-width:520px;margin:0 auto 16px;text-shadow:0 1px 14px rgba(0,0,0,.65)")}>
                Put any two competitors side by side — strengths, weaknesses, and live metrics, from tour professionals to the player across town.
              </p>
              <div style={css('display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px')}>
                <span style={css("font:800 11px/1 'JetBrains Mono',monospace;letter-spacing:.14em;color:#f0e8cf")}>COMPARE AGAINST</span>
                {SCOPES.map((s) => (
                  <span key={s} className="fo-chip">{s}</span>
                ))}
              </div>
            </div>

            <div className="fo-panel" style={css('max-width:920px;margin:0 auto')}>
              <div className="fo-heads" style={css('display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:18px')}>
                <Head p={A} align="right" />
                <div style={css('padding:0 26px')}>
                  <div className="fo-vs">VS</div>
                </div>
                <Head p={B} align="left" />
              </div>

              <div style={css('display:flex;flex-direction:column;gap:9px')}>
                {METRICS.map((m, i) => {
                  const win = aWins(m)
                  return (
                    <div className="fo-row" key={m.k}>
                      <span style={css(`font:700 14px/1 'Sora';text-align:right;color:${win ? A.accent : '#7d8691'}`)}>{disp(A, m)}</span>
                      <div className="fo-tl">
                        <div className="fo-bar" style={{ width: bars ? barOf(A, m) + '%' : '0%', background: `linear-gradient(90deg,rgba(${A.rgb},.5),${A.accent})`, opacity: win ? 1 : 0.45, transitionDelay: i * 0.045 + 's' }} />
                      </div>
                      <span style={css("font:600 11px/1.2 'JetBrains Mono',monospace;letter-spacing:.04em;color:#aeb6bf;text-align:center")}>{m.label.toUpperCase()}</span>
                      <div className="fo-tr">
                        <div className="fo-bar" style={{ width: bars ? barOf(B, m) + '%' : '0%', background: `linear-gradient(90deg,${B.accent},rgba(${B.rgb},.5))`, opacity: win ? 0.45 : 1, transitionDelay: i * 0.045 + 's' }} />
                      </div>
                      <span style={css(`font:700 14px/1 'Sora';text-align:left;color:${win ? '#7d8691' : B.accent}`)}>{disp(B, m)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
