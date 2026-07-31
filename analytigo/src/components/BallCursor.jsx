import { useEffect, useRef } from 'react'
import '../styles/ballcursor.css'

// A tennis ball for a pointer.
//
// The detail that sells it is the roll: the ball rotates in proportion to how
// far it has travelled, the way a real one would, so the seams turn as you move
// and stop when you stop. Everything else is restraint — it squashes on click
// and swells over anything clickable, and that is the whole vocabulary. A trail
// or particle burst would fight the video backdrops this sits on top of.
//
// Rules it follows, in rough order of how badly getting them wrong would hurt:
//
//   1. `cursor: none` is applied by THIS component, from JS, only after a real
//      pointer has moved. Put it in a stylesheet and any failure to mount leaves
//      a site with no pointer at all.
//   2. Text fields get the native I-beam back. A ball hovering over an email
//      field hides the caret and makes the form feel broken.
//   3. Fine pointers only. A touch screen has no cursor to replace, and
//      hover-driven states there are a trap.
//   4. Reduced motion turns it off entirely rather than showing a still ball —
//      a cursor that is itself an animation is the thing being opted out of.
//   5. It tracks 1:1, with no easing. Lag looks luxurious on a decorative ring
//      and awful on the thing you are trying to aim with.

const BALL = 26          // px across — big enough to read, small enough to aim
const DEG_PER_PX = 1.9   // roll rate; a true roll (~4.4°/px at this size) spins too fast to read
const TEXTY = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,[contenteditable="true"]'
const CLICKY = 'a,button,[role="button"],select,label,summary,input[type=checkbox],input[type=radio],input[type=submit],input[type=button]'

export default function BallCursor() {
  const ref = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || still.matches) return

    const el = ref.current
    const root = document.documentElement
    if (!el) return

    let x = 0, y = 0, rot = 0, seen = false, raf = 0, dirty = false

    const draw = () => {
      raf = 0
      // The hotspot sits just inside the ball's top-left rather than at its
      // centre, the way a real pointer's tip does — a centred ball covers the
      // very thing you are aiming at, which is painful on buttons and links.
      // rotate() is innermost so the ball still spins about its own centre
      // instead of orbiting the pointer.
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-16%, -16%) rotate(${rot}deg)`
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw) }

    const onMove = (e) => {
      const dx = e.clientX - x
      x = e.clientX
      y = e.clientY
      rot += dx * DEG_PER_PX

      if (!seen) {                       // first real movement — take over the pointer
        seen = true
        el.classList.add('is-on')
        dirty = true
      }

      // Over a text field, hand the caret back. Everything else keeps the ball.
      const t = e.target
      const texty = t instanceof Element && t.closest(TEXTY)
      if (texty) {
        if (dirty) { root.classList.remove('bc-hide'); el.classList.remove('is-on'); dirty = false }
      } else {
        if (!dirty) { el.classList.add('is-on'); dirty = true }
        root.classList.add('bc-hide')
        el.classList.toggle('is-live', !!(t instanceof Element && t.closest(CLICKY)))
      }
      schedule()
    }

    const onDown = () => el.classList.add('is-hit')
    const onUp = () => el.classList.remove('is-hit')
    // Leaving the window or tabbing away must not strand a frozen ball on screen.
    const onOut = (e) => { if (!e.relatedTarget && !e.toElement) { el.classList.remove('is-on'); root.classList.remove('bc-hide'); dirty = false } }
    const onBlur = () => { el.classList.remove('is-on'); root.classList.remove('bc-hide'); dirty = false }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown, { passive: true })
    window.addEventListener('mouseup', onUp, { passive: true })
    document.addEventListener('mouseout', onOut)
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseout', onOut)
      window.removeEventListener('blur', onBlur)
      if (raf) cancelAnimationFrame(raf)
      root.classList.remove('bc-hide')
    }
  }, [])

  return (
    <div className="bc-ball" ref={ref} aria-hidden="true">
      <svg viewBox="0 0 40 40" width={BALL} height={BALL}>
        <defs>
          {/* light from the upper left, so the ball reads as a sphere rather than a disc */}
          <radialGradient id="bcFelt" cx="34%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#f2ff86" />
            <stop offset="52%" stopColor="#d2ef3c" />
            <stop offset="100%" stopColor="#8fae1f" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="19" fill="url(#bcFelt)" />
        {/* the two seams — these turning is what reads as a roll */}
        <path d="M6.2 5.2Q17.5 20 6.2 34.8" fill="none" stroke="#fdfff2" strokeWidth="2.6" strokeLinecap="round" opacity=".95" />
        <path d="M33.8 5.2Q22.5 20 33.8 34.8" fill="none" stroke="#fdfff2" strokeWidth="2.6" strokeLinecap="round" opacity=".95" />
        <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,.28)" strokeWidth="1.4" />
      </svg>
    </div>
  )
}
