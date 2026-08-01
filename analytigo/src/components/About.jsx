import { useEffect, useRef, useState } from 'react'
import '../styles/about.css'

// About / Leadership — a team sheet.
//
// Two people, not four. A layout tuned for a four-up grid reads as a
// gap-toothed row when two of the cards leave, so this is not the old grid with
// items removed — it is a numbered line-up, in the same mono/hairline broadcast
// language the nav rail already speaks.

const TEAM = [
  {
    name: 'Harsha Vardhan', role: 'CEO & Founder', initials: 'HV', no: '01',
    bio: 'Sets the vision and product direction for Lvl-Up.',
  },
  {
    name: 'Yeshwanth Raghav', role: 'Co-founder', initials: 'YR', no: '02',
    bio: 'Shapes strategy, partnerships, and the athlete experience.',
  },
]

const LinkedIn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 10v7M7 7.2v.01M11 17v-4a2 2 0 014 0v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

// Survives a remount. A pinned stage above this section collapses as it is
// scrolled through, which remounts this subtree — component state would reset
// to unrevealed and the entrance would replay, or never play at all.
let revealed = false

export default function About() {
  const ref = useRef(null)
  const [shown, setShown] = useState(revealed)

  useEffect(() => {
    if (shown) return
    const el = ref.current
    if (!el) return
    // A position check rather than an IntersectionObserver. The collapse above
    // does not just remount this subtree, it moves it — the section can jump
    // from below the fold to above it between two frames, and an observer will
    // not report an intersection that has already been skipped over. That left
    // the section blank for the rest of the visit.
    const check = () => {
      if (!ref.current) return
      if (ref.current.getBoundingClientRect().top < window.innerHeight * 0.85) {
        revealed = true
        setShown(true)
      }
    }
    check()
    const raf = requestAnimationFrame(check)   // catch a layout shift on mount
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [shown])

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
          {TEAM.map((m, i) => (
            <article className="ab-card" key={m.name} style={{ transitionDelay: `${0.42 + i * 0.12}s` }}>
              <div className="ab-no" aria-hidden="true">{m.no}</div>
              <div className="ab-body">
                <div className="ab-name">{m.name}</div>
                <div className="ab-role">{m.role}</div>
                <p className="ab-bio">{m.bio}</p>
              </div>
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
