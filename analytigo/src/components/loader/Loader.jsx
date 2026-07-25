import { useEffect } from 'react'
import { useLoadProgress } from './useLoadProgress.js'
import T1LevelUp from './T1LevelUp.jsx'
import T2CourtDraw from './T2CourtDraw.jsx'
import T3MotionTrace from './T3MotionTrace.jsx'
import T4KineticType from './T4KineticType.jsx'
import '../../styles/loader.css'

export const TEMPLATES = [
  { id: 't1', name: 'Level Up Meter', blurb: 'Wordmark fills with lime as the XP bar climbs, LEVEL UP stamp, curtain lifts.', Component: T1LevelUp },
  { id: 't2', name: 'Court Line Draw', blurb: 'A regulation court draws itself in white, ball rallies across, screen splits at the net.', Component: T2CourtDraw },
  { id: 't3', name: 'Motion Trace', blurb: 'Pose skeleton assembles, swing arc traces, system checks tick to OK, lime scan wipe.', Component: T3MotionTrace },
  { id: 't4', name: 'Kinetic Curtain', blurb: 'Oversized type marquees, giant lime counter, five panels part to reveal the page.', Component: T4KineticType },
]

// Assets worth having decoded before the hero is revealed. Anything slower than
// `maxMs` in useLoadProgress is abandoned rather than allowed to hold the gate.
export const HOME_ASSETS = [
  '/assets/home-intro-poster.jpg',
  '/assets/home-intro.mp4',
  '/assets/pickgame-bg4.jpg',
]

export default function Loader({
  template = 't1',
  assets = HOME_ASSETS,
  simulate = false,
  simulateMs,
  onDone,
}) {
  const { p, pct, phase } = useLoadProgress({ assets, simulate, simulateMs, onDone })
  const entry = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0]
  const T = entry.Component

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

  if (phase === 'done') return null

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
