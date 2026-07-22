import { useEffect } from 'react'

// Animated number counters. Scans the container for [data-count] elements and
// tweens them from 0 to their target once they scroll into view. Ported from the
// design prototype's initCounters()/tween(). Re-runs when `deps` change (e.g. on
// screen switch) and only binds elements it hasn't bound before.
function tween(el) {
  const target = parseFloat(el.getAttribute('data-count'))
  if (isNaN(target)) return
  const dec = parseInt(el.getAttribute('data-decimals') || '0', 10)
  const suf = el.getAttribute('data-suffix') || ''
  const pre = el.getAttribute('data-prefix') || ''
  const dur = 1400
  const start = performance.now()
  const fmt = (v) =>
    pre + (dec > 0 ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suf
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur)
    const e = 1 - Math.pow(1 - t, 3)
    el.textContent = fmt(target * e)
    if (t < 1) requestAnimationFrame(step)
    else el.textContent = fmt(target)
  }
  requestAnimationFrame(step)
}

export function useCountUp(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            tween(e.target)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.35 },
    )
    root.querySelectorAll('[data-count]:not([data-bound])').forEach((el) => {
      el.setAttribute('data-bound', '1')
      io.observe(el)
    })
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
