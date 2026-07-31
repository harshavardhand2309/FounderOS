import { useEffect, useRef, useState } from 'react'
import { readChoice, onChoice } from '../lib/reviewChoice.js'
import '../styles/about.css'

// About / Leadership, in six directions, switchable at runtime while we decide.
//
// Two people, not four. A layout tuned for a four-up grid reads as a gap-toothed
// row when two of the cards leave, so none of these is the old grid with items
// removed — each is built for a pair, and most of them make the pair the point:
// facing each other, stacked as a roster, or set as a diptych.

const TEAM = [
  {
    name: 'Harsha Vardhan', role: 'CEO & Founder', initials: 'HV', no: '01',
    bio: 'Sets the vision and product direction for Lvl-Up.',
    tag: 'Vision · Product',
  },
  {
    name: 'Yeshwanth Raghav', role: 'Co-founder', initials: 'YR', no: '02',
    bio: 'Shapes strategy, partnerships, and the athlete experience.',
    tag: 'Strategy · Partnerships',
  },
]

export const TEAM_DESIGNS = [
  { id: 'diptych', name: 'Diptych',       note: 'Two full-height panels, initials set enormous behind the name. Editorial and confident.' },
  { id: 'roster',  name: 'Team Sheet',    note: 'A numbered line-up — mono type, hairline rules, the broadcast language the nav rail already speaks.' },
  { id: 'card',    name: 'Player Card',   note: 'Trading-card treatment: role as position, a gradient edge, the initials as a jersey number.' },
  { id: 'courtside', name: 'Court Side',  note: 'The two set either side of a centre line, facing each other across the net.' },
  { id: 'monogram', name: 'Monogram',     note: 'The initials become the artwork. Names sit small beneath — fashion-house scale.' },
  { id: 'dossier', name: 'Dossier',       note: 'An analyst file. Label/value rows on a faint grid, in the dashboard\'s own voice.' },
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
  const [design, setDesign] = useState(() => readChoice('team', 'diptych'))

  useEffect(() => onChoice('team', setDesign), [])

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
    <section className="ab-section" id="about" ref={ref} data-ab={design}>
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
          {TEAM.map((m, i) => (
            <article className="ab-card" key={m.name} style={{ transitionDelay: `${0.42 + i * 0.12}s` }}>
              {/* the oversized initials — artwork in most designs, avatar in the rest */}
              <div className="ab-mono" aria-hidden="true">{m.initials}</div>
              <div className="ab-no" aria-hidden="true">{m.no}</div>
              <div className="ab-body">
                <div className="ab-name">{m.name}</div>
                <div className="ab-role">{m.role}</div>
                <div className="ab-tag" aria-hidden="true">{m.tag}</div>
                <p className="ab-bio">{m.bio}</p>
              </div>
              <button type="button" className="ab-linkedin" aria-label={`${m.name} on LinkedIn`}>
                <LinkedIn />
              </button>
              <i className="ab-edge" aria-hidden="true" />
            </article>
          ))}
          {/* the net, for Court Side — inert everywhere else */}
          <i className="ab-net" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
