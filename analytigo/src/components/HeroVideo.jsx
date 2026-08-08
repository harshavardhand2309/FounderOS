import { useEffect, useRef, useState } from 'react'

// The hero backdrop: a sharp layer with a blurred layer behind it filling any
// gap, so the backdrop always reaches every edge with no black bars.
//
// The fit used to be a CSS media query — `contain` below 16/9, `cover` above —
// which was correct only while every source shared the 1.794 aspect of the
// original footage. A square source breaks it badly: `cover` on a 1920x937
// window scales 624 to 1920 and shows the middle 49% of the frame, which on
// these compositions is mid-torso to mid-thigh, head and feet gone.
//
// So the fit is decided from the video's own intrinsic size against the live
// viewport, not from a hardcoded breakpoint:
//
//   crop = 1 - videoAspect / viewportAspect      (when the window is wider)
//
// Under MAX_CROP we `cover`, and the backdrop genuinely fills the screen.
// Over it we fit to height and let the blurred layer carry the sides, which
// keeps the whole composition intact — still edge-to-edge, still no bars.
const MAX_CROP = 0.26

// Exported so the rule can be tested directly. The aspects come from the hero
// entry rather than from the element, so the first paint is already correct —
// waiting on `loadedmetadata` means a slow connection shows the wrong fit
// first, and a browser that cannot decode the file never fires it at all.
//
// The 16/9 breakpoint is the established behaviour and is kept exactly: at or
// above it the backdrop covers, below it it fits and the blurred layer takes
// the letterbox. Portrait phones depend on that — covering there would crop
// the player out of the shot sideways.
//
// The only addition is a cap. `cover` is refused when it would throw away more
// than MAX_CROP of the frame, which is what rescues a square source: on a
// 1920x937 window it would otherwise keep the middle 49% and lose both the
// head and the feet.
export function fitFor(videoAspect, viewportAspect) {
  if (!videoAspect || !viewportAspect) return 'cover'
  if (viewportAspect < 16 / 9) return 'contain'
  return 1 - videoAspect / viewportAspect <= MAX_CROP ? 'cover' : 'contain'
}

// Where to sit the sharp layer inside its box.
//
// Centred is right everywhere except one case: a source narrower than the
// window, fitted to height, leaves slack down both sides — and centred, the
// seam between sharp video and blurred fill lands straight through the end of
// the headline copy. Pushing it right puts the whole copy block on the blurred
// backdrop and turns the layout into a deliberate copy-left / subject-right
// split instead of a collision.
export function positionFor(fit, videoAspect, viewportAspect) {
  if (fit !== 'contain' || !videoAspect || !viewportAspect) return 'center'
  return viewportAspect > videoAspect ? '86% center' : 'center'
}

export default function HeroVideo({ hero, videoRef }) {
  const sharpRef = useRef(null)
  const initial = () => {
    const va = hero.w / hero.h
    const wa = typeof window === 'undefined' ? 16 / 9 : window.innerWidth / window.innerHeight
    const f = fitFor(va, wa)
    return { fit: f, pos: positionFor(f, va, wa) }
  }
  const [box, setBox] = useState(initial)

  useEffect(() => {
    const el = sharpRef.current

    const decide = () => {
      // prefer the element's real size once it is known, fall back to the
      // declared one so this is right from the very first frame
      const va = (el?.videoWidth || hero.w) / (el?.videoHeight || hero.h)
      const wa = window.innerWidth / window.innerHeight
      const f = fitFor(va, wa)
      setBox({ fit: f, pos: positionFor(f, va, wa) })
    }

    decide()
    el?.addEventListener('loadedmetadata', decide)
    window.addEventListener('resize', decide, { passive: true })
    return () => {
      el?.removeEventListener('loadedmetadata', decide)
      window.removeEventListener('resize', decide)
    }
  }, [hero])

  // Remounting on a source change matters: swapping <source> on a live element
  // does nothing until load() is called, and the old frame stays on screen.
  return (
    <div className="lh-bg" key={hero.id}>
      <video
        className="lh-bg-fill"
        autoPlay muted loop playsInline preload="auto"
        poster={hero.poster}
        aria-hidden="true"
      >
        <source src={hero.fill} type="video/mp4" />
      </video>
      <video
        ref={(node) => {
          sharpRef.current = node
          if (videoRef) videoRef.current = node
        }}
        className="lh-video"
        style={{ objectFit: box.fit, objectPosition: box.pos }}
        autoPlay muted loop playsInline preload="auto"
        poster={hero.poster}
        aria-hidden="true"
      >
        <source src={hero.src} type="video/mp4" />
      </video>
    </div>
  )
}
