import { useEffect, useRef, useState } from 'react'
import { useAutoPlay } from './AutoPlay.jsx'

// AI Recommendations — a cinematic evidence deck. Each of the four recommendation
// types is a full-bleed slide over one of the real photographs (equipment, practice,
// fatigue, simulation), unified by a dark grade so the copy reads on all of them.
// Left column is the editorial finding written like a coach would say it; right is
// the model's evidence card (spec rows + confidence). A tab rail with a live
// progress fill drives the deck: autoplay while on screen, hover pauses, arrow
// keys move between tabs, and every slide change remounts the content for a
// staggered rise. Backgrounds crossfade with a slow Ken Burns drift.

const SLIDES = [
  {
    id: 'equipment',
    num: '01',
    tab: 'Equipment',
    kicker: 'RACQUET · STRING · SETUP',
    bg: '/assets/rec-equipment.jpg',
    focal: '50% 45%',
    headline: 'The best racquet for you is written in your gameplay.',
    body:
      'Swing speed, contact point and spin from your recorded matches tell the model what your game actually needs. It suggests the racquet, the string and tension, and the customisations that fit the way you play — and what each change should do for your ball.',
    card: {
      title: 'Suggested setup for your game',
      rows: [
        { k: 'Racquet', v: '100 sq in · 300 g' },
        { k: 'String & tension', v: 'Poly 1.25 · 23 kg' },
        { k: 'Grip & balance', v: 'L3 · head-light' },
      ],
      conf: 87,
      basis: '812 rallies · last 6 sessions',
    },
  },
  {
    id: 'practice',
    num: '02',
    tab: 'Practice Plan',
    kicker: 'TARGETED PRACTICE',
    bg: '/assets/rec-practice.jpg',
    focal: '55% 38%',
    headline: 'This week: backhand returns, under real pressure.',
    body:
      'Drills ranked by expected gain for your game, not a generic session sheet. Three blocks, forty minutes, and each one maps to a number you can check in your next recorded match.',
    card: {
      title: 'This week’s plan, ranked',
      rows: [
        { k: '1 · Deep returns · 15 min', v: '+6% return depth' },
        { k: '2 · Serve attack · 15 min', v: '+4% points won' },
        { k: '3 · Crosscourt play · 10 min', v: '+3% rallies won' },
      ],
      conf: 82,
      basis: 'ranked by expected gain',
    },
  },
  {
    id: 'fatigue',
    num: '03',
    tab: 'Fatigue',
    kicker: 'FATIGUE SIGNALS',
    bg: '/assets/rec-fatigue.jpg',
    focal: '50% 74%',
    headline: 'After the ninety-minute mark, you are a different player.',
    body:
      'Late in long sessions your serve speed, court coverage and shot depth all drift — and the model can see exactly when. These are performance numbers from your play, and the plan simply puts your hardest work where you are still sharp.',
    card: {
      title: 'What drifts, and when',
      rows: [
        { k: 'Serve speed after 90 min', v: '−11%' },
        { k: 'Court coverage', v: '−8%' },
        { k: 'Unforced errors', v: '+17%' },
      ],
      conf: 84,
      basis: 'suggested: two 75-minute blocks',
    },
  },
  {
    id: 'simulation',
    num: '04',
    tab: 'Simulation',
    kicker: 'MATCH SIMULATION',
    bg: '/assets/rec-simulation.jpg',
    focal: '50% 40%',
    headline: 'See your next match before you play it.',
    body:
      'We build a model of your game and your opponent’s, then play the matchup out a hundred times virtually. You see how the match is likely to go — and which game plan lifts your chances — before you step on court for the real one.',
    card: {
      title: 'Win probability by game plan',
      rows: [
        { k: 'Current baseline plan', v: '46%' },
        { k: 'Serve-plus-one to the backhand', v: '58%' },
        { k: 'Net behind deep returns', v: '53%' },
      ],
      conf: 79,
      basis: '100 simulated matches',
    },
  },
]
const HEADING_WORDS = ['AI', 'Recommendations']

const SLIDE_MS = 6000

export default function Recommendations() {
  const ref = useRef(null)
  const railRef = useRef(null)
  const [shown, setShown] = useState(false)
  // auto-advances the four slides while the section is on screen; hovering the
  // stage pauses, selecting a tab restarts the clock
  const { active, go, running, epoch, setPaused } = useAutoPlay(SLIDES.length, SLIDE_MS, ref)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && e.intersectionRatio >= 0.18) { setShown(true); io.disconnect() } },
      { threshold: [0, 0.18] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // roving arrow keys on the tab rail
  const onRailKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = e.key === 'ArrowRight'
      ? (active + 1) % SLIDES.length
      : (active - 1 + SLIDES.length) % SLIDES.length
    go(next)
    railRef.current?.querySelectorAll('.rec-tab')[next]?.focus()
  }

  const s = SLIDES[active]

  return (
    <section className={shown ? 'rec-section rec-on' : 'rec-section'} id="recommendations" ref={ref}>
      <div className="rec-head">
        <h2 className="rec-h2" aria-label="AI Recommendations">
          {HEADING_WORDS.map((w, i) => (
            <span className="rec-word" key={w}>
              <span style={{ animationDelay: (0.18 + i * 0.1).toFixed(2) + 's' }}>{w}</span>
            </span>
          ))}
        </h2>
        <p className="rec-desc" style={{ animationDelay: '.44s' }}>
          Four things the model tells you after every recorded match — what to play with,
          what to practise, when you drop off, and how the next match is likely to go.
        </p>
      </div>

      <div
        className="rec-stage"
        style={{ animationDelay: '.6s' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((sl, i) => (
          <img
            key={sl.id}
            src={sl.bg}
            alt=""
            draggable={false}
            aria-hidden="true"
            className={i === active ? 'rec-bg-img on' : 'rec-bg-img'}
            style={{ objectPosition: sl.focal }}
          />
        ))}
        <div className="rec-scrim" aria-hidden="true" />

        <div className="rec-slide" key={s.id}>
          <div className="rec-copy">
            <span className="rec-kicker" style={{ animationDelay: '.05s' }}>
              <i aria-hidden="true">REC {s.num}</i>{s.kicker}
            </span>
            <h3 className="rec-title" style={{ animationDelay: '.14s' }}>{s.headline}</h3>
            <p className="rec-body" style={{ animationDelay: '.24s' }}>{s.body}</p>
          </div>

          <aside className="rec-card" style={{ animationDelay: '.3s' }} aria-label={`${s.tab} — model evidence`}>
            <header className="rec-card-top">
              <span>MODEL v2.4</span>
              <span>{s.card.basis}</span>
            </header>
            <h4 className="rec-card-h">{s.card.title}</h4>
            <dl className="rec-rows">
              {s.card.rows.map((r) => (
                <div className="rec-row" key={r.k}>
                  <dt>{r.k}</dt>
                  <dd>{r.v}</dd>
                </div>
              ))}
            </dl>
            <div className="rec-conf">
              <span className="rec-conf-k">CONFIDENCE</span>
              <span className="rec-conf-bar" aria-hidden="true">
                <span style={{ width: s.card.conf + '%' }} />
              </span>
              <span className="rec-conf-v">{s.card.conf}%</span>
            </div>
          </aside>
        </div>

        <div className="rec-rail" role="tablist" aria-label="Recommendation types" ref={railRef} onKeyDown={onRailKey}>
          {SLIDES.map((sl, i) => (
            <button
              key={sl.id}
              role="tab"
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className={i === active ? 'rec-tab active' : 'rec-tab'}
              style={{ animationDelay: (0.7 + i * 0.08).toFixed(2) + 's' }}
              onClick={() => go(i)}
            >
              <span className="rec-tab-num">{sl.num}</span>
              <span className="rec-tab-label">{sl.tab}</span>
              <span className="rec-prog" aria-hidden="true">
                {i === active && (
                  <span
                    key={epoch}
                    className="rec-prog-fill"
                    style={{ animationDuration: SLIDE_MS + 'ms', animationPlayState: running ? 'running' : 'paused' }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
