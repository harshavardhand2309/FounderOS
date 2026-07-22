import { useEffect, useRef, useState } from 'react'
import './../styles/ecosystem.css'

// Ecosystem — a warm, cinematic "one platform, every stakeholder" reveal over the
// sepia collage. Brown / beige / white / bronze. Entrance is IntersectionObserver-
// driven (replays only on a full re-enter): background fades, heading reveals letter
// by letter, paragraph fades up, then the four audience cards stagger in. Each card
// lifts, glows, zooms its warm wash, highlights its title, and brightens its list on
// hover. Its own identity — not reused from any other section.

const CARDS = [
  {
    title: 'Players', tag: 'Train smarter. Rise faster.', glyph: 'player',
    items: ['Performance Analytics', 'Rankings', 'AI Recommendations', 'Ghost Play', 'Progress Tracking', 'Career Growth'],
  },
  {
    title: 'Coaches', tag: 'Lead every session with data.', glyph: 'whistle',
    items: ['Team Management', 'Performance Reports', 'Training Recommendations', 'Session Planning', 'AI Coaching Insights'],
  },
  {
    title: 'Academies', tag: 'Develop the next generation.', glyph: 'academy',
    items: ['Athlete Development', 'Talent Identification', 'Attendance & Progress', 'Training Analytics', 'Academy Management'],
  },
  {
    title: 'Broadcast', tag: 'Narrate the game intelligently.', glyph: 'broadcast',
    items: ['AI Commentary', 'Live Insights', 'Match Statistics', 'Tactical Analysis', 'Real-time Storytelling', 'Viewer Engagement'],
  },
]

const Glyph = ({ g }) => {
  const c = '#e6c48a'
  if (g === 'player') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="3" stroke={c} strokeWidth="1.7" /><path d="M5 21c0-4 3-7 7-7s7 3 7 7" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>)
  if (g === 'whistle') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12a5 5 0 005 5h6l4 3v-8h-2" stroke={c} strokeWidth="1.7" strokeLinejoin="round" /><circle cx="8" cy="12" r="2.4" stroke={c} strokeWidth="1.6" /><path d="M13 7h6" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>)
  if (g === 'academy') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4l9 4-9 4-9-4 9-4z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /><path d="M7 10.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 8v5" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>)
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="14" height="10" rx="2" stroke={c} strokeWidth="1.6" /><path d="M17 10l4-2v8l-4-2M7 4l1.5 3M12 4l-1 3" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>)
}

// split heading into per-letter spans (words wrap naturally; letters stagger)
const heading = (text, base, step) => {
  let idx = 0
  const words = text.split(' ')
  return words.map((word, wi) => (
    <span className="eco-word" key={wi}>
      {[...word].map((ch, ci) => {
        const d = (base + idx * step).toFixed(3)
        idx += 1
        return <span key={ci} className="eco-ch" style={{ transitionDelay: d + 's' }}>{ch}</span>
      })}
      {wi < words.length - 1 ? ' ' : ''}
    </span>
  ))
}

export default function Ecosystem() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.22) setShown(true)
        else if (!e.isIntersecting) setShown(false) // reset only on full exit → replays on re-enter
      },
      { threshold: [0, 0.22] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className={shown ? 'eco-section eco-on' : 'eco-section'} id="ecosystem" ref={ref}>
      <div className="eco-scrim" />
      <div className="eco-grain" />

      <div className="eco-inner">
        <div className="eco-head">
          <div className="eco-eyebrow eco-a" style={{ transitionDelay: '.05s' }}>
            <span className="eco-eyeline" />ECOSYSTEM<span className="eco-eyeline" />
          </div>
          <h2 className="eco-h2">{heading('One Intelligent Platform. Every Stakeholder.', 0.25, 0.022)}</h2>
          <p className="eco-desc eco-a" style={{ transitionDelay: '1.35s' }}>
            LVL-UP unifies every participant in the game — connecting players, coaches, academies, and broadcasters through one AI engine for analytics, recommendations, scouting, coaching tools, and real-time broadcast intelligence.
          </p>
        </div>

        <div className="eco-grid">
          {CARDS.map((c, i) => (
            <article
              key={c.title}
              className="eco-card eco-a"
              style={{ transitionDelay: (1.6 + i * 0.13).toFixed(2) + 's' }}
            >
              <div className="eco-card-wash" />
              <div className="eco-card-body">
                <div className="eco-card-head">
                  <span className="eco-card-ic"><Glyph g={c.glyph} /></span>
                  <div>
                    <h3 className="eco-card-title">{c.title}</h3>
                    <span className="eco-card-tag">{c.tag}</span>
                  </div>
                </div>
                <ul className="eco-card-list">
                  {c.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
