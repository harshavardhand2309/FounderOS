import { useEffect, useRef, useState } from 'react'
import { css } from '../utils/css.js'

// AI Commentary — a flagship, broadcast-style feature reveal. Monochrome (white / gray
// / black) glassmorphism over the attached broadcast image. Entrance animates once on
// scroll-in (label → heading → description → cards, staggered) via an Intersection
// Observer; it only replays after the section fully leaves and re-enters. While visible,
// subtle ambient motion (waveform pulse, drifting HUD) plays without distracting.

const CARDS = [
  {
    title: 'Live Commentary', glyph: 'mic',
    points: ['Natural AI voice', 'Match narration', 'Real-time excitement'],
  },
  {
    title: 'Tactical Insights', glyph: 'chart',
    points: ['Shot selection', 'Momentum shifts', 'Player tendencies'],
  },
  {
    title: 'Smart Highlights', glyph: 'spark',
    points: ['Detect key moments', 'Auto-generated commentary', 'Instant recap'],
  },
  {
    title: 'Multi-language', glyph: 'globe',
    points: ['Multiple languages', 'Different commentary styles', 'Personalized experience'],
  },
]

const WAVE = [8, 16, 11, 22, 14, 26, 12, 20, 9, 24, 15, 28, 13, 19, 10, 21, 14, 17]

const Glyph = ({ g }) => {
  const c = '#f2f2f4'
  if (g === 'mic') return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" stroke={c} strokeWidth="1.6" /><path d="M6 11a6 6 0 0012 0M12 17v4M9 21h6" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>)
  if (g === 'chart') return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19V5M4 19h16M8 16l4-5 3 3 4-6" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>)
  if (g === 'spark') return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>)
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.6" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke={c} strokeWidth="1.3" /></svg>)
}

export default function Commentary() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.28) setShown(true)
        else if (!e.isIntersecting) setShown(false) // reset only on a full exit → replays on re-enter
      },
      { threshold: [0, 0.28] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="cm-section" ref={ref}>
      <div className="cm-scrim" />
      <div className="cm-glow" />
      <div className="cm-hud" aria-hidden="true">
        <span className="cm-ring" />
        <span className="cm-ring cm-ring2" />
      </div>

      <div className={shown ? 'cm-inner cm-on' : 'cm-inner'}>
        <div className="cm-left">
          <div className="cm-label cm-a" style={{ transitionDelay: '.05s' }}>
            <span className="cm-dot" />AI • REAL-TIME COMMENTARY
          </div>
          <h2 className="cm-h2 cm-a" style={{ transitionDelay: '.18s' }}>Hear Every Match Like Never Before.</h2>
          <p className="cm-desc cm-a" style={{ transitionDelay: '.34s' }}>
            Experience live AI-generated commentary that understands every rally, every shot, and every turning point. Instantly receive professional-level insights, tactical breakdowns, momentum analysis, and natural commentary designed to make every match feel like a world-class broadcast.
          </p>
          <div className="cm-wave cm-a" style={{ transitionDelay: '.46s' }} aria-hidden="true">
            {WAVE.map((h, i) => <span key={i} style={css(`height:${h}px;animation-delay:${(i * 0.06).toFixed(2)}s`)} />)}
          </div>
        </div>

        <div className="cm-right">
          {CARDS.map((c, i) => (
            <div key={c.title} className="cm-card cm-a" style={{ transitionDelay: (0.5 + i * 0.12).toFixed(2) + 's' }}>
              <div className="cm-card-head">
                <span className="cm-card-ic"><Glyph g={c.glyph} /></span>
                <span className="cm-card-title">{c.title}</span>
              </div>
              <ul className="cm-card-list">
                {c.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
