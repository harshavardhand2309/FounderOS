import { useEffect, useRef, useState } from 'react'
import { css } from '../utils/css.js'
import TennisBall from './TennisBall.jsx'

// Elite Athlete Profiles — a premium 3D coverflow carousel of player cards with
// drag/swipe, infinite looping, hover lift, and a cinematic spotlight modal that
// flips the selected card in 3D to reveal detailed analytics.

const PLAYERS = [
  {
    name: 'Ashwin', sport: 'Pickleball', accent: '#ffffff', rgb: '255,255,255',
    rating: 96, winRate: 84, ranking: 2, image: '/assets/PB_Image.jpg',
    strengths: ['Kitchen Play', 'Third-Shot Drop', 'Hand Speed'],
    weaknesses: ['Deep Lobs', 'Backhand Dinks'],
    bars: [['Dinking', 95], ['Speed', 91], ['Net Play', 93], ['Serve', 86]],
    form: [6, 7, 5, 8, 7, 9, 8], record: ['W', 'W', 'L', 'W', 'W'],
  },
  {
    name: 'Amir', sport: 'Tennis', accent: '#e8e8ec', rgb: '232,232,236',
    rating: 94, winRate: 82, ranking: 4, image: '/assets/Tennis_Image.jpg',
    popupImage: '/assets/Tennis_Image.jpg',
    popupStats: [['Serve Accuracy', '92%'], ['Court Coverage', '88%'], ['Rally Consistency', '90%']],
    strengths: ['Serve Accuracy', 'Court Coverage', 'Rally Consistency'],
    weaknesses: ['Second Serve', 'Net Approach'],
    bars: [['Serve', 92], ['Return', 86], ['Speed', 88], ['Stamina', 90]],
    form: [5, 6, 7, 6, 8, 7, 9], record: ['W', 'L', 'W', 'W', 'W'],
  },
  {
    name: 'Aarav Menon', sport: 'Badminton', accent: '#e6e6ea', rgb: '230,230,234',
    rating: 91, winRate: 79, ranking: 5, image: '/assets/Badminton_Image.jpg',
    strengths: ['Smash Speed', 'Net Kills', 'Footwork'],
    weaknesses: ['Deep Clears', 'Backhand Defense'],
    bars: [['Smash', 93], ['Speed', 90], ['Defense', 84], ['Net Play', 89]],
    form: [7, 6, 8, 7, 9, 8, 8], record: ['W', 'W', 'W', 'L', 'W'],
  },
  {
    name: 'Omar Haddad', sport: 'Squash', accent: '#eeeef2', rgb: '238,238,242',
    rating: 90, winRate: 82, ranking: 4, image: '/assets/sport-squash.jpg',
    strengths: ['Length', 'Boast', 'Court Control'],
    weaknesses: ['Front Drops', 'Stamina'],
    bars: [['Length', 92], ['Angles', 88], ['Speed', 89], ['Stamina', 86]],
    form: [7, 8, 6, 9, 7, 8, 8], record: ['W', 'W', 'L', 'W', 'W'],
  },
]

const PARTICLES = [
  { l: '8%', t: '18%', s: 6, d: '0s' },
  { l: '92%', t: '26%', s: 4, d: '1.2s' },
  { l: '14%', t: '78%', s: 5, d: '.6s' },
  { l: '88%', t: '70%', s: 7, d: '1.8s' },
  { l: '50%', t: '4%', s: 4, d: '.9s' },
]

function Visual({ p, popup }) {
  if (popup && p.popupImage) {
    return <img className="ep-img" src={p.popupImage} alt={p.name} draggable="false" style={css('object-position:center 12%')} />
  }
  if (!popup && p.video) {
    return (
      <video className="ep-img" autoPlay muted loop playsInline preload="auto" poster={p.image} aria-hidden="true">
        <source src={p.video} type="video/mp4" />
      </video>
    )
  }
  if (p.image) {
    return <img className="ep-img" src={p.image} alt={p.name} draggable="false" />
  }
  return <div className="ep-img" style={css(`background:radial-gradient(circle at 50% 30%,rgba(${p.rgb},.42),#0d1015 70%)`)} />
}

function Front({ p, big }) {
  const stats =
    big && p.popupStats
      ? [['RATING', p.rating], ['WIN RATE', p.winRate + '%'], ...p.popupStats.map(([l, v]) => [l.toUpperCase(), v]), ['RANKING', '#' + p.ranking]]
      : null
  return (
    <>
      <Visual p={p} popup={big} />
      <div className="ep-shine" />
      <div style={css('position:absolute;top:14px;left:14px;right:14px;z-index:2;display:flex;align-items:flex-start;justify-content:space-between')}>
        <span style={css("font:700 10px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:#fff;background:rgba(0,0,0,.78);border:1px solid rgba(255,255,255,.25);padding:6px 10px;border-radius:7px")}>{p.sport.toUpperCase()}</span>
        <span style={css('display:flex;flex-direction:column;align-items:center;justify-content:center;width:48px;height:48px;border-radius:13px;background:rgba(8,9,11,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18)')}>
          <span style={css(`font:800 ${big ? '23' : '20'}px/1 'Sora';color:${p.accent}`)}>{p.rating}</span>
          <span style={css("font:600 6px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:#9aa3ad;margin-top:2px")}>RATING</span>
        </span>
      </div>
      <div style={css('position:absolute;left:18px;right:18px;bottom:18px;z-index:2;text-align:left')}>
        <div style={css(`font:800 ${big ? '30' : '25'}px/1.05 'Sora';letter-spacing:-.02em;margin-bottom:${stats ? '12' : '9'}px`)}>{p.name}</div>
        {stats ? (
          <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:11px 16px;padding:15px 17px;border-radius:14px;background:rgba(8,10,13,.52);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12)')}>
            {stats.map(([l, v]) => (
              <div key={l}>
                <div style={css("font:500 9px/1 'JetBrains Mono',monospace;letter-spacing:.06em;color:#9aa3ad;margin-bottom:5px")}>{l}</div>
                <div style={css(`font:700 18px/1 'Sora';color:${p.accent}`)}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={css('display:flex;align-items:center;gap:16px;margin-bottom:13px')}>
              <span style={css("font:700 15px/1 'Sora';color:#fff")}>{p.winRate}%<span style={css("font:500 9px/1 'JetBrains Mono',monospace;color:#9aa3ad;margin-left:5px")}>WIN</span></span>
              <span style={css(`font:700 15px/1 'Sora';color:${p.accent}`)}>#{p.ranking}<span style={css("font:500 9px/1 'JetBrains Mono',monospace;color:#9aa3ad;margin-left:5px")}>RANK</span></span>
            </div>
            <div style={css('display:flex;flex-wrap:wrap;gap:6px')}>
              {p.strengths.slice(0, big ? 3 : 2).map((s) => (
                <span key={s} style={css('font:600 9px/1 \'JetBrains Mono\',monospace;letter-spacing:.03em;color:#cfd5db;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.13);padding:5px 8px;border-radius:6px')}>{s}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Back({ p }) {
  return (
    <div style={css('position:absolute;inset:0;padding:26px 24px;display:flex;flex-direction:column')}>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:4px')}>
        <span style={css(`font:800 20px/1 'Sora';letter-spacing:-.02em`)}>{p.name}</span>
        <span style={css("font:700 9px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:#fff;background:rgba(0,0,0,.78);border:1px solid rgba(255,255,255,.25);padding:5px 8px;border-radius:6px")}>{p.sport.toUpperCase()}</span>
      </div>
      <div style={css("font:500 10px/1 'JetBrains Mono',monospace;letter-spacing:.14em;color:#6b7480;margin-bottom:18px")}>PERFORMANCE ANALYTICS</div>

      {/* stat bars */}
      <div style={css('display:flex;flex-direction:column;gap:11px;margin-bottom:20px')}>
        {p.bars.map(([label, val]) => (
          <div key={label}>
            <div style={css("display:flex;justify-content:space-between;font:600 10px/1 'JetBrains Mono',monospace;color:#9aa3ad;margin-bottom:5px")}>
              <span>{label.toUpperCase()}</span>
              <span style={css(`color:${p.accent}`)}>{val}</span>
            </div>
            <div style={css('height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden')}>
              <div style={css(`height:100%;width:${val}%;border-radius:4px;background:linear-gradient(90deg,${p.accent},rgba(${p.rgb},.6))`)} />
            </div>
          </div>
        ))}
      </div>

      {/* recent form */}
      <div style={css("font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:#6b7480;margin-bottom:9px")}>RECENT FORM</div>
      <div style={css('display:flex;align-items:flex-end;gap:6px;height:42px;margin-bottom:18px')}>
        {p.form.map((v, i) => (
          <div key={i} style={css(`flex:1;height:${v * 10}%;border-radius:3px 3px 0 0;background:linear-gradient(180deg,${p.accent},rgba(${p.rgb},.35))`)} />
        ))}
      </div>

      {/* record */}
      <div style={css('display:flex;align-items:center;gap:10px;margin-bottom:16px')}>
        <span style={css("font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:#6b7480")}>LAST 5</span>
        <div style={css('display:flex;gap:5px')}>
          {p.record.map((r, i) => (
            <span key={i} style={css(`width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font:700 10px/1 'JetBrains Mono',monospace;color:${r === 'W' ? '#06140f' : '#fff'};background:${r === 'W' ? '#46d18a' : '#e0573a'}`)}>{r}</span>
          ))}
        </div>
      </div>

      {/* watch-outs */}
      <div style={css('margin-top:auto')}>
        <div style={css("font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:#6b7480;margin-bottom:9px")}>WATCH-OUTS</div>
        <div style={css('display:flex;flex-wrap:wrap;gap:6px')}>
          {p.weaknesses.map((w) => (
            <span key={w} style={css('font:600 9px/1 \'JetBrains Mono\',monospace;color:#e0a08f;background:rgba(224,87,58,.12);border:1px solid rgba(224,87,58,.3);padding:5px 8px;border-radius:6px')}>{w}</span>
          ))}
        </div>
      </div>
      <div style={css(`font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.1em;color:${p.accent};margin-top:16px;text-align:center;opacity:.85`)}>↺ TAP TO FLIP BACK</div>
    </div>
  )
}

export default function EliteProfiles() {
  const N = PLAYERS.length
  const [pos, setPos] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState(null)
  const [flipped, setFlipped] = useState(false)
  // intro gate: 'idle' = only the 3D ball, 'revealing' = cards emerge from it,
  // 'done' = the existing carousel is live (unchanged from here on).
  const [phase, setPhase] = useState('idle')
  const ready = phase === 'done'
  // header reveal: 0 = only the rotating ball, 1 = + headline, 2 = + explanation.
  // One-way latch driven by how far the section has scrolled into view.
  const [stage, setStage] = useState(0)
  const sectionRef = useRef(null)
  const seqT = useRef(0)
  const posRefs = useRef([])
  const drag = useRef({ active: false, startX: 0, startPos: 0, moved: 0, lastX: 0, raf: 0 })

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = sectionRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const vh = window.innerHeight
      setStage((s) => {
        // the section snap-scrolls into view, so the explanation is sequenced
        // off the headline (a beat later) rather than off scroll depth alone
        if (top < vh * 0.42) return Math.max(s, 2)
        if (top < vh * 0.72 && s === 0) {
          clearTimeout(seqT.current)
          seqT.current = setTimeout(() => setStage((x) => Math.max(x, 2)), 1100)
          return 1
        }
        return s
      })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
      clearTimeout(seqT.current)
    }
  }, [])
  const reveal2 = (on, delay = 0) => ({
    opacity: on ? 1 : 0,
    transform: on ? 'none' : 'translateY(26px)',
    transition: `opacity .8s ease ${delay}s, transform .8s cubic-bezier(.16,.84,.44,1) ${delay}s`,
  })

  const active = ((Math.round(pos) % N) + N) % N
  const offsetOf = (i) => {
    let o = i - pos
    while (o > N / 2) o -= N
    while (o < -N / 2) o += N
    return o
  }

  const go = (dir) => {
    setDragging(false)
    setPos((p) => Math.round(p) + dir)
  }
  const goTo = (i) => {
    setDragging(false)
    setPos((p) => {
      let o = i - p
      while (o > N / 2) o -= N
      while (o < -N / 2) o += N
      return Math.round(p + o)
    })
  }

  const onDown = (e) => {
    if (phase !== 'done') return // carousel drag only after the intro reveal
    // let the nav arrows / dots keep their own click handling
    if (e.target.closest('.ep-nav') || e.target.closest('.ep-dot')) return
    const posEl = e.target.closest('.ep-pos')
    drag.current = {
      active: true, startX: e.clientX, startPos: pos, moved: 0, lastX: e.clientX, raf: 0,
      pointerId: e.pointerId, captured: false,
      cardIndex: posEl ? Number(posEl.dataset.index) : null,
    }
    setDragging(true)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d.active) return
    d.lastX = e.clientX
    d.moved = Math.max(d.moved, Math.abs(e.clientX - d.startX))
    // capture only once it's clearly a drag, so a tap still resolves cleanly
    if (!d.captured && d.moved > 4) {
      try { e.currentTarget.setPointerCapture(d.pointerId) } catch { /* ignore */ }
      d.captured = true
    }
    if (!d.raf) {
      d.raf = requestAnimationFrame(() => {
        d.raf = 0
        setPos(d.startPos - (d.lastX - d.startX) / 300)
      })
    }
  }
  const onUp = () => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    if (d.raf) { cancelAnimationFrame(d.raf); d.raf = 0 }
    setDragging(false)
    if (d.moved < 6 && d.cardIndex != null) {
      setSelected(d.cardIndex) // a tap → open that card's popup
      setFlipped(false)
    } else if (d.moved < 6 && d.cardIndex == null && selected == null) {
      // tap on empty section area → move one card toward the clicked side
      go(d.startX > window.innerWidth / 2 ? 1 : -1)
    } else {
      setPos((p) => Math.round(p))
    }
  }
  const onCancel = () => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    if (d.raf) { cancelAnimationFrame(d.raf); d.raf = 0 }
    setDragging(false)
    setPos((p) => Math.round(p))
  }

  const posStyle = (o) => {
    const a = Math.abs(o)
    const clamp = Math.min(a, 2.4)
    return {
      transform: `translateX(${o * 232}px) translateZ(${-clamp * 168}px) rotateY(${Math.max(-52, Math.min(52, -o * 40))}deg) scale(${Math.max(0.6, 1 - clamp * 0.16)})`,
      opacity: a > 2.45 ? 0 : Math.max(0.16, 1 - clamp * 0.3),
      zIndex: Math.round(120 - a * 10),
      transition: dragging ? 'none' : 'transform .7s cubic-bezier(.16,.84,.44,1), opacity .7s ease',
      pointerEvents: a > 2.45 ? 'none' : 'auto',
    }
  }

  // Cinematic intro: cards are "released" from inside the ball — each flies out on a
  // curved, spinning arc and settles into its real carousel slot. Driven imperatively
  // for 60fps; on completion we hand the exact final styles back so the existing
  // coverflow/drag behavior takes over untouched.
  const reveal = () => {
    if (phase !== 'idle') return
    // seed every card at the ball's center (collapsed, deep, invisible) before paint
    posRefs.current.forEach((el, i) => {
      if (!el) return
      el.style.transition = 'none'
      el.style.transform = 'translateZ(-360px) scale(.12)'
      el.style.opacity = '0'
      el.style.filter = 'blur(8px)'
      el.style.zIndex = String(Math.round(120 - Math.abs(offsetOf(i)) * 10))
    })
    setPhase('revealing')
    const DUR = 1950
    const start = performance.now()
    const easeOut = (t) => 1 - Math.pow(1 - t, 3)
    const tick = (now) => {
      const g = Math.min(1, (now - start) / DUR)
      posRefs.current.forEach((el, i) => {
        if (!el) return
        const o = offsetOf(i)
        const a = Math.abs(o)
        const clamp = Math.min(a, 2.4)
        const tx = o * 232
        const tz = -clamp * 168
        const ry = Math.max(-52, Math.min(52, -o * 40))
        const sc = Math.max(0.6, 1 - clamp * 0.16)
        const op = a > 2.45 ? 0 : Math.max(0.16, 1 - clamp * 0.3)
        const stg = i * 0.1 // stagger the release per card
        const u = easeOut(Math.max(0, Math.min(1, (g - stg) / (1 - 0.3))))
        const cx = tx * u
        const cz = -360 * (1 - u) + tz * u
        const arcY = -Math.sin(u * Math.PI) * (72 + 26 * a) // curved hop out
        const rz = (1 - u) * (o * 22 + 16) // decaying spin → orbital feel
        const rx = (1 - u) * (i % 2 === 0 ? 42 : -42) // tumble in from alternating directions
        const cry = ry * u
        const csc = 0.12 * (1 - u) + sc * u
        const blur = (1 - u) * 7
        const glow = (1 - u) * 30 // gold energy that fades as the card focuses
        el.style.transform = `translateX(${cx.toFixed(1)}px) translateY(${arcY.toFixed(1)}px) translateZ(${cz.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${cry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg) scale(${csc.toFixed(3)})`
        el.style.opacity = String((op * u).toFixed(3))
        el.style.filter = glow > 0.6 ? `blur(${blur.toFixed(2)}px) drop-shadow(0 0 ${glow.toFixed(1)}px rgba(255,255,255,.55))` : (blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : 'none')
      })
      if (g < 1) requestAnimationFrame(tick)
      else {
        // hand exact final styles back to the carousel (transition restored)
        posRefs.current.forEach((el, i) => {
          if (!el) return
          const s = posStyle(offsetOf(i))
          el.style.transition = s.transition
          el.style.transform = s.transform
          el.style.opacity = String(s.opacity)
          el.style.zIndex = String(s.zIndex)
          el.style.pointerEvents = s.pointerEvents
          el.style.filter = 'none'
        })
        setPhase('done')
      }
    }
    requestAnimationFrame(tick)
  }

  return (
    <section className="ep-section" id="profiles" ref={sectionRef}>
      <div style={css('position:absolute;top:0;left:12%;width:42%;height:64%;background:radial-gradient(ellipse at center,rgba(255,255,255,.08),transparent 64%);pointer-events:none')} />
      <div style={css('position:absolute;bottom:0;right:8%;width:46%;height:62%;background:radial-gradient(ellipse at center,rgba(255,255,255,.06),transparent 64%);pointer-events:none')} />

      {/* staged header: the section opens with only the rotating ball; the
          headline rises in as it scrolls into view, then the explanation.
          Original white treatment. */}
      <div style={css('position:relative;z-index:2;max-width:1240px;margin:0 auto;padding:0 48px;text-align:center')}>
        <div style={{ ...css('display:inline-flex;align-items:center;gap:10px;margin-bottom:16px'), ...reveal2(stage >= 1) }}>
          <span style={css('width:7px;height:7px;border-radius:50%;background:#ffffff;box-shadow:0 0 10px #ffffff')} />
          <span style={css("font:600 12px/1 'JetBrains Mono',monospace;letter-spacing:.18em;color:#eaeaee")}>ATHLETE INTELLIGENCE</span>
        </div>
        <h2 style={{ ...css("font:800 clamp(40px,4.6vw,60px)/1.04 'Sora';letter-spacing:-.03em;margin:0 0 14px;text-wrap:balance"), ...reveal2(stage >= 1, 0.12) }}>Elite Athlete Profiles</h2>
        <p style={{ ...css("font:400 18px/1.6 'Sora';color:#ffffff;max-width:640px;margin:0 auto;text-shadow:0 1px 2px rgba(0,0,0,.6),0 0 18px rgba(0,0,0,.35)"), ...reveal2(stage >= 2, 0.05) }}>Every player has a profile — performance, rankings, trends, and achievements, filterable from country level down to your local town. Then see where you stand: Local Benchmarks ranks you against challengers near you.</p>
      </div>

      <div className="ep-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}>
        <div className="ep-ring" style={{ opacity: phase === 'idle' ? 0 : 1, transition: 'opacity .4s ease' }}>
          {PLAYERS.map((p, i) => (
            <div key={p.name} ref={(el) => { posRefs.current[i] = el }} className="ep-pos" data-index={i} style={posStyle(offsetOf(i))}>
              <div className="ep-card" style={{ '--acc-glow': `rgba(${p.rgb},.45)`, '--acc': p.accent }}>
                <Front p={p} />
              </div>
            </div>
          ))}
        </div>
        {phase !== 'done' && (
          <div className={`ep-ball-stage${phase === 'revealing' ? ' fading' : ''}`}>
            <TennisBall onReveal={reveal} />
          </div>
        )}
      </div>

      <div className="ep-dots" style={{ opacity: ready ? 1 : 0, pointerEvents: ready ? 'auto' : 'none', transition: 'opacity .6s ease' }}>
        {PLAYERS.map((p, i) => (
          <span key={p.name} className={`ep-dot${i === active ? ' on' : ''}`} style={i === active ? css(`background:${p.accent}`) : undefined} onClick={() => goTo(i)} />
        ))}
      </div>
      <div style={{ ...css("text-align:center;margin-top:18px;font:500 11px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:#6b7480"), opacity: ready ? 1 : 0, transition: 'opacity .6s ease' }}>DRAG · SWIPE · TAP A CARD TO EXPLORE</div>

      {selected != null && (
        <div className="ep-overlay" onClick={() => { setSelected(null); setFlipped(false) }}>
          <div className="ep-spot" style={{ '--acc-glow': `rgba(${PLAYERS[selected].rgb},.5)`, '--acc': PLAYERS[selected].accent }} onClick={(e) => e.stopPropagation()}>
            <div className="ep-aura" />
            {PARTICLES.map((pt, i) => (
              <span key={i} className="ep-particle" style={{ left: pt.l, top: pt.t, width: pt.s + 'px', height: pt.s + 'px', animationDelay: pt.d, opacity: 0.55 }} />
            ))}
            <button className="ep-close" onClick={() => { setSelected(null); setFlipped(false) }} aria-label="Close">✕</button>
            <div className={`ep-flip${flipped ? ' on' : ''}`} onClick={() => setFlipped((f) => !f)}>
              <div className="ep-face">
                <Front p={PLAYERS[selected]} big />
                {!flipped && (
                  <div style={css(`position:absolute;top:74px;left:50%;transform:translateX(-50%);z-index:3;font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:${PLAYERS[selected].accent};opacity:.9`)}>↻ TAP TO FLIP</div>
                )}
              </div>
              <div className="ep-face ep-back">
                <Back p={PLAYERS[selected]} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
