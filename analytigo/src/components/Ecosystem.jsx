import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './../styles/ecosystem.css'

// Ecosystem — a warm, cinematic "one platform, every stakeholder" reveal over the
// sepia collage. Brown / beige / white / bronze. On desktop the section is a
// scroll-pinned gate: the stage stays put while scroll progress reveals the four
// audience cards one by one, so the section cannot be skimmed past before all
// four have appeared. Once the last card is in, the pin unlocks for good
// (same collapse + re-anchor pattern as the other pinned tracks). On
// mobile/tablet there is no pin — everything reveals as it scrolls into view.

// six audience cards (even 3×2 grid), three headline benefits each so the type
// can breathe. Schools & Universities are one education card.
const CARDS = [
  {
    title: 'Players', tag: 'Train smarter. Rise faster.', glyph: 'player',
    items: ['Performance Analytics', 'Rankings & Benchmarks', 'AI Recommendations'],
  },
  {
    title: 'Coaches', tag: 'Lead every session with data.', glyph: 'whistle',
    items: ['Team Management', 'Performance Reports', 'AI Coaching Insights'],
  },
  {
    title: 'Academies', tag: 'Develop the next generation.', glyph: 'academy',
    items: ['Athlete Development', 'Talent Identification', 'Training Analytics'],
  },
  {
    title: 'Broadcast', tag: 'Narrate the game intelligently.', glyph: 'broadcast',
    items: ['AI Commentary', 'Live Match Insights', 'Real-time Storytelling'],
  },
  {
    title: 'Sports Authority', tag: 'Govern sport with data.', glyph: 'authority',
    items: ['Talent Pipelines', 'National Benchmarks', 'Funding Insights'],
  },
  {
    title: 'Schools & Universities', tag: 'Discover and develop talent.', glyph: 'university',
    items: ['Talent Identification', 'Recruitment & Scholarships', 'Sports Science Analytics'],
  },
]
// scroll progress at which each card enters (desktop pin) — one per card
const CARD_AT = [0.12, 0.26, 0.4, 0.54, 0.68, 0.8]
const SETTLE_MS = 500 // the last card must be on screen this long before unlock

const Glyph = ({ g }) => {
  const c = '#e6c48a'
  if (g === 'player') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="3" stroke={c} strokeWidth="1.7" /><path d="M5 21c0-4 3-7 7-7s7 3 7 7" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>)
  if (g === 'whistle') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12a5 5 0 005 5h6l4 3v-8h-2" stroke={c} strokeWidth="1.7" strokeLinejoin="round" /><circle cx="8" cy="12" r="2.4" stroke={c} strokeWidth="1.6" /><path d="M13 7h6" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>)
  if (g === 'academy') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 4l9 4-9 4-9-4 9-4z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /><path d="M7 10.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 8v5" stroke={c} strokeWidth="1.6" strokeLinecap="round" /></svg>)
  if (g === 'authority') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v4.5c0 4.4-3 7.4-7 8.5-4-1.1-7-4.1-7-8.5V6l7-3z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /><path d="M9.2 12l1.8 1.8 3.8-3.8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>)
  if (g === 'university') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-5 9 5-9 5-9-5z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M6 11v6M10 11v6M14 11v6M18 11v6M4 20h16" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>)
  if (g === 'school') return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 00-2 2V4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M9 4v16" stroke={c} strokeWidth="1.4" strokeLinecap="round" /></svg>)
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="14" height="10" rx="2" stroke={c} strokeWidth="1.6" /><path d="M17 10l4-2v8l-4-2M7 4l1.5 3M12 4l-1 3" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>)
}

// split heading into per-letter spans; each word is an unbreakable inline-block
// (the separating space lives OUTSIDE the word so lines only wrap between words)
const heading = (text, base, step) => {
  let idx = 0
  const words = text.split(' ')
  return words.map((word, wi) => (
    <Fragment key={wi}>
      <span className="eco-word">
        {[...word].map((ch, ci) => {
          const d = (base + idx * step).toFixed(3)
          idx += 1
          return <span key={ci} className="eco-ch" style={{ transitionDelay: d + 's' }}>{ch}</span>
        })}
      </span>
      {wi < words.length - 1 ? ' ' : ''}
    </Fragment>
  ))
}

const clamp01 = (x) => Math.max(0, Math.min(1, x))

export default function Ecosystem() {
  const trackRef = useRef(null)
  const [shown, setShown] = useState(false) // header entrance
  const [cardsOn, setCardsOn] = useState(0) // how many cards have entered (one-way)
  const [done, setDone] = useState(false) // pin finished → section unlocks
  const doneRef = useRef(false)
  const pendingRef = useRef(null)
  const targetRef = useRef(0) // cards requested by scroll progress
  const rampT = useRef(0)
  const lastCardAt = useRef(0) // when the final card actually entered

  // cards always arrive one by one — even if a hard scroll flick crosses
  // several thresholds in a single frame, the ramp staggers them visually
  const ramp = useCallback(() => {
    clearTimeout(rampT.current)
    setCardsOn((c) => {
      if (c >= targetRef.current) return c
      if (c + 1 < targetRef.current) rampT.current = setTimeout(ramp, 240)
      return c + 1
    })
  }, [])
  useEffect(() => {
    if (cardsOn === CARDS.length && !lastCardAt.current) lastCardAt.current = performance.now()
  }, [cardsOn])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    let holdT = 0
    const update = () => {
      raf = 0
      if (doneRef.current) return
      const vw = window.innerWidth || 1200
      const vh = window.innerHeight || 800
      const rect = track.getBoundingClientRect()
      if (vw <= 1080) { // mobile/tablet: no pin, reveal everything on approach
        if (rect.top < vh * 0.75) { setShown(true); targetRef.current = CARDS.length; ramp() }
        return
      }
      const span = rect.height - vh
      const p = span > 0 ? clamp01(-rect.top / span) : 1
      if (rect.top < vh * 0.5) setShown(true)
      let n = 0
      for (let i = 0; i < CARD_AT.length; i++) if (p >= CARD_AT[i]) n = i + 1
      if (n > targetRef.current) { targetRef.current = n; ramp() }
      if (p >= 0.97) {
        // the gate: no matter how hard the flick, the page holds at the end of
        // the pin until the final card has been on screen for a beat
        const settled = lastCardAt.current && performance.now() - lastCardAt.current >= SETTLE_MS
        if (!settled) {
          targetRef.current = CARDS.length
          ramp()
          window.scrollTo(0, window.scrollY + rect.top + span * 0.97)
          clearTimeout(holdT)
          holdT = setTimeout(onScroll, 200) // re-check even with no further input
          return
        }
        doneRef.current = true
        pendingRef.current = window.scrollY + rect.top
        setShown(true)
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
      clearTimeout(holdT)
      clearTimeout(rampT.current)
    }
  }, [ramp])

  // unlock: collapse the track and re-anchor so the view doesn't jump
  useLayoutEffect(() => {
    if (!done) return
    if (pendingRef.current != null) { window.scrollTo(0, pendingRef.current); pendingRef.current = null }
  }, [done])

  return (
    <section
      className="eco-track"
      id="ecosystem"
      ref={trackRef}
      style={{ position: 'relative', height: done ? 'auto' : '360vh' }}
    >
      <div
        className={shown ? 'eco-section eco-on' : 'eco-section'}
        style={{ position: done ? 'static' : 'sticky', top: 0 }}
      >
        <div className="eco-scrim" />
        <div className="eco-grain" />

        <div className="eco-inner">
          <div className="eco-head">
            <div className="eco-eyebrow eco-a" style={{ transitionDelay: '.05s' }}>
              <span className="eco-eyeline" />ONE ECOSYSTEM<span className="eco-eyeline" />
            </div>
            <h2 className="eco-h2">{heading('One Engine. Every Side of the Game.', 0.25, 0.026)}</h2>
            <p className="eco-desc eco-a" style={{ transitionDelay: '1.1s' }}>
              One AI platform connects players, coaches, academies, and broadcasters — turning the same match data into personal insight, smarter sessions, sharper scouting, and live broadcast intelligence.
            </p>
          </div>

          <div className="eco-grid">
            {CARDS.map((c, i) => (
              <article key={c.title} className={i < cardsOn ? 'eco-card eco-show' : 'eco-card'}>
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

          {/* progress dots — one per stakeholder, fill as each card arrives */}
          <div className="eco-progress" aria-hidden="true">
            {CARDS.map((c, i) => <span key={c.title} className={i < cardsOn ? 'eco-pdot on' : 'eco-pdot'} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
