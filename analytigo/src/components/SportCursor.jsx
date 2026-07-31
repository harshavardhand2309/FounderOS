import { useEffect, useRef, useState } from 'react'
import { readChoice, onChoice } from '../lib/reviewChoice.js'
import '../styles/sportcursor.css'

// The pointer, in five directions, switchable at runtime while we decide.
//
// Five rules hold across all of them, in rough order of how badly getting one
// wrong would hurt:
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
// What differs is the shape, and where the hotspot sits. Solid shapes are
// offset so the pointer tip is at their top-left corner, the way a real arrow
// works — centred, they cover the very thing you are aiming at. Outline shapes
// are centred, because you can see straight through them.

export const CURSORS = [
  { id: 'ball',    name: 'Tennis Ball',  note: 'Rolls as it travels — rotation follows distance, so the seams turn and stop when you do.' },
  { id: 'reticle', name: 'Hawk-Eye',     note: 'A broadcast tracking reticle. Corner brackets snap inward on anything clickable.' },
  { id: 'shuttle', name: 'Shuttlecock',  note: 'Leans into the direction of travel, cork first, like it is being struck.' },
  { id: 'trace',   name: 'Shot Trace',   note: 'A 14px ball with a fading six-node trail — the shot-tracking read, as a pointer.' },
  { id: 'chalk',   name: 'Chalk Mark',   note: 'A line-judge dot. Minimal, precise, puffs chalk on click like a ball catching the line.' },
]

// size in px, and whether the hotspot is the shape's centre or its top-left
const SPEC = {
  ball:    { size: 19, centred: false, roll: true },
  reticle: { size: 27, centred: true },
  shuttle: { size: 22, centred: false, tilt: true },
  trace:   { size: 14, centred: false, roll: true, trail: 6 },
  chalk:   { size: 13, centred: true, puff: true },
}

const TEXTY = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,[contenteditable="true"]'
const CLICKY = 'a,button,[role="button"],select,label,summary,input[type=checkbox],input[type=radio],input[type=submit],input[type=button]'

export default function SportCursor() {
  // Shot Trace is the chosen pointer. The other four stay reachable via
  // ?cursor= until the About direction is settled and the harness comes out.
  const [variant, setVariant] = useState(() => readChoice('cursor', 'trace'))
  const ref = useRef(null)
  const trailRef = useRef([])

  useEffect(() => onChoice('cursor', setVariant), [])

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const el = ref.current
    const root = document.documentElement
    if (!el) return
    const spec = SPEC[variant] || SPEC.ball
    const off = spec.centred ? '-50%, -50%' : '-16%, -16%'

    let x = 0, y = 0, rot = 0, lean = 0, seen = false, raf = 0, owned = false
    const hist = []

    const draw = () => {
      raf = 0
      // rotate() is innermost so the shape spins about its own centre rather
      // than orbiting the pointer
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(${off}) rotate(${(spec.roll ? rot : lean).toFixed(1)}deg)`
      if (spec.trail) {
        trailRef.current.forEach((node, i) => {
          const p = hist[hist.length - 1 - i * 2]
          if (!node || !p) return
          node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`
          node.style.opacity = String(0.34 * (1 - i / spec.trail))
        })
      }
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(draw) }

    const onMove = (e) => {
      const dx = e.clientX - x
      const dy = e.clientY - y
      x = e.clientX
      y = e.clientY
      if (spec.roll) rot += dx * 1.9
      // a lean, not a spin — full rotation whips around on tiny movements
      if (spec.tilt) lean += (Math.max(-24, Math.min(24, dx * 2.4)) - lean) * 0.28
      if (spec.trail) { hist.push({ x, y }); if (hist.length > spec.trail * 2 + 2) hist.shift() }

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

    const onDown = () => {
      el.classList.add('is-hit')
      if (spec.puff) { el.classList.remove('is-puff'); void el.offsetWidth; el.classList.add('is-puff') }
    }
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
  }, [variant])

  const spec = SPEC[variant] || SPEC.ball
  return (
    <>
      {spec.trail ? Array.from({ length: spec.trail }, (_, i) => (
        <i key={i} className="sc-trail" aria-hidden="true" ref={(n) => { trailRef.current[i] = n }} />
      )) : null}
      <div className="sc-cursor" data-sc={variant} ref={ref} aria-hidden="true">
        <Shape variant={variant} size={spec.size} />
      </div>
    </>
  )
}

function Shape({ variant, size }) {
  if (variant === 'reticle') {
    // Outline, so it never hides the target — and the corner brackets give the
    // hover state something to actually do rather than just growing.
    return (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="20" r="12.5" fill="none" stroke="#d6f637" strokeWidth="1.6" opacity=".9" />
        <circle cx="20" cy="20" r="2" fill="#d6f637" />
        <g className="sc-bracket" stroke="#d6f637" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M3 11V3h8" /><path d="M29 3h8v8" /><path d="M37 29v8h-8" /><path d="M11 37H3v-8" />
        </g>
      </svg>
    )
  }
  if (variant === 'shuttle') {
    return (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        {/* feather skirt, flaring away from the cork */}
        <path d="M14 14 38 38 26 39 13 27z" fill="rgba(255,255,255,.93)" stroke="rgba(0,0,0,.25)" strokeWidth="1" strokeLinejoin="round" />
        <path d="M17 17 33 33M20.5 14.5 36 30M13.5 20.5 29 36" stroke="rgba(120,130,140,.5)" strokeWidth="1" />
        {/* cork tip — this is the end that leads, and where the pointer is */}
        <circle cx="10" cy="10" r="8" fill="#d6f637" stroke="rgba(0,0,0,.3)" strokeWidth="1.2" />
        <circle cx="7.6" cy="7.6" r="2.6" fill="rgba(255,255,255,.5)" />
      </svg>
    )
  }
  if (variant === 'chalk') {
    return (
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="20" r="9" fill="#fbfff0" />
        <circle cx="20" cy="20" r="15" fill="none" stroke="#d6f637" strokeWidth="2.4" className="sc-ring" />
      </svg>
    )
  }
  // ball and trace share the felt
  return (
    <svg viewBox="0 0 40 40" width={size} height={size}>
      <defs>
        {/* light from the upper left, so it reads as a sphere rather than a disc */}
        <radialGradient id={`scFelt-${variant}`} cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f2ff86" />
          <stop offset="52%" stopColor="#d2ef3c" />
          <stop offset="100%" stopColor="#8fae1f" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#scFelt-${variant})`} />
      {/* the seams turning is what reads as a roll */}
      <path d="M6.2 5.2Q17.5 20 6.2 34.8" fill="none" stroke="#fdfff2" strokeWidth="2.6" strokeLinecap="round" opacity=".95" />
      <path d="M33.8 5.2Q22.5 20 33.8 34.8" fill="none" stroke="#fdfff2" strokeWidth="2.6" strokeLinecap="round" opacity=".95" />
      <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,.28)" strokeWidth="1.4" />
    </svg>
  )
}
