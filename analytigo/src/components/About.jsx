import { useEffect, useRef, useState } from 'react'
import '../styles/about.css'

// About / Leadership — a restrained editorial section. Four premium leadership cards
// with initials avatars, role, a short bio placeholder, and a LinkedIn placeholder.
// Entrance is IntersectionObserver-driven (staggered), replays only on full re-enter.

const TEAM = [
  { name: 'HarshaVardhan', role: 'CEO & Founder', initials: 'HV', bio: 'Sets the vision and product direction for Lvl-Up.' },
  { name: 'Yeshwanth Raghav', role: 'Co-founder', initials: 'YR', bio: 'Shapes strategy, partnerships, and the athlete experience.' },
  { name: 'Arvind Divakar', role: 'CTO', initials: 'AD', bio: 'Leads the AI, analytics, and engineering platform.' },
  { name: 'Joy Kaarthick Kumaresan', role: 'CRO', initials: 'JK', bio: 'Drives growth, revenue, and go-to-market.' },
]

const LinkedIn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 10v7M7 7.2v.01M11 17v-4a2 2 0 014 0v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export default function About() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && e.intersectionRatio >= 0.2) { setShown(true); io.disconnect() } },
      { threshold: [0, 0.2] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="ab-section" id="about" ref={ref}>
      <div className={shown ? 'ab-inner ab-on' : 'ab-inner'}>
        <div className="ab-head">
          <div className="ab-eyebrow ab-a" style={{ transitionDelay: '.05s' }}>
            <span className="ab-dot" />THE TEAM
          </div>
          <h2 className="ab-h2"><span className="ab-hline"><span>The Team Behind the Intelligence.</span></span></h2>
          <p className="ab-desc ab-a" style={{ transitionDelay: '.32s' }}>
            Engineers, operators, and competitors building the intelligence layer for modern racket sport — obsessed with one question: what gets an athlete to their next level, faster.
          </p>
        </div>

        <div className="ab-grid">
          {TEAM.map((m) => (
            <article className="ab-card" key={m.name}>
              <div className="ab-avatar" aria-hidden="true">{m.initials}</div>
              <div className="ab-name">{m.name}</div>
              <div className="ab-role">{m.role}</div>
              <p className="ab-bio">{m.bio}</p>
              <button type="button" className="ab-linkedin" aria-label={`${m.name} on LinkedIn`}>
                <LinkedIn />
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
