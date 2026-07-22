import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { css } from '../utils/css.js'
import EliteProfiles from '../components/EliteProfiles.jsx'
import FaceOff from '../components/FaceOff.jsx'
import GoViral from '../components/GoViral.jsx'
import BioMotion from '../components/BioMotion.jsx'
import Commentary from '../components/Commentary.jsx'
import Recommendations from '../components/Recommendations.jsx'
import GhostPlay from '../components/GhostPlay.jsx'
import Ecosystem from '../components/Ecosystem.jsx'
import HeroShowcase from '../components/HeroShowcase.jsx'
import NavLab from '../components/nav/NavLab.jsx'
import About from '../components/About.jsx'

// Lvl-Up Home — a cinematic, interaction-gated experience:
//  1. On load, only the full-screen montage plays, with a "click to begin" prompt.
//  2. On first interaction (click / tap / scroll / key), the video settles into
//     the background and the UI reveals with staggered, Apple-keynote-style motion.
//  The montage stays fixed behind the hero and bleeds into the top of the sport
//  selector via a gradient, so it never hard-cuts.

const ICON_BOX_LIVE_RED = css(
  'width:46px;height:46px;border-radius:13px;background:linear-gradient(145deg,rgba(227,185,74,.2),rgba(227,185,74,.05));border:1px solid rgba(227,185,74,.32);display:flex;align-items:center;justify-content:center',
)
const ICON_BOX_LIVE_SOFT = css(
  'width:46px;height:46px;border-radius:13px;background:linear-gradient(145deg,rgba(227,185,74,.16),rgba(227,185,74,.04));border:1px solid rgba(227,185,74,.26);display:flex;align-items:center;justify-content:center',
)
const ICON_BOX_SOON = css(
  'width:46px;height:46px;border-radius:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center',
)

const GLASS_STAT_STR =
  'min-width:180px;padding:16px 18px;border-radius:16px;background:rgba(14,17,20,.5);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 44px rgba(0,0,0,.4)'
const STAT_LABEL = css(
  "font:500 11px/1.3 'JetBrains Mono',monospace;letter-spacing:.08em;color:#9aa3ad;margin-top:6px",
)

// count-up easing for the hero stats (run once on reveal)
function tween(el) {
  const target = parseFloat(el.getAttribute('data-count'))
  if (isNaN(target)) return
  const dec = parseInt(el.getAttribute('data-decimals') || '0', 10)
  const suf = el.getAttribute('data-suffix') || ''
  const dur = 1500
  const start = performance.now()
  const fmt = (v) => (dec > 0 ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suf
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur)
    const e = 1 - Math.pow(1 - t, 3)
    el.textContent = fmt(target * e)
    if (t < 1) requestAnimationFrame(step)
    else el.textContent = fmt(target)
  }
  requestAnimationFrame(step)
}

function SportCard({ to, cardClass, cardStyle, iconBox, icon, badge, title, desc, descColor, cta, image }) {
  const inner = (
    <>
      {image && (
        <>
          <img src={image} alt="" aria-hidden="true" style={css('position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 30%;z-index:0;transition:transform .6s cubic-bezier(.16,.84,.44,1);will-change:transform')} />
          {/* readability gradient — image shows up top, darkens behind the copy */}
          <div style={css('position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(8,10,13,.30) 0%,rgba(8,10,13,.52) 42%,rgba(8,10,13,.9) 100%)')} />
        </>
      )}
      <div style={css('position:relative;z-index:2;display:flex;align-items:flex-start;justify-content:space-between')}>
        <span style={iconBox}>{icon}</span>
        {badge}
      </div>
      <div style={css('position:relative;z-index:2;text-align:left')}>
        <h3 style={css("font:700 18px/1.2 'Sora';margin:0 0 6px")}>{title}</h3>
        <p style={css(`font:400 12.5px/1.5 'Sora';color:${descColor};margin:0 0 12px`)}>{desc}</p>
        {cta}
      </div>
    </>
  )
  const cardCss = css(image ? `${cardStyle};position:relative;overflow:hidden` : cardStyle)
  return to ? (
    <Link to={to} className={cardClass} style={cardCss}>
      {inner}
    </Link>
  ) : (
    <div className={cardClass} style={cardCss}>
      {inner}
    </div>
  )
}

// merge a css() style object with a stagger delay
const rv = (style, delay) => ({ ...css(style), transitionDelay: delay })

// split text into per-letter spans for the staggered hero reveal (spaces preserved)
const NBSP = String.fromCharCode(160)
const heroLetters = (text, base, step, cls) =>
  [...text].map((ch, i) => (
    <span key={i} className={cls} style={{ transitionDelay: (base + i * step).toFixed(3) + 's' }}>
      {ch === ' ' ? ' ' : ch}
    </span>
  ))

// Pick Your Game is a scroll-PINNED stage: the section is a tall track, an inner
// 100vh stage sticks to the viewport, and scroll progress through the track drives
// the reveal — first the heading slides in, then each card flies in one-by-one from
// far outside the viewport. dx/dy are fractions of viewport width/height; win is the
// [start,end] slice of pin progress (0→1) over which each card travels.
// eight cards rise in gently, one-by-one — restrained/premium (short lift + soft scale)
const REVEAL_CARDS = Array.from({ length: 8 }, (_, i) => ({
  dx: 0, dy: 0.07, s: 0.96, win: [0.08 + i * 0.068, 0.30 + i * 0.068],
}))
const cardInitStyle = (c) => ({
  display: 'grid',
  opacity: 0,
  transform: `translate(${c.dx * 100}vw, ${c.dy * 100}vh) scale(${c.s})`,
  filter: 'blur(8px)',
  // long, eased transitions give a slow, cinematic settle as scroll scrubs the value
  transition: 'opacity .4s ease-out, transform .55s cubic-bezier(.22,.61,.36,1), filter .45s ease-out',
  willChange: 'opacity, transform',
})
// ambient floating particles / light motes for the hero (premium depth)
const HERO_FX = [
  { l: '12%', t: '30%', s: '5px', o: 0.5, d: '13s', delay: '0s' },
  { l: '22%', t: '68%', s: '3px', o: 0.4, d: '17s', delay: '2s' },
  { l: '34%', t: '20%', s: '4px', o: 0.45, d: '15s', delay: '4s' },
  { l: '46%', t: '78%', s: '6px', o: 0.5, d: '19s', delay: '1s' },
  { l: '58%', t: '24%', s: '3px', o: 0.35, d: '16s', delay: '3s' },
  { l: '66%', t: '60%', s: '5px', o: 0.5, d: '14s', delay: '5s' },
  { l: '76%', t: '34%', s: '4px', o: 0.45, d: '18s', delay: '2.5s' },
  { l: '86%', t: '70%', s: '3px', o: 0.4, d: '15s', delay: '6s' },
  { l: '7%', t: '52%', s: '4px', o: 0.4, d: '20s', delay: '1.5s' },
  { l: '92%', t: '44%', s: '5px', o: 0.45, d: '17s', delay: '4.5s' },
]
// heading enters first, dramatically — rises + fades + unblurs from below
const HEADING_INIT = {
  opacity: 0,
  transform: 'translateY(80px) scale(.92)',
  filter: 'blur(12px)',
  transition: 'opacity .45s ease-out, transform .6s cubic-bezier(.22,.61,.36,1), filter .5s ease-out',
  willChange: 'opacity, transform',
}
// settled state once the section has unlocked — fully visible, NO transition so the
// switch from pin to normal block is instant (never a fade or flash)
const CARD_DONE = { display: 'grid', opacity: 1, transform: 'none', filter: 'none', transition: 'none' }
const HEADING_DONE = { textAlign: 'center', marginBottom: '34px', opacity: 1, transform: 'none', filter: 'none', transition: 'none' }

// minimal line glyphs per sport (stroke inherits the card accent colour)
function SportGlyph({ name, c }) {
  const p = { stroke: c, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  const svg = (children) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none">{children}</svg>
  switch (name) {
    case 'tennis': return svg(<><circle cx="12" cy="12" r="9" {...p} /><path d="M5.5 6.5C9 9 9 15 5.5 17.5M18.5 6.5C15 9 15 15 18.5 17.5" {...p} /></>)
    case 'pickle': return svg(<><circle cx="12" cy="12" r="9" {...p} /><circle cx="9" cy="9.5" r="1" fill={c} /><circle cx="13.5" cy="9" r="1" fill={c} /><circle cx="10.5" cy="13.5" r="1" fill={c} /><circle cx="15" cy="13" r="1" fill={c} /></>)
    case 'basket': return svg(<><circle cx="12" cy="12" r="9" {...p} /><path d="M3 12h18M12 3v18M5.5 5.5c4 3 9 3 13 0M5.5 18.5c4-3 9-3 13 0" {...p} strokeWidth="1.3" /></>)
    case 'volley': return svg(<><circle cx="12" cy="12" r="9" {...p} /><path d="M12 3c-3 5-3 10 0 18M4 8c5 2 11 1 15-3M5 18c3-4 9-6 15-4" {...p} strokeWidth="1.3" /></>)
    case 'badminton': return svg(<><circle cx="16.5" cy="7.5" r="2.3" {...p} /><path d="M14.8 9.2 5 19M12.4 8.2 4 16.6M15.4 10.6 7.4 18.6M4 16.6l3.4 3.4" {...p} strokeWidth="1.3" /></>)
    case 'padel': return svg(<><path d="M12 3c4.4 0 7 3 7 6.6 0 3.4-3 5.4-7 5.4S5 13 5 9.6C5 6 7.6 3 12 3Z" {...p} /><path d="M12 15v6" {...p} /><circle cx="10" cy="8" r="0.9" fill={c} /><circle cx="14" cy="8" r="0.9" fill={c} /><circle cx="12" cy="11" r="0.9" fill={c} /></>)
    case 'squash': return svg(<><ellipse cx="10.5" cy="8" rx="5.5" ry="6.4" {...p} transform="rotate(28 10.5 8)" /><path d="M13.6 12.8 20 21" {...p} /><circle cx="18.5" cy="16.5" r="1.5" {...p} /></>)
    case 'cricket': return svg(<><path d="M7 17 16 4.5c.5-.7 1.6-.7 2.1 0l.4.6c.5.7.3 1.6-.4 2L7.8 17.8" {...p} /><path d="M4.5 20.5 7 17" {...p} /><circle cx="6.5" cy="8" r="2" {...p} /></>)
    default: return svg(<circle cx="12" cy="12" r="9" {...p} />)
  }
}

// full Pick Your Game roster — 2 live, 2 coming soon
const SPORTS = [
  { title: 'Tennis', to: '/tennis', img: '/assets/sport-tennis.jpg', desc: 'Serve, return, and full rally intelligence.', glyph: 'tennis', live: true },
  { title: 'Pickleball', to: '/pickleball', img: '/assets/sport-pickleball.jpg', desc: 'Shot tracking, kitchen play, and rally analytics.', glyph: 'pickle', live: true },
  { title: 'Badminton', img: '/assets/sport-badminton.jpg', desc: 'Smash speed, footwork, and rally control.', glyph: 'badminton', live: false },
  { title: 'Squash', img: '/assets/sport-squash.jpg', desc: 'Length, angles, and relentless court control.', glyph: 'squash', live: false },
]
const GOLD = '#e3b94a'
const SOON_BADGE = css("font:600 8.5px/1 'JetBrains Mono',monospace;letter-spacing:.14em;color:#e6e9ee;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);padding:5px 9px;border-radius:6px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)")
const LIVE_BADGE = css("font:600 9px/1 'JetBrains Mono',monospace;letter-spacing:.12em;color:#161204;background:#e3b94a;padding:5px 9px;border-radius:6px")
const CARD_LIVE = 'display:flex;flex-direction:column;justify-content:space-between;min-height:206px;padding:20px;border-radius:18px;background:linear-gradient(160deg,#16191d,#0f1216);border:1px solid rgba(227,185,74,.38);box-shadow:0 20px 48px rgba(0,0,0,.42);transition:transform .4s cubic-bezier(.16,.84,.44,1),border-color .4s,box-shadow .4s'
const CARD_SOON = 'display:flex;flex-direction:column;justify-content:space-between;min-height:206px;padding:20px;border-radius:18px;background:linear-gradient(160deg,#14171b,#0e1013);border:1px solid rgba(255,255,255,.09);box-shadow:0 18px 44px rgba(0,0,0,.4);transition:transform .4s cubic-bezier(.16,.84,.44,1),border-color .4s,box-shadow .4s'

export default function Home() {
  const videoRef = useRef(null)
  const heroRef = useRef(null)
  const cardsRef = useRef(null)
  const cardWrapRefs = useRef([])
  const trackRef = useRef(null)
  const headingRef = useRef(null)
  const fxRef = useRef(null)
  const copyRef = useRef(null)
  const [heroHover, setHeroHover] = useState(false)
  // returning from a sport page → skip the intro and land straight on Pick Your Game
  const returningToSports = () => { try { return sessionStorage.getItem('lvlup:goto') === 'sports' } catch { return false } }
  const [started, setStarted] = useState(returningToSports)
  // one-time pin: once all four cards have fully revealed, the section unlocks and
  // behaves like a normal (un-pinned) block — no reverse animation, no re-pinning.
  const [unlocked, setUnlocked] = useState(returningToSports)
  const unlockedRef = useRef(returningToSports())
  const pendingScrollRef = useRef(null)

  // keep the montage playing
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
  }, [])

  // intro: lock scroll and wait for the first interaction (click / scroll / key / tap)
  useEffect(() => {
    if (started) return
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    const begin = () => {
      setStarted(true)
      window.scrollTo(0, 0) // always enter at the very top of the hero
    }
    // scrolling must behave exactly like clicking: block the scroll so the page
    // never moves, then trigger the reveal (works on desktop wheel + mobile touch)
    const onScroll = (e) => {
      e.preventDefault()
      begin()
    }
    window.addEventListener('wheel', onScroll, { passive: false })
    window.addEventListener('touchmove', onScroll, { passive: false })
    window.addEventListener('keydown', begin)
    window.addEventListener('pointerdown', begin)
    return () => {
      window.removeEventListener('wheel', onScroll)
      window.removeEventListener('touchmove', onScroll)
      window.removeEventListener('keydown', begin)
      window.removeEventListener('pointerdown', begin)
    }
  }, [started])

  // on reveal: restore scroll, snap to the very top, and run the stat count-ups
  useEffect(() => {
    if (!started) return
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    window.scrollTo(0, 0)
    const t = setTimeout(() => {
      heroRef.current
        ?.querySelectorAll('[data-count]:not([data-done])')
        .forEach((el) => {
          el.setAttribute('data-done', '1')
          tween(el)
        })
    }, 600)
    return () => clearTimeout(t)
  }, [started])

  // return-from-sport-page: consume the flag and land on Pick Your Game (no hero flash;
  // started/unlocked were already initialised true, so the section is revealed + static)
  useEffect(() => {
    let ret = false
    try { ret = sessionStorage.getItem('lvlup:goto') === 'sports' } catch { /* ignore */ }
    if (!ret) return
    try { sessionStorage.removeItem('lvlup:goto') } catch { /* ignore */ }
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    // Land on Pick Your Game with no visible scroll through the hero. The pinned track
    // settles its height over a few frames, so keep re-anchoring #sports to the top
    // (instant, not smooth) until it holds steady — resilient to late layout / throttling.
    let raf = 0, stable = 0, frames = 0
    const jump = () => {
      const el = document.getElementById('sports')
      if (el) {
        const top = el.getBoundingClientRect().top
        if (Math.abs(top) > 2) { window.scrollTo(0, window.scrollY + top); stable = 0 } else stable += 1
      }
      frames += 1
      if (stable < 4 && frames < 48) raf = requestAnimationFrame(jump)
    }
    jump()
    raf = requestAnimationFrame(jump)
    const t = setTimeout(jump, 120)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [])

  // safety: always restore scroll on unmount
  useEffect(() => () => {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  }, [])

  // subtle hero parallax: ambient lighting drifts one way, the headline the other,
  // so the type feels like it floats above the video with real depth.
  useEffect(() => {
    const hero = heroRef.current
    if (!hero || window.matchMedia('(pointer: coarse)').matches) return
    let raf = 0
    const cur = { x: 0, y: 0 }
    const tgt = { x: 0, y: 0 }
    const loop = () => {
      cur.x += (tgt.x - cur.x) * 0.06
      cur.y += (tgt.y - cur.y) * 0.06
      if (fxRef.current) fxRef.current.style.transform = `translate3d(${(cur.x * 26).toFixed(1)}px, ${(cur.y * 20).toFixed(1)}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    const onMove = (e) => {
      const r = hero.getBoundingClientRect()
      tgt.x = ((e.clientX - r.left) / r.width) * 2 - 1
      tgt.y = ((e.clientY - r.top) / r.height) * 2 - 1
    }
    const onLeave = () => { tgt.x = 0; tgt.y = 0 }
    hero.addEventListener('pointermove', onMove)
    hero.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      hero.removeEventListener('pointermove', onMove)
      hero.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  const scrollToSports = () =>
    document.getElementById('sports')?.scrollIntoView({ behavior: 'smooth' })

  // Scroll-pinned reveal. The section is a tall track; the inner stage sticks to the
  // viewport while the user scrolls through it. Pin progress (0→1) drives the heading
  // in first, then each card one-by-one from far off-screen — and the track can't be
  // scrolled past (next section can't appear) until every card is settled.
  useEffect(() => {
    let raf = 0
    const easeOut = (t) => 1 - Math.pow(1 - t, 3)
    const writeHeading = (he) => {
      const h = headingRef.current
      if (!h) return
      h.style.opacity = he <= 0 ? '0' : String(he)
      h.style.transform = `translateY(${(80 * (1 - he)).toFixed(1)}px) scale(${(0.92 + 0.08 * he).toFixed(3)})`
      h.style.filter = `blur(${((1 - he) * 12).toFixed(2)}px)`
    }
    const writeCard = (i, e, lp, vw, vh) => {
      const w = cardWrapRefs.current[i]
      if (!w) return
      const c = REVEAL_CARDS[i]
      w.style.opacity = lp <= 0 ? '0' : String(e) // no opacity preview before its window
      w.style.transform = `translate(${(c.dx * vw * (1 - e)).toFixed(1)}px, ${(c.dy * vh * (1 - e)).toFixed(1)}px) scale(${(c.s + (1 - c.s) * e).toFixed(3)})`
      w.style.filter = `blur(${((1 - e) * 8).toFixed(2)}px)`
    }
    const update = () => {
      raf = 0
      if (unlockedRef.current) return // section completed — it's a normal block now
      const track = trackRef.current
      if (!track) return
      const vw = window.innerWidth || 1200
      const vh = window.innerHeight || 800
      // Pinning only when the 100vh stage can comfortably hold the 4-up grid (desktop).
      // Below that the track collapses (CSS) and everything is simply shown.
      if (vw <= 1080) {
        writeHeading(1)
        for (let i = 0; i < REVEAL_CARDS.length; i++) writeCard(i, 1, 1, vw, vh)
        return
      }
      const rect = track.getBoundingClientRect()
      const span = rect.height - vh // pinnable scroll distance (px)
      const p = span > 0 ? Math.max(0, Math.min(1, -rect.top / span)) : 0
      writeHeading(easeOut(Math.max(0, Math.min(1, p / 0.15)))) // heading first
      for (let i = 0; i < REVEAL_CARDS.length; i++) {
        const c = REVEAL_CARDS[i]
        const lp = Math.max(0, Math.min(1, (p - c.win[0]) / (c.win[1] - c.win[0])))
        writeCard(i, easeOut(lp), lp, vw, vh)
      }
      // first full reveal complete → unlock the section permanently (this run).
      // Remember the current track-top so we can keep the stage visually in place
      // after the tall pin track collapses to a normal-height block.
      if (p >= 0.92) {
        unlockedRef.current = true
        pendingScrollRef.current = window.scrollY + rect.top
        setUnlocked(true)
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

  // When the section unlocks, the track collapses from a tall pin to a normal block.
  // Lock the cards/heading to their settled state and re-anchor scroll synchronously
  // (before paint) so the stage doesn't visually jump.
  useLayoutEffect(() => {
    if (!unlocked) return
    const h = headingRef.current
    if (h) { h.style.opacity = '1'; h.style.transform = 'none'; h.style.filter = 'none' }
    cardWrapRefs.current.forEach((w) => {
      if (w) { w.style.opacity = '1'; w.style.transform = 'none'; w.style.filter = 'none' }
    })
    if (pendingScrollRef.current != null) {
      window.scrollTo(0, pendingScrollRef.current)
      pendingScrollRef.current = null
    }
  }, [unlocked])

  return (
    <div className={started ? 'ag-home ag-on' : 'ag-home'} style={css('position:relative;background:#0a0b0d')}>
      {/* fixed background intro video */}
      <div className="ag-video-wrap">
        <video ref={videoRef} autoPlay muted loop playsInline preload="auto" poster="/assets/home-intro-poster.jpg" aria-hidden="true">
          <source src="/assets/home-intro.mp4" type="video/mp4" />
        </video>
      </div>
      {/* intro veil (clears on start) + film grain */}
      <div className="ag-intro-veil" style={css('position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(130% 95% at 50% 100%,rgba(0,0,0,.6),transparent 56%),linear-gradient(180deg,rgba(0,0,0,.4),transparent 32%)')} />
      <div style={css('position:fixed;inset:0;z-index:60;pointer-events:none;opacity:.022;mix-blend-mode:overlay;background-image:radial-gradient(rgba(255,255,255,.9) .5px,transparent .6px);background-size:3px 3px')} />

      {/* intro prompt */}
      <div className="ag-prompt">
        <span className="ag-prompt-ring">
          <span style={css('width:0;height:0;border-style:solid;border-width:8px 0 8px 13px;border-color:transparent transparent transparent #fff;margin-left:4px')} />
        </span>
        <span className="ag-prompt-text">CLICK ANYWHERE TO BEGIN</span>
        <svg className="ag-chev" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ===================== HERO ===================== */}
      <header ref={heroRef} onMouseEnter={() => setHeroHover(true)} onMouseLeave={() => setHeroHover(false)} style={css('position:relative;z-index:10;min-height:100vh;overflow:hidden;display:flex;flex-direction:column')}>
        {/* frosted glass between video and content — softens & integrates the footage */}
        <div className="ag-hero-frost" />
        <div className="ag-heroscrim" />
        {/* purple/pink mood + legibility wash — video stays visible behind it */}
        <div className="ag-hero-tint" />
        {/* animated brand-color lighting + ambient motes (parallax wrapper) */}
        <div className="ag-hero-fx" ref={fxRef}>
          <div className="ag-hero-aurora" />
          <div className="ag-hero-particles">
            {HERO_FX.map((p, i) => (
              <i key={i} style={{ left: p.l, top: p.t, width: p.s, height: p.s, '--o': p.o, animationDuration: p.d, animationDelay: p.delay }} />
            ))}
          </div>
        </div>
        {/* cinematic vignette around the edges */}
        <div className="ag-hero-vignette" />
        {/* hover-driven premium image showcase (replaces the old scroll reveal) */}
        <HeroShowcase active={heroHover} />

        {/* nav (drops in from the top) */}
        <nav className="ag-rv ag-rv-top ag-pad" style={{ ...css('position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:24px 48px'), transitionDelay: '.05s' }}>
          <Link to="/" style={css('display:flex;align-items:center;gap:11px')}>
            <span style={css("width:30px;height:30px;border-radius:8px;background:#0b0d10;display:flex;align-items:center;justify-content:center;color:#d6f637;font:800 17px/1 'Sora'")}>L</span>
            <span style={css("font:700 20px/1 'Sora';letter-spacing:-.01em;color:#0b0d10")}>Lvl-Up</span>
          </Link>
          <div style={css('display:flex;align-items:center;gap:16px')}>
            <a className="h-signin" style={css("font:600 14px/1 'Sora';color:#33383f;cursor:pointer")}>Sign In</a>
            <button className="h-lift" style={css("font:600 14px/1 'Sora';color:#fff;background:#0b0d10;border:none;padding:11px 20px;border-radius:10px;cursor:pointer;transition:transform .15s;box-shadow:0 8px 26px rgba(0,0,0,.25)")}>Get Started</button>
          </div>
        </nav>

        {/* hero headline — huge type straight over the video (no card) */}
        <div ref={copyRef} className="ag-pad ag-hero-copy" style={css('position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;width:100%;max-width:1500px;margin:0 auto;padding:88px 40px 64px')}>
          <div style={css("font:700 13px/1 'JetBrains Mono',monospace;letter-spacing:.4em;text-transform:uppercase;color:#4b5158;margin-bottom:6px")}><span className="lr-line" style={{ transitionDelay: '.05s' }}>AI-Powered Athlete Intelligence</span></div>
          <h1 style={css("margin:0;font-family:'Sora',sans-serif;font-weight:800;line-height:.84;letter-spacing:-.035em;text-transform:uppercase")}>
            <span style={css("display:block;font-size:clamp(20px,3.2vw,46px);font-weight:700;letter-spacing:.14em;color:#16181c;margin-bottom:.14em")}>{heroLetters('Play smarter —', 0.5, 0.03, 'lr-char')}</span>
            <span style={css("display:block;font-size:clamp(56px,13.5vw,208px)")}>{heroLetters('Own every', 0.95, 0.042, 'lr-hero')}</span>
            <span style={css("display:block;font-size:clamp(56px,13.5vw,208px);margin-top:.06em")}>
              {/* tennis-ball lime "marker chip" behind the key word — the lime
                  fill is gated on .ag-on so it never shows over the intro video */}
              <span className="hero-chip" style={css('display:inline-block;padding:.04em .14em .06em;border-radius:.06em')}>{heroLetters('Point', 1.118, 0.042, 'lr-hero')}</span>
            </span>
          </h1>
          <div className="lr-btn" style={{ ...css('display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:38px'), transitionDelay: '2.1s' }}>
            <button className="h-glass" style={css("display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:320px;font:600 14px/1 'Sora';color:#16181c;padding:14px 40px 14px 16px;border-radius:12px;background:rgba(255,255,255,.55);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,.24);cursor:pointer;transition:background .15s")}>
              <span style={css('width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#c9ef2f,#a8cf12);display:flex;align-items:center;justify-content:center;animation:glowPulseP 2.4s infinite')}>
                <span style={css('width:0;height:0;border-style:solid;border-width:5px 0 5px 8px;border-color:transparent transparent transparent #16181c;margin-left:2px')} />
              </span>
              Watch Trailer
            </button>
          </div>
        </div>

      </header>

      {/* ===================== SPORT SELECTOR ===================== */}
      <section id="sports" ref={trackRef} className="ag-pin-track" style={css(`position:relative;z-index:10;height:${unlocked ? 100 : 420}vh`)}>
        <div className="ag-pin-stage" style={css(`position:${unlocked ? 'static' : 'sticky'};top:0;height:100vh;overflow:hidden;display:flex;align-items:center;padding:0 48px;background:linear-gradient(180deg,rgba(6,7,10,.58) 0%,rgba(6,7,10,.44) 42%,rgba(6,7,10,.74) 100%),url('/assets/pickgame-bg3.jpg') center/cover no-repeat`)}>
        <div style={css('position:absolute;top:4%;left:50%;transform:translateX(-50%);width:64%;height:30%;background:radial-gradient(ellipse at center,rgba(6,7,10,.62),transparent 68%);pointer-events:none')} />

        <div style={css('position:relative;z-index:10;max-width:1240px;margin:0 auto;width:100%')}>
          <div ref={headingRef} style={unlocked ? HEADING_DONE : { ...css('text-align:center;margin-bottom:34px'), ...HEADING_INIT }}>
            <div style={css('display:inline-flex;align-items:center;gap:10px;margin-bottom:14px')}>
              <span style={css('width:30px;height:1px;background:rgba(255,255,255,.25)')} />
              <span style={css("font:600 11px/1 'JetBrains Mono',monospace;letter-spacing:.18em;color:#e3b94a")}>CHOOSE YOUR SPORT</span>
              <span style={css('width:30px;height:1px;background:rgba(255,255,255,.25)')} />
            </div>
            <h2 className="ag-h2" style={css("font:800 clamp(40px,4.8vw,60px)/1.03 'Sora';letter-spacing:-.03em;margin:0 0 14px;text-wrap:balance;text-shadow:0 2px 24px rgba(0,0,0,.6)")}>Pick your game</h2>
            <p style={css("font:400 16px/1.6 'Sora';color:#aab2bb;max-width:500px;margin:0 auto;text-shadow:0 1px 14px rgba(0,0,0,.6)")}>Choose your sport and unlock performance intelligence built around how you play.</p>
          </div>

          {/* sport cards */}
          <div ref={cardsRef} className="ag-sport-grid" style={css('display:grid;grid-template-columns:repeat(4,1fr);gap:22px;width:100%;max-width:1080px;margin:0 auto')}>
            {SPORTS.map((s, i) => (
              <div key={s.title} ref={(el) => { cardWrapRefs.current[i] = el }} style={unlocked ? CARD_DONE : cardInitStyle(REVEAL_CARDS[i])}>
                <SportCard
                  to={s.live ? s.to : undefined}
                  cardClass="h-sportcard"
                  image={s.img}
                  cardStyle={s.live ? CARD_LIVE : CARD_SOON}
                  iconBox={s.live ? ICON_BOX_LIVE_SOFT : ICON_BOX_SOON}
                  icon={<SportGlyph name={s.glyph} c={s.live ? GOLD : '#aeb6bf'} />}
                  badge={s.live ? <span style={LIVE_BADGE}>LIVE</span> : <span style={SOON_BADGE}>COMING SOON</span>}
                  title={s.title}
                  desc={s.desc}
                  descColor={s.live ? '#b7bec6' : '#9aa3ad'}
                  cta={s.live
                    ? <span style={css("display:inline-flex;align-items:center;gap:7px;font:600 13px/1 'Sora';color:#e3b94a")}>Explore →</span>
                    : <span style={css("display:inline-flex;align-items:center;gap:7px;font:600 12px/1 'Sora';color:#8b95a1")}>Coming soon</span>}
                />
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>

      {/* ===================== BIO MOTION ANALYSIS ===================== */}
      <BioMotion />

      {/* ===================== FACE OFF ===================== */}
      <FaceOff />

      {/* ===================== AI COMMENTARY ===================== */}
      <Commentary />

      {/* ===================== ELITE ATHLETE PROFILES ===================== */}
      <EliteProfiles />

      {/* ===================== GHOST PLAY ===================== */}
      <GhostPlay />

      {/* ===================== AI RECOMMENDATIONS ===================== */}
      <Recommendations />

      {/* ===================== GO VIRAL INSTANTLY ===================== */}
      <GoViral />

      {/* ===================== ECOSYSTEM ===================== */}
      <Ecosystem />

      {/* ===================== ABOUT / LEADERSHIP ===================== */}
      <About />

      {/* footer */}
      <footer className="ag-rv ag-rv-up ag-pad" style={css('position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:24px 48px;border-top:1px solid rgba(255,255,255,.06);background:#0a0b0d')}>
        <span style={css("font:400 13px/1 'JetBrains Mono',monospace;color:#7d8691")}>© 2026 Lvl-Up. All rights reserved.</span>
        <span style={css("font:400 13px/1 'Sora';color:#7d8691")}>Advanced analytics for every athlete.</span>
      </footer>

      {/* floating section navigator (overlay only) — Nav Lab holds the
          switchable design variants until one is finalized */}
      <NavLab />
    </div>
  )
}
