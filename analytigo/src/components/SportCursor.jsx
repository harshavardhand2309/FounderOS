import { useEffect, useRef } from 'react'
import '../styles/sportcursor.css'

// Shot Trace — a 14px ball with a fading six-node trail behind it, the
// shot-tracking read the product itself draws, as a pointer.
//
// Five rules hold, in rough order of how badly getting one wrong would hurt:
//
//   1. `cursor: none` is applied from JS, only after a real pointer has moved.
//      In a stylesheet, any failure to mount leaves a site with no pointer.
//   2. Text fields get the native caret back. Anything parked over an email
//      field hides the caret and makes the form feel broken.
//   3. Fine pointers only — a touch screen has no cursor to replace.
//   4. Reduced motion turns it off entirely. A pointer that is itself an
//      animation is the thing being opted out of.
//   5. 1:1 tracking, no easing. Lag reads as luxury on a decorative ring and as
//      breakage on the thing you are aiming with.
//
// The ball is offset so the pointer tip sits at its top-left corner, the way a
// real arrow works — centred, it would cover the very thing you are aiming at.

const SIZE = 14
const TRAIL = 6      // nodes behind the ball
const OFFSET = '-16%, -16%'

const TEXTY = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,[contenteditable="true"]'
const CLICKY = 'a,button,[role="button"],select,label,summary,input[type=checkbox],input[type=radio],input[type=submit],input[type=button]'

export default function SportCursor() {
  const ref = useRef(null)
  const trailRef = useRef([])

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const el = ref.current
    const root = document.documentElement
    if (!el) return

    let x = 0, y = 0, rot = 0, seen = false, raf = 0, owned = false
    const hist = []

    const draw = () => {
      raf = 0
      // rotate() is innermost so the shape spins about its own centre rather
      // than orbiting the pointer
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(${OFFSET}) rotate(${rot.toFixed(1)}deg)`
      trailRef.current.forEach((node, i) => {
        const p = hist[hist.length - 1 - i * 2]
        if (!node || !p) return
        node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`
        node.style.opacity = String(0.34 * (1 - i / TRAIL))
      })
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw) }

    const onMove = (e) => {
      const dx = e.clientX - x
      x = e.clientX
      y = e.clientY
      rot += dx * 1.9
      hist.push({ x, y })
      if (hist.length > TRAIL * 2 + 2) hist.shift()

      if (!seen) { seen = true; el.classList.add('is-on'); owned = true }

      const t = e.target
      if (t instanceof Element && t.closest(TEXTY)) {
        if (owned) { root.classList.remove('sc-hide'); el.classList.remove('is-on'); owned = false }
      } else {
        if (!owned) { el.classList.add('is-on'); owned = true }
        root.classList.add('sc-hide')
        el.classList.toggle('is-live', !!(t instanceof Element && t.closest(CLICKY)))
      }
      schedule()
    }

    const onDown = () => el.classList.add('is-hit')
    const onUp = () => el.classList.remove('is-hit')
    const leave = () => { el.classList.remove('is-on'); root.classList.remove('sc-hide'); owned = false }
    // leaving the window or tabbing away must not strand a frozen shape on screen
    const onOut = (e) => { if (!e.relatedTarget) leave() }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown, { passive: true })
    window.addEventListener('mouseup', onUp, { passive: true })
    document.addEventListener('mouseout', onOut)
    window.addEventListener('blur', leave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseout', onOut)
      window.removeEventListener('blur', leave)
      if (raf) cancelAnimationFrame(raf)
      root.classList.remove('sc-hide')
      el.classList.remove('is-on')
    }
  }, [])

  return (
    <>
      {Array.from({ length: TRAIL }, (_, i) => (
        <i key={i} className="sc-trail" aria-hidden="true" ref={(n) => { trailRef.current[i] = n }} />
      ))}
      <div className="sc-cursor" ref={ref} aria-hidden="true">
        <Ball />
      </div>
    </>
  )
}

function Ball() {
  return (
    <svg viewBox="0 0 40 40" width={SIZE} height={SIZE}>
      <defs>
        {/* light from the upper left, so it reads as a sphere rather than a disc */}
        <radialGradient id="scFelt" cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f2ff86" />
          <stop offset="52%" stopColor="#d2ef3c" />
          <stop offset="100%" stopColor="#8fae1f" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#scFelt)" />
      {/* the seams turning is what reads as a roll */}
      <path d="M6.2 5.2Q17.5 20 6.2 34.8" fill="none" stroke="#fdfff2" strokeWidth="2.6" strokeLinecap="round" opacity=".95" />
      <path d="M33.8 5.2Q22.5 20 33.8 34.8" fill="none" stroke="#fdfff2" strokeWidth="2.6" strokeLinecap="round" opacity=".95" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,.28)" strokeWidth="1.4" />
    </svg>
  )
}
