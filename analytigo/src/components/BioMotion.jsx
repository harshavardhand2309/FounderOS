import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { css } from '../utils/css.js'

// Bio Motion Analysis — a scroll-pinned, telemetry-style AI motion showcase.
// Scroll progress scrubs the reveal: parallax background, a staggered blur-to-sharp
// headline, sentence-by-sentence copy, a few floating glass cards wired to joint
// points, live pose overlays, and reveal-on-scroll performance graphs. Once the
// sequence completes it UNLOCKS for good — the finished state is frozen, the section
// becomes a normal block (no reverse, scroll freely both ways), replays on refresh.
// Copy lives in a clean top-left column; cards/graphs are kept clear of it.

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const rv = (p, a, b) => clamp01((p - a) / (b - a))
const eo = (t) => 1 - Math.pow(1 - t, 3)

const HEAD = ['BIO MOTION', 'ANALYSIS']
const HEAD_WINS = [[0.04, 0.2], [0.14, 0.3]]

const SENTENCES = [
  'Real-time pose estimation maps every joint, angle, and vector as you play.',
  'Pro-grade motion insight that shows where technique breaks down — before it costs you points.',
  'Compare your motion, side by side, with any player’s.',
]
const DESC_WINS = [[0.32, 0.44], [0.42, 0.54], [0.52, 0.64]]

// three floating cards, all on the RIGHT half so they never touch the copy column;
// their joint anchors sit on right-of-centre athletes so no dot hides behind the text
const CARDS = [
  { label: 'Movement Efficiency', val: '97%', c: '#ff6a5a', x: 62, y: 24, jx: 47, jy: 36, win: [0.36, 0.52] },
  { label: 'Power Transfer', val: '88%', c: '#f5b23c', x: 85, y: 40, jx: 67, jy: 34, win: [0.46, 0.62] },
  { label: 'Reaction Time', val: '0.18s', c: '#b06cff', x: 84, y: 66, jx: 86, jy: 50, win: [0.56, 0.72] },
]

const JOINTS = [
  { x: 47, y: 36, c: '#ff6a5a' }, { x: 67, y: 34, c: '#f5b23c' },
  { x: 86, y: 50, c: '#b06cff' }, { x: 56, y: 54, c: '#2fe0e0' }, { x: 78, y: 60, c: '#35f08a' },
]

const GRAPHS = [
  { label: 'Footwork', val: 78, c: '#35f08a', win: [0.72, 0.8] },
  { label: 'Speed', val: 91, c: '#2fe0e0', win: [0.74, 0.82] },
  { label: 'Stability', val: 85, c: '#ff6a5a', win: [0.76, 0.84] },
  { label: 'Explosiveness', val: 88, c: '#f5b23c', win: [0.78, 0.86] },
  { label: 'Consistency', val: 82, c: '#b06cff', win: [0.8, 0.88] },
  { label: 'Balance', val: 90, c: '#2fe0e0', win: [0.82, 0.9] },
]

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  l: (7 + (i * 7.3) % 88) + '%', t: (12 + (i * 37) % 74) + '%',
  s: 2 + (i % 3), d: (i * 0.5).toFixed(1) + 's', dur: (6 + (i % 5)) + 's',
}))

export default function BioMotion() {
  const trackRef = useRef(null)
  const bgRef = useRef(null)
  const lineRefs = useRef([])
  const sentRefs = useRef([])
  const cardRefs = useRef([])
  const connRefs = useRef([])
  const jointGroupRef = useRef(null)
  const scanRef = useRef(null)
  const graphFillRefs = useRef([])
  const graphCellRefs = useRef([])
  const freezeRef = useRef(null)
  const pendingRef = useRef(null)
  const doneRef = useRef(false)
  const [done, setDone] = useState(false)

  // Measure connector path lengths so we can dash-reveal them. Below 1080px the
  // whole figure is `display:none`, and getTotalLength() throws on a non-rendered
  // element — unguarded that exception escapes the layout effect and takes the
  // entire page down, so the measurement is skipped when the figure isn't laid out.
  useLayoutEffect(() => {
    connRefs.current.forEach((el) => {
      if (!el) return
      let L
      try {
        L = el.getTotalLength()
      } catch {
        return // not rendered at this breakpoint — nothing to dash-reveal
      }
      el._len = L
      el.style.strokeDasharray = L
      el.style.strokeDashoffset = L
    })
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const apply = (p) => {
      if (bgRef.current) {
        const s = 1.06 - 0.05 * Math.min(p / 0.7, 1)
        const ty = (p - 0.4) * -22
        bgRef.current.style.transform = `translate3d(0,${ty.toFixed(1)}px,0) scale(${s.toFixed(3)})`
      }
      lineRefs.current.forEach((el, i) => {
        if (!el) return
        const e = eo(rv(p, HEAD_WINS[i][0], HEAD_WINS[i][1]))
        el.style.opacity = e.toFixed(3)
        el.style.transform = `translate3d(0,${((1 - e) * 42).toFixed(1)}px,0)`
        el.style.filter = e < 0.999 ? `blur(${((1 - e) * 16).toFixed(2)}px)` : 'none'
      })
      sentRefs.current.forEach((el, i) => {
        if (!el) return
        const e = eo(rv(p, DESC_WINS[i][0], DESC_WINS[i][1]))
        el.style.opacity = e.toFixed(3)
        el.style.transform = `translate3d(0,${((1 - e) * 14).toFixed(1)}px,0)`
        el.style.filter = e < 0.999 ? `blur(${((1 - e) * 6).toFixed(2)}px)` : 'none'
      })
      cardRefs.current.forEach((el, i) => {
        if (!el) return
        const e = eo(rv(p, CARDS[i].win[0], CARDS[i].win[1]))
        el.style.opacity = e.toFixed(3)
        el.style.transform = `translate3d(${((1 - e) * 18).toFixed(1)}px,0,0) scale(${(0.9 + 0.1 * e).toFixed(3)})`
      })
      connRefs.current.forEach((el, i) => {
        if (!el || !el._len) return
        const e = rv(p, CARDS[i].win[0], CARDS[i].win[1] + 0.03)
        el.style.strokeDashoffset = ((1 - e) * el._len).toFixed(1)
        el.style.opacity = (eo(e) * 0.9).toFixed(2)
      })
      if (jointGroupRef.current) jointGroupRef.current.style.opacity = rv(p, 0.26, 0.4).toFixed(2)
      if (scanRef.current) scanRef.current.style.opacity = (rv(p, 0.24, 0.4) * 0.55).toFixed(2)
      graphFillRefs.current.forEach((el, i) => { if (el) el.style.width = (eo(rv(p, GRAPHS[i].win[0], GRAPHS[i].win[1])) * GRAPHS[i].val).toFixed(1) + '%' })
      graphCellRefs.current.forEach((el, i) => {
        if (!el) return
        const e = eo(rv(p, GRAPHS[i].win[0], GRAPHS[i].win[0] + 0.06))
        el.style.opacity = e.toFixed(3)
        el.style.transform = `translate3d(0,${((1 - e) * 18).toFixed(1)}px,0)`
      })
    }
    const freeze = () => {
      lineRefs.current.forEach((el) => { if (el) { el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none' } })
      sentRefs.current.forEach((el) => { if (el) { el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none' } })
      cardRefs.current.forEach((el) => { if (el) { el.style.opacity = '1'; el.style.transform = 'translate3d(0,0,0) scale(1)' } })
      connRefs.current.forEach((el) => { if (el) { el.style.strokeDashoffset = '0'; el.style.opacity = '0.9' } })
      if (jointGroupRef.current) jointGroupRef.current.style.opacity = '1'
      if (scanRef.current) scanRef.current.style.opacity = '0.5'
      graphFillRefs.current.forEach((el, i) => { if (el) el.style.width = GRAPHS[i].val + '%' })
      graphCellRefs.current.forEach((el) => { if (el) { el.style.opacity = '1'; el.style.transform = 'none' } })
      if (bgRef.current) { bgRef.current.style.transform = 'translate3d(0,0,0) scale(1.01)'; bgRef.current.style.filter = 'none' }
    }
    freezeRef.current = freeze
    const update = () => {
      raf = 0
      if (doneRef.current) return
      const vw = window.innerWidth || 1200
      const vh = window.innerHeight || 800
      if (vw <= 1080) { freeze(); return } // mobile: no pin, show finished state
      const rect = track.getBoundingClientRect()
      const span = rect.height - vh
      const p = span > 0 ? clamp01(-rect.top / span) : 0
      apply(p)
      if (p >= 0.93) {
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

  // unlock: collapse the track to a normal block, freeze the finished state, re-anchor
  useLayoutEffect(() => {
    if (!done) return
    if (freezeRef.current) freezeRef.current()
    if (pendingRef.current != null) { window.scrollTo(0, pendingRef.current); pendingRef.current = null }
  }, [done])

  return (
    <section className="bm-section bm-track" ref={trackRef} style={css(`position:relative;z-index:1;height:${done ? 100 : 400}vh`)}>
      <div className="bm-stage" style={css(`position:${done ? 'static' : 'sticky'};top:0;height:100vh;overflow:hidden`)}>
        <div className="bm-bg" ref={bgRef} />
        <div className="bm-scrim" />
        <div className="bm-grid" />
        <div className="bm-sweep" />
        {PARTICLES.map((p, i) => (
          <span key={i} className="bm-particle" style={css(`left:${p.l};top:${p.t};width:${p.s}px;height:${p.s}px;animation-delay:${p.d};animation-duration:${p.dur}`)} />
        ))}

        <svg className="bm-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {CARDS.map((c, i) => (
            <line key={i} ref={(el) => { connRefs.current[i] = el }} x1={c.jx} y1={c.jy} x2={c.x} y2={c.y}
              stroke={c.c} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0" />
          ))}
          <g ref={jointGroupRef} style={{ opacity: 0 }}>
            {JOINTS.map((j, i) => (
              <circle key={i} className="bm-joint" cx={j.x} cy={j.y} r="1.1" fill={j.c} vectorEffect="non-scaling-stroke"
                style={{ animationDelay: (i * 0.3) + 's' }} />
            ))}
          </g>
        </svg>
        <div className="bm-scan" ref={scanRef} />

        <div className="bm-inner">
          <div className="bm-copy">
            <h2 className="bm-h2">
              {HEAD.map((l, i) => (
                <span key={i} className="bm-line" ref={(el) => { lineRefs.current[i] = el }} style={{ opacity: 0 }}>{l}</span>
              ))}
            </h2>
            <div className="bm-desc">
              {SENTENCES.map((s, i) => (
                <p key={i} className="bm-sent" ref={(el) => { sentRefs.current[i] = el }} style={{ opacity: 0 }}>{s}</p>
              ))}
            </div>
          </div>

          {CARDS.map((c, i) => (
            <div key={i} className="bm-card" style={css(`left:${c.x}%;top:${c.y}%`)}>
              <div className="bm-card-in" ref={(el) => { cardRefs.current[i] = el }} style={{ opacity: 0, '--acc': c.c }}>
                <div className="bm-card-top">
                  <span className="bm-card-dot" />
                  <span className="bm-card-label">{c.label}</span>
                </div>
                <div className="bm-card-val">{c.val}</div>
                <div className="bm-card-spark">
                  {[5, 9, 6, 12, 8, 14, 10, 16].map((h, j) => <span key={j} style={css(`height:${h}px;animation-delay:${(j * 0.09).toFixed(2)}s`)} />)}
                </div>
              </div>
            </div>
          ))}

          <div className="bm-graphs">
            {GRAPHS.map((g, i) => (
              <div key={g.label} className="bm-graph" ref={(el) => { graphCellRefs.current[i] = el }} style={{ opacity: 0 }}>
                <div className="bm-graph-head">
                  <span className="bm-graph-label">{g.label}</span>
                  <span className="bm-graph-val" style={css(`color:${g.c}`)}>{g.val}</span>
                </div>
                <div className="bm-graph-track">
                  <div className="bm-graph-fill" ref={(el) => { graphFillRefs.current[i] = el }} style={css(`width:0;background:linear-gradient(90deg,rgba(255,255,255,.14),${g.c})`)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
