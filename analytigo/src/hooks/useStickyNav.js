import { useEffect } from 'react'

// Sticky-nav scroll treatment: once the page is scrolled past 40px the nav gains
// a solid blurred background, a hairline bottom border, and tighter padding.
// Ported from the design prototype's _onScroll handler.
export function useStickyNav(navRef, deps = []) {
  useEffect(() => {
    const onScroll = () => {
      const n = navRef.current
      if (!n) return
      const s = (window.scrollY || 0) > 40
      n.style.background = s
        ? 'rgba(10,11,13,.92)'
        : 'linear-gradient(180deg,rgba(8,9,11,.55) 0%,rgba(8,9,11,.32) 38%,rgba(8,9,11,.1) 70%,transparent 100%)'
      n.style.backdropFilter = s ? 'blur(16px)' : 'none'
      n.style.webkitBackdropFilter = s ? 'blur(16px)' : 'none'
      n.style.borderBottom = s ? '1px solid rgba(255,255,255,.09)' : 'none'
      n.style.paddingTop = s ? '12px' : '20px'
      n.style.paddingBottom = s ? '12px' : '20px'
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
