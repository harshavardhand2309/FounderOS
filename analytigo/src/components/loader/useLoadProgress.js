import { useEffect, useRef, useState } from 'react'

// Loading-progress engine shared by every loader template.
//
// Real progress (asset decode + document readiness) drives a *target*; the number
// the user sees eases toward it and is additionally floored by elapsed time, so the
// counter never stalls at 87% waiting on one slow file. Guaranteed to finish:
// `maxMs` force-completes no matter what the network is doing.
//
// Phases: 'load' → 'full' (a held beat at 100%) → 'exit' (template's reveal) → 'done'.

const clamp01 = (x) => Math.max(0, Math.min(1, x))

export const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const preloadOne = (src) =>
  new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    // never let one asset hold the whole gate open
    const bail = setTimeout(done, 4500)
    const finish = () => {
      clearTimeout(bail)
      done()
    }
    if (/\.(mp4|webm|mov)$/i.test(src)) {
      const v = document.createElement('video')
      v.preload = 'auto'
      v.muted = true
      v.addEventListener('loadeddata', finish, { once: true })
      v.addEventListener('error', finish, { once: true })
      v.src = src
    } else {
      const img = new Image()
      img.onload = finish
      img.onerror = finish
      img.src = src
    }
  })

export function useLoadProgress({
  assets = [],
  minMs = 2300, // the four-court morph needs this long to read
  maxMs = 4200, // never trap — hard ceiling regardless of network
  holdMs = 360, // pause on 100% before the reveal starts
  exitMs = 1150, // must outlast the template's exit transition (1.05s)
  simulate = false, // preview mode: ignore the network, run a scripted ramp
  simulateMs: simulateMsIn,
  onExit, // fires as the reveal starts, so the page beneath can lead in
  onDone, // fires once the loader is finished and unmounting
} = {}) {
  const [p, setP] = useState(0)
  const [phase, setPhase] = useState('load')
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit

  const simulateMs = simulateMsIn || 2700

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const t0 = performance.now()
    const targetRef = { current: simulate ? 0 : 0.08 }
    let raf = 0
    let shown = 0
    const timers = []
    const after = (ms, fn) => timers.push(setTimeout(fn, ms))

    // --- real progress: assets + document readiness -------------------------
    if (!simulate) {
      // Signals that mean "the first screen can be painted correctly" — NOT the
      // window 'load' event, which waits on every subresource including the hero
      // video and would peg the loader to its hard cap on every single visit.
      const total = assets.length + 2 // + DOM parsed + webfonts
      let hit = 0
      const bump = () => {
        hit += 1
        targetRef.current = Math.max(targetRef.current, 0.08 + 0.92 * (hit / total))
      }
      assets.forEach((src) => preloadOne(src).then(bump))
      if (document.readyState !== 'loading') bump()
      else document.addEventListener('DOMContentLoaded', bump, { once: true })
      try {
        if (document.fonts?.ready) document.fonts.ready.then(bump).catch(bump)
        else bump()
      } catch {
        bump() // fonts API is optional — never let it hold the gate
      }
    }

    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      setP(1)
      setPhase('full')
      after(reduced ? 120 : holdMs, () => {
        setPhase('exit')
        onExitRef.current?.()
        after(reduced ? 220 : exitMs, () => {
          setPhase('done')
          onDoneRef.current?.()
        })
      })
    }

    // a loader must never be able to wedge: Escape or a click skips it
    const skip = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return
      finish()
    }
    // (not in preview mode — the lab exists to watch the whole animation)
    if (!simulate) {
      window.addEventListener('keydown', skip)
      window.addEventListener('pointerdown', skip)
    }

    let lastNow = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const dt = Math.min(200, now - lastNow) // clamp so a long stall can't jump the bar
      lastNow = now
      const el = now - t0
      // slow-to-fast ramp: a decelerating bar is perceived as the slowest of all
      // pacing curves, so the fill accelerates into completion instead
      if (simulate) targetRef.current = clamp01(Math.pow(el / simulateMs, 1.45))

      // ease toward the target, but keep a slow time-based floor so the number
      // always advances even while a big asset is still in flight. In preview
      // mode the ramp is already time-driven, so neither floor nor cap applies.
      // Frame-rate independent smoothing. A fixed per-frame factor would crawl
      // whenever the page's own first render starves rAF — exactly when the
      // loader is on screen — so the rate is derived from elapsed time instead.
      const k = 1 - Math.pow(1 - 0.12, dt / 16.67)
      shown += (targetRef.current - shown) * k
      if (!simulate) {
        // Bound the displayed value by a real schedule: it can never finish
        // sooner than minMs (assets on a warm cache resolve in ~100ms, and
        // without this the morph would blast past and then sit at 100%), and
        // never stall below the maxMs floor while a slow asset is in flight.
        shown = Math.min(shown, el / minMs)
        shown = Math.max(shown, Math.min(el / maxMs, 0.985))
      }
      shown = clamp01(shown)
      setP(shown)

      const cap = simulate ? simulateMs * 1.5 : maxMs
      const ready = targetRef.current >= 0.999 && shown > 0.985 && el >= minMs
      if (ready || el >= cap) {
        cancelAnimationFrame(raf)
        raf = 0
        finish()
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { p, pct: Math.round(p * 100), phase }
}

// Windowed sub-progress: 0 before `a`, 1 after `b`, eased in between. Lets a
// template stagger many elements off one master progress value.
export const win = (p, a, b) => {
  const t = clamp01((p - a) / (b - a))
  return t * t * (3 - 2 * t) // smoothstep
}
