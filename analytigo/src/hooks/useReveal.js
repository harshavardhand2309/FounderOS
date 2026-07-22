import { useEffect } from 'react'

// Scroll-reveal for [data-reveal] blocks. Elements already in view render as-is;
// elements below the fold start hidden + offset and ease in when scrolled to.
// Ported from the design prototype's initReveals().
export function useReveal(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ro = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = '1'
            e.target.style.transform = 'none'
            ro.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    const vh = window.innerHeight || 800
    root.querySelectorAll('[data-reveal]:not([data-rev])').forEach((el) => {
      el.setAttribute('data-rev', '1')
      const r = el.getBoundingClientRect()
      if (r.top > vh * 0.82) {
        el.style.opacity = '0'
        el.style.transform = 'translateY(26px)'
        el.style.transition =
          'opacity .7s cubic-bezier(.16,.84,.44,1), transform .7s cubic-bezier(.16,.84,.44,1)'
        ro.observe(el)
      }
    })
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
