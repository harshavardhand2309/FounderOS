import { useEffect } from 'react'
import { useLoadProgress } from './useLoadProgress.js'
import '../../styles/loader.css'

// Assets worth having decoded before the hero is revealed. Anything slower than
// `maxMs` in useLoadProgress is abandoned rather than allowed to hold the gate.
// The hero montage (home-intro.mp4) is deliberately NOT gated on — it is a muted
// background layer with a poster behind it, so making the visitor wait on a
// multi-megabyte video would double the loader's length for no visible gain.
// Logo.png is gated on because the loader itself renders it — without it the
// brand lockup would pop in partway through the load, or not at all on a slow
// connection. It is also the first thing the nav needs once the gate lifts.
export const HOME_ASSETS = ['/assets/home-intro-poster.jpg', '/assets/Logo.png']

// The template is passed in rather than looked up from a registry so a page that
// ships one loader doesn't pull the other three into its bundle.
export default function Loader({
  component: T,
  assets = HOME_ASSETS,
  simulate = false,
  simulateMs,
  exitMs,
  onExit,
  onDone,
}) {
  const { p, pct, phase } = useLoadProgress({ assets, simulate, simulateMs, exitMs, onExit, onDone })

  // hold the page still underneath while the loader owns the screen
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('ld-lock')
    document.body.classList.add('ld-lock')
    return () => {
      root.classList.remove('ld-lock')
      document.body.classList.remove('ld-lock')
    }
  }, [])

  if (phase === 'done' || !T) return null

  return (
    // One static announcement — piping a 0→100 counter into a live region makes
    // screen readers drop or queue updates unpredictably. The art is decorative.
    <div className="ld-host" data-p={p.toFixed(3)} data-phase={phase}>
      <span className="ld-sr" role="status" aria-live="polite">Loading</span>
      <div aria-hidden="true">
        <T p={p} pct={pct} phase={phase} />
      </div>
    </div>
  )
}
