import { useEffect, useRef } from 'react'

// Cursor image-trail for the hero (champions4good-style). As the pointer moves across
// the hero, images pop in near the cursor with a slight random rotation + scale-in,
// float briefly, then fade/slide away. Images cycle through the hover folder and are
// drawn from a fixed reused pool (no memory leaks). They sit behind the headline
// (z-index 1) so the "NEXT LEVEL" text is never covered. Stops on leave / scroll-out.

// dynamic folder load — Vite resolves every match at build time, hashed for prod
const modules = import.meta.glob('../assets/hover/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' })
const IMAGES = Object.keys(modules).sort().map((k) => modules[k])

const POOL = 16 // reused DOM nodes
const STEP = 68 // min pointer travel (px) between spawns
const HOLD = 520 // ms visible before it drifts away
const IN_T = 'opacity .32s ease-out, transform .5s cubic-bezier(.16,.84,.44,1), filter .32s ease-out'
const OUT_T = 'opacity .6s ease, transform .7s cubic-bezier(.16,.84,.44,1), filter .6s ease'

export default function HeroShowcase() {
  const rootRef = useRef(null)
  const poolRef = useRef([])
  const stateRef = useRef({ last: null, slot: 0, img: 0, activeOn: false, inView: true })

  useEffect(() => { IMAGES.forEach((src) => { const im = new Image(); im.src = src }) }, []) // preload

  useEffect(() => {
    const root = rootRef.current
    const host = root && root.parentElement // the hero <header>
    if (!root || !host || !IMAGES.length) return
    const st = stateRef.current

    const spawn = (clientX, clientY) => {
      const r = root.getBoundingClientRect()
      const x = clientX - r.left
      const y = clientY - r.top
      const el = poolRef.current[st.slot]
      st.slot = (st.slot + 1) % POOL
      if (!el) return
      const rot = (Math.sin(st.img * 12.9898) * 43758.5453 % 1) * 34 - 17 // deterministic-ish random ±17°
      el.src = IMAGES[st.img % IMAGES.length]
      st.img += 1
      if (el._t) clearTimeout(el._t)
      el.style.transition = 'none'
      el.style.left = x + 'px'
      el.style.top = y + 'px'
      el.style.opacity = '0'
      el.style.transform = `translate(-50%,-50%) scale(.5) rotate(${rot.toFixed(1)}deg)`
      el.style.filter = 'blur(6px)'
      void el.offsetWidth // reflow
      el.style.transition = IN_T
      el.style.opacity = '1'
      el.style.transform = `translate(-50%,-53%) scale(1) rotate(${rot.toFixed(1)}deg)`
      el.style.filter = 'blur(0px)'
      el._t = setTimeout(() => {
        el.style.transition = OUT_T
        el.style.opacity = '0'
        el.style.transform = `translate(-50%,-78%) scale(.82) rotate(${rot.toFixed(1)}deg)`
        el.style.filter = 'blur(5px)'
      }, HOLD)
    }

    const onMove = (e) => {
      if (!st.activeOn || !st.inView) return
      const p = st.last
      if (!p) { st.last = { x: e.clientX, y: e.clientY }; spawn(e.clientX, e.clientY); return }
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      if (dx * dx + dy * dy >= STEP * STEP) {
        st.last = { x: e.clientX, y: e.clientY }
        spawn(e.clientX, e.clientY)
      }
    }
    const fadeAll = () => {
      poolRef.current.forEach((el) => {
        if (!el) return
        if (el._t) { clearTimeout(el._t); el._t = null }
        el.style.transition = OUT_T
        el.style.opacity = '0'
        el.style.transform = el.style.transform.replace(/scale\([^)]*\)/, 'scale(.8)')
        el.style.filter = 'blur(5px)'
      })
      st.last = null
    }

    const onEnter = () => { st.activeOn = true }
    const onLeave = () => { st.activeOn = false; fadeAll() }
    host.addEventListener('pointerenter', onEnter)
    host.addEventListener('pointerleave', onLeave)
    host.addEventListener('pointermove', onMove)
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { st.inView = e.isIntersecting; if (!e.isIntersecting) fadeAll() }),
      { threshold: 0.12 },
    )
    io.observe(root)

    return () => {
      host.removeEventListener('pointerenter', onEnter)
      host.removeEventListener('pointerleave', onLeave)
      host.removeEventListener('pointermove', onMove)
      io.disconnect()
      poolRef.current.forEach((el) => { if (el && el._t) { clearTimeout(el._t); el._t = null } })
    }
  }, [])

  return (
    <div className="hs-root" ref={rootRef} aria-hidden="true">
      {Array.from({ length: POOL }).map((_, i) => (
        <img key={i} className="hs-trail" alt="" draggable={false}
          ref={(el) => { poolRef.current[i] = el }} />
      ))}
    </div>
  )
}
