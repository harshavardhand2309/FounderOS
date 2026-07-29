import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { css } from '../utils/css.js'

// Go Viral Instantly — a scroll-pinned social-media editing showcase. The copy stays
// pinned on the left while a filmstrip of vertical "clip" cards slides sideways one by
// one (coverflow focus + glow + blur + parallax). Pins until the strip has played
// through, then unlocks for good. Blue / white / black palette, scoped to .gv-*.

// One highlight reel per sport, in playing order. Only the card in focus plays,
// so four videos never decode at once.
const CLIPS = [
  { platform: 'Tennis', poster: '/assets/sport-tennis.jpg', glyph: 'ig', src: '/assets/highlight-Tennis.mp4', ratio: '9:16 Reel', res: '1080×1920', dur: 'Highlight', fmt: 'Download MP4' },
  { platform: 'Pickleball', poster: '/assets/sport-pickleball-edit.png', glyph: 'yt', src: '/assets/Highlight-Pickleball.mp4', ratio: '9:16 Reel', res: '1080×1920', dur: 'Highlight', fmt: 'Download MP4' },
  { platform: 'Badminton', poster: '/assets/sport-badminton.jpg', glyph: 'st', src: '/assets/Highlight-Badminton.mp4', ratio: '9:16 Reel', res: '1080×1920', dur: 'Highlight', fmt: 'Download MP4' },
  { platform: 'Padel', poster: '/assets/sports-paddle.png', glyph: 'hl', src: '/assets/highlight-padle.mp4', ratio: '9:16 Reel', res: '1080×1920', dur: 'Highlight', fmt: 'Download MP4' },
]

const WAVE = [6, 11, 7, 14, 9, 16, 8, 13, 6, 12, 9, 15, 7, 10]
const PARTICLES = [
  { l: '10%', t: '22%', s: 5, d: '0s' }, { l: '86%', t: '30%', s: 4, d: '1.2s' },
  { l: '18%', t: '74%', s: 6, d: '.6s' }, { l: '78%', t: '70%', s: 5, d: '1.7s' },
  { l: '40%', t: '16%', s: 4, d: '.9s' }, { l: '62%', t: '82%', s: 5, d: '1.4s' },
]

const clamp01 = (x) => Math.max(0, Math.min(1, x))

const Glyph = ({ g }) => {
  const c = '#dbe8ff'
  if (g === 'ig') return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke={c} strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke={c} strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.1" fill={c} /></svg>)
  if (g === 'yt') return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="3.5" stroke={c} strokeWidth="1.7" /><path d="M11 9.5l3.5 2.5L11 14.5z" fill={c} /></svg>)
  if (g === 'st') return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="3" stroke={c} strokeWidth="1.7" /><path d="M9.5 19h5" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>)
  return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 16l4-6 3 4 3-7 6 9" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>)
}

export default function GoViral() {
  const trackRef = useRef(null)
  const vpRef = useRef(null)
  const stripRef = useRef(null)
  const cardRefs = useRef([])
  const applyRef = useRef(null)
  const pendingRef = useRef(null)
  const doneRef = useRef(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const apply = (p) => {
      const vp = vpRef.current
      const strip = stripRef.current
      if (!vp || !strip) return
      const vw = vp.clientWidth
      const center = vw / 2
      // End the run with the LAST card dead-centre, not with the strip flush to
      // the viewport's right edge — flush-right leaves the final (padel) card
      // outside the k>0.7 focus zone, so it never activates and its video never
      // gets a play() call.
      const cards = cardRefs.current
      const last = cards[cards.length - 1]
      const endX = last
        ? center - (last.offsetLeft + last.offsetWidth / 2)
        : -Math.max(0, strip.scrollWidth - vw)
      const startX = vw * 0.85 // cards begin pushed off to the right
      const x = startX + (endX - startX) * p
      strip.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`
      cardRefs.current.forEach((card) => {
        if (!card) return
        const cc = card.offsetLeft + card.offsetWidth / 2 + x // centre relative to viewport
        const d = (cc - center) / vw // signed, ~[-1,1]
        const k = clamp01(1 - Math.abs(d) * 1.55) // 1 at centre → 0 at edges
        card.style.transform = `translate3d(0,0,0) scale(${(0.82 + 0.18 * k).toFixed(3)}) rotateY(${(-d * 20).toFixed(1)}deg)`
        card.style.opacity = (0.4 + 0.6 * k).toFixed(2)
        card.style.filter = `blur(${((1 - k) * 3).toFixed(2)}px)`
        card.style.zIndex = String(50 + Math.round(k * 50))
        const wasActive = card.classList.contains('gv-card-active')
        const isActive = k > 0.7
        card.classList.toggle('gv-card-active', isActive)
        if (isActive !== wasActive) {
          const v = card.querySelector('video')
          if (v) {
            if (isActive) {
              // React does not reliably set the muted *property*, and an unmuted
              // autoplay is refused outright — so force it before playing.
              v.muted = true
              v.defaultMuted = true
              const pr = v.play()
              if (pr && pr.catch) pr.catch(() => {})
            }
            else v.pause()
          }
        }
      })
    }
    applyRef.current = apply
    const update = () => {
      raf = 0
      if (doneRef.current) return
      const vw = window.innerWidth || 1200
      const vh = window.innerHeight || 800
      if (vw <= 1080) { // mobile/tablet: no pin, native horizontal scroll
        const strip = stripRef.current
        if (strip) strip.style.transform = 'none'
        cardRefs.current.forEach((c) => { if (c) { c.style.transform = 'none'; c.style.opacity = '1'; c.style.filter = 'none' } })
        return
      }
      const rect = track.getBoundingClientRect()
      const span = rect.height - vh
      const p = span > 0 ? clamp01(-rect.top / span) : 0
      apply(p)
      if (p >= 0.97) {
        doneRef.current = true
        pendingRef.current = window.scrollY + rect.top
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
    }
  }, [])

  // Unlock: collapse the track, freeze the strip at the end of its run, re-anchor scroll.
  useLayoutEffect(() => {
    if (!done) return
    if (applyRef.current) applyRef.current(1)
    if (pendingRef.current != null) { window.scrollTo(0, pendingRef.current); pendingRef.current = null }
  }, [done])

  return (
    <section className="gv-section gv-track" ref={trackRef} style={css(`position:relative;z-index:1;height:${done ? 100 : 300}vh`)}>
      <div className="gv-stage" style={css(`position:${done ? 'static' : 'sticky'};top:0;height:100vh;overflow:hidden`)}>
        <div className="gv-glow" />
        {PARTICLES.map((pt, i) => (
          <span key={i} className="gv-particle" style={css(`left:${pt.l};top:${pt.t};width:${pt.s}px;height:${pt.s}px;animation-delay:${pt.d}`)} />
        ))}

        <div className="gv-inner">
          {/* pinned copy */}
          <div className="gv-copy">
            <h2 className="gv-h2">Your Best Points,<br />Post-Ready in Seconds.</h2>
            <p className="gv-desc">AI finds your top moments and cuts them into share-ready reels — formatted for Facebook, Instagram Reels, Shorts, and X the instant the match ends.</p>
            <div className="gv-tags">
              {['AI Highlight Detection', 'Auto Montages', 'Social Ready', 'One-Tap Export'].map((t) => (
                <span key={t} className="gv-tag">{t}</span>
              ))}
            </div>
          </div>

          {/* sliding filmstrip of clip cards */}
          <div className="gv-cards-viewport" ref={vpRef}>
            <div className="gv-strip" ref={stripRef}>
              {CLIPS.map((c, i) => (
                <div className="gv-card" key={c.platform} ref={(el) => { cardRefs.current[i] = el }}>
                  <div className="gv-card-media">
                    <video
                      className="gv-video"
                      src={c.src}
                      poster={c.poster}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={`${c.platform} highlight reel`}
                    />
                    <span className="gv-chip"><Glyph g={c.glyph} />{c.platform}</span>
                    <span className="gv-dur">{c.dur}</span>
                    <div className="gv-play"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M7 4l13 8-13 8V4z" fill="#fff" /></svg></div>
                    <span className="gv-ratio">{c.ratio}</span>
                    <div className="gv-meta">
                      <div className="gv-wave">
                        {WAVE.map((h, j) => <span key={j} style={css(`height:${h}px;animation-delay:${(j * 0.07).toFixed(2)}s`)} />)}
                      </div>
                      <span className="gv-music">Music Added</span>
                    </div>
                  </div>
                  <div className="gv-card-foot">
                    <span className="gv-res">{c.res}</span>
                    <span className="gv-dl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" stroke="#bcd4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{c.fmt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
