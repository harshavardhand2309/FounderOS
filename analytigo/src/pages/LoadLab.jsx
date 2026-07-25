import { useEffect, useState } from 'react'
import Home from './Home.jsx'
import Loader from '../components/loader/Loader.jsx'
import T1LevelUp from '../components/loader/T1LevelUp.jsx'
import T2CourtDraw from '../components/loader/T2CourtDraw.jsx'
import T3MotionTrace from '../components/loader/T3MotionTrace.jsx'
import T4KineticType from '../components/loader/T4KineticType.jsx'

// Preview harness for the loading screens. Renders the real home page underneath
// so the exit transition is judged against the actual hero, with a control bar to
// switch templates and replay. Reachable at /loadlab?ld=t1..t4.

const TEMPLATES = [
  { id: 't1', name: 'Level Up Meter', Component: T1LevelUp },
  { id: 't2', name: 'Court Line Draw', Component: T2CourtDraw },
  { id: 't3', name: 'Motion Trace', Component: T3MotionTrace },
  { id: 't4', name: 'Kinetic Curtain', Component: T4KineticType },
]

export default function LoadLab() {
  const q = (key) => {
    try {
      return new URLSearchParams(window.location.search).get(key)
    } catch {
      return null
    }
  }
  const initial = TEMPLATES.some((t) => t.id === q('ld')) ? q('ld') : 't2'
  // ?slow=N stretches the scripted ramp — used for frame-accurate capture
  const slow = Number(q('slow')) || 1

  const [template, setTemplate] = useState(initial)
  const [run, setRun] = useState(1)
  const [playing, setPlaying] = useState(true)

  const replay = (id) => {
    if (id) setTemplate(id)
    setPlaying(true)
    setRun((n) => n + 1)
  }

  // keyboard: 1-4 switch template, R replays
  useEffect(() => {
    const onKey = (e) => {
      const i = ['1', '2', '3', '4'].indexOf(e.key)
      if (i >= 0) replay(TEMPLATES[i].id)
      if (e.key.toLowerCase() === 'r') replay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const active = TEMPLATES.find((t) => t.id === template) || TEMPLATES[1]
  // ?p=0.48 freezes the template at one progress value for frame-exact capture
  const frozen = q('p') != null ? Number(q('p')) : null

  if (frozen != null) {
    const F = active.Component
    return (
      <>
        <Home skipLoader />
        <div className="ld-host" data-p={frozen} data-phase="load">
          <div aria-hidden="true">
            <F p={frozen} pct={Math.round(frozen * 100)} phase="load" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Home skipLoader />
      {playing && (
        <Loader
          key={`${template}-${run}`}
          component={active.Component}
          simulate
          simulateMs={2700 * slow}
          exitMs={1100 * slow}
          onDone={() => setPlaying(false)}
        />
      )}
      <div className="lab-bar">
        <span className="lab-title">LOADER LAB</span>
        {TEMPLATES.map((t, i) => (
          <button
            key={t.id}
            className={t.id === template ? 'lab-btn on' : 'lab-btn'}
            onClick={() => replay(t.id)}
          >
            <b>{i + 1}</b> {t.name}
          </button>
        ))}
        <button className="lab-btn lab-replay" onClick={() => replay()}>↻ Replay</button>
      </div>
    </>
  )
}
