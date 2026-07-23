import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAutoPlay, PlayDots } from './AutoPlay.jsx'
import './../styles/ghostplay.css'

// Ghost Play — a cinematic "AI simulation console", deliberately unlike the AI
// Recommendations editorial reveal. A vertical command panel (left) drives a simulation
// stage (right): selecting a mission slides a champagne beam and cross-dissolves the
// backdrop with a gentle camera push-in. Entrance is filmic — the stage resolves from
// soft focus, a warm light travels across once, the heading scales in, and the console
// controls stagger in from the side. Matte black / burnished bronze / champagne / ivory.

const TABS = [
  { num: '01', label: 'Pro Player Metrics', full: 'Pro Player Metrics Sync', src: '/assets/ghost-4.png',
    hud: [['REACTION', '0.32s'], ['ACCURACY', '87%'], ['MOVEMENT', '92%']] },
  { num: '02', label: 'Challenger Benchmarks', full: 'Local Challenger Benchmarks', src: '/assets/ghost-1.png',
    hud: [['AI RANK', '#42'], ['PERCENTILE', '67%'], ['SPREAD', '+11%']] },
  { num: '03', label: 'Percentage Deficiencies', full: 'Immediate Percentage Deficits', src: '/assets/ghost-2.png',
    hud: [['WEAK ZONE', 'BACKHAND', 1], ['DEFICIT', '−13%', 1], ['ALERT', 'ACTIVE', 1]] },
  { num: '04', label: 'Monthly Evolution', full: 'Monthly Evolution Tracking', src: '/assets/ghost-3.png',
    hud: [['GROWTH', '+7.4%'], ['FORECAST', 'RISING'], ['TREND', '↑ +2.1%']] },
]
// calm, non-arcade chip entrances (alternating slide / rise — no pop or glitch)
const HUDANIM = ['gp-h-slide', 'gp-h-rise', 'gp-h-slide', 'gp-h-rise']

const SLIDE_MS = 5000

export default function GhostPlay() {
  const [shown, setShown] = useState(false)
  const sectionRef = useRef(null)
  const itemRefs = useRef([])
  const beamRef = useRef(null)
  // auto-advances the four simulations while the section is on screen;
  // hovering the console pauses, clicking a mission restarts the clock
  const { active, go, running, epoch, setPaused } = useAutoPlay(TABS.length, SLIDE_MS, sectionRef)

  useEffect(() => { TABS.forEach((t) => { const im = new Image(); im.src = t.src }) }, []) // preload

  // one-time cinematic entrance when the section scrolls into view
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && e.intersectionRatio >= 0.16) { setShown(true); io.disconnect() } },
      { threshold: [0, 0.16] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // slide the champagne AI beam to the active mission
  useLayoutEffect(() => {
    const it = itemRefs.current[active]
    const b = beamRef.current
    if (it && b) { b.style.transform = `translateY(${it.offsetTop}px)`; b.style.height = it.offsetHeight + 'px' }
  }, [active])

  const t = TABS[active]
  return (
    <section className={shown ? 'gp-section gp-on' : 'gp-section'} id="ghost-play" ref={sectionRef}>
      <div className="gp-ambient" aria-hidden="true" />
      <div className="gp-streaks" aria-hidden="true" />
      <span className="gp-lightsweep" aria-hidden="true" />

      <div className="gp-inner">
        <div className="gp-head">
          <div className="gp-eyebrow"><span className="gp-eyedot" />AI SIMULATION ENGINE</div>
          <h2 className="gp-h2">Ghost<span>Play</span></h2>
          <p className="gp-desc">
            A cinematic comparison engine that simulates your game against pro benchmarks, local challengers, and your own trajectory over time.
          </p>
        </div>

        <div className="gp-console" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {/* vertical AI command panel */}
          <aside className="gp-nav" role="tablist" aria-label="Ghost Play simulations">
            <div className="gp-nav-head">
              <span className="gp-nav-dot" />SIMULATION ENGINE
            </div>
            <div className="gp-nav-list">
              <span className="gp-beam" ref={beamRef} aria-hidden="true" />
              {TABS.map((tb, i) => (
                <button
                  key={tb.num}
                  role="tab"
                  aria-selected={i === active}
                  ref={(el) => { itemRefs.current[i] = el }}
                  className={i === active ? 'gp-navitem active' : 'gp-navitem'}
                  style={{ animationDelay: (0.24 + i * 0.09).toFixed(2) + 's' }}
                  onClick={() => go(i)}
                >
                  <span className="gp-navitem-led" />
                  <span className="gp-navitem-body">
                    <span className="gp-navitem-num">{tb.num}</span>
                    <span className="gp-navitem-label">{tb.label}</span>
                  </span>
                  <span className="gp-navitem-streak" />
                </button>
              ))}
            </div>
            <div className="gp-nav-foot"><span className="gp-status-dot" />SYNCED · REAL-TIME</div>
          </aside>

          {/* cinematic simulation stage */}
          <div className="gp-stage">
            {TABS.map((tb, i) => (
              <img key={tb.num} src={tb.src} alt={`${tb.num} — ${tb.full}`} draggable={false}
                className={i === active ? 'gp-layer on' : 'gp-layer'} aria-hidden={i !== active} />
            ))}

            <div className="gp-status">
              <span className="gp-status-dot" />SIMULATION {t.num} · LIVE
            </div>

            <div className={`gp-hud ${HUDANIM[active]}`} key={'hud' + active}>
              {t.hud.map(([label, val, warn], j) => (
                <div className={warn ? 'gp-chip warn' : 'gp-chip'} key={label} style={{ animationDelay: (j * 0.1 + 0.15).toFixed(2) + 's' }}>
                  <span className="gp-chip-t">{label}</span>
                  <span className="gp-chip-v">{val}</span>
                </div>
              ))}
            </div>

            <div className="gp-vignette" aria-hidden="true" />
          </div>
        </div>

        <PlayDots count={TABS.length} active={active} epoch={epoch} running={running} ms={SLIDE_MS} onSelect={go} label="Ghost Play simulations" />
      </div>
    </section>
  )
}
