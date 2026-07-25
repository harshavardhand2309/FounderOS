import { useEffect, useState } from 'react'
import Home from './Home.jsx'
import Loader, { TEMPLATES } from '../components/loader/Loader.jsx'

// Preview harness for the four loading screens. Renders the real home page
// underneath so the exit transition is judged against the actual hero, with a
// control bar to switch templates and replay. Reachable at /loadlab?ld=t1..t4.

export default function LoadLab() {
  const initial = (() => {
    try {
      const q = new URLSearchParams(window.location.search).get('ld')
      return TEMPLATES.some((t) => t.id === q) ? q : 't1'
    } catch {
      return 't1'
    }
  })()
  // ?slow=N stretches the scripted ramp — used for frame-accurate capture
  const slow = (() => {
    try {
      return Number(new URLSearchParams(window.location.search).get('slow')) || 1
    } catch {
      return 1
    }
  })()
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

  return (
    <>
      <Home />
      {playing && (
        <Loader
          key={`${template}-${run}`}
          template={template}
          simulate
          simulateMs={2700 * slow}
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
            title={t.blurb}
          >
            <b>{i + 1}</b> {t.name}
          </button>
        ))}
        <button className="lab-btn lab-replay" onClick={() => replay()}>↻ Replay</button>
      </div>
    </>
  )
}
