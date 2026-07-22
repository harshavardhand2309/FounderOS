import { useEffect, useRef, useState } from 'react'

// AI Recommendations — a tab-based reveal. Each tab swaps a full, self-contained
// background image (all copy/stats live inside the image). All four images are kept
// mounted and crossfaded (opacity + subtle zoom) so switching is instant and flicker-
// free. Entrance is an editorial reveal (IntersectionObserver-driven, plays once):
// background settles, eyebrow → word-by-word heading → description → staggered tabs →
// stage. Switching a tab sweeps a thin accent line and crossfades the visuals.

const TABS = [
  { num: '01', label: 'Precision Equipment Selection', src: '/assets/rec-1.png' },
  { num: '02', label: 'Targeted Practice Routines', src: '/assets/rec-2.png' },
  { num: '03', label: 'Fatigue-Aligned Recovery', src: '/assets/rec-3.png' },
  { num: '04', label: 'Simulated Performance Modeling', src: '/assets/rec-4.png' },
]
const HEADING_WORDS = ['AI', 'Recommendations']

export default function Recommendations() {
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && e.intersectionRatio >= 0.18) { setShown(true); io.disconnect() } },
      { threshold: [0, 0.18] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className={shown ? 'rec-section rec-on' : 'rec-section'} id="recommendations" ref={ref}>
      <div className="rec-bg" aria-hidden="true" />
      <div className="rec-head">
        <div className="rec-eyebrow" style={{ animationDelay: '.05s' }}><span className="rec-eyedot" />AI ENGINE</div>
        <h2 className="rec-h2" aria-label="AI Recommendations">
          {HEADING_WORDS.map((w, i) => (
            <span className="rec-word" key={w}>
              <span style={{ animationDelay: (0.18 + i * 0.1).toFixed(2) + 's' }}>{w}</span>
            </span>
          ))}
        </h2>
        <p className="rec-desc" style={{ animationDelay: '.44s' }}>
          Precision guidance drawn from your performance data — equipment, training, recovery, and match modeling, tuned to the way you actually play.
        </p>
      </div>

      <div className="rec-tabs" role="tablist">
        {TABS.map((t, i) => (
          <button
            key={t.num}
            role="tab"
            aria-selected={i === active}
            className={i === active ? 'rec-tab active' : 'rec-tab'}
            style={{ animationDelay: (0.52 + i * 0.09).toFixed(2) + 's' }}
            onClick={() => setActive(i)}
          >
            <span className="rec-tab-num">{t.num}</span>
            <span className="rec-tab-label">{t.label}</span>
            <span className="rec-tab-underline" />
          </button>
        ))}
      </div>

      <div className="rec-stage" style={{ animationDelay: '.62s' }}>
        <span className="rec-sweep" key={active} aria-hidden="true" />
        {TABS.map((t, i) => (
          <img
            key={t.num}
            src={t.src}
            alt={`${t.num} — ${t.label}`}
            draggable={false}
            className={i === active ? 'rec-img on' : 'rec-img'}
            aria-hidden={i !== active}
          />
        ))}
      </div>
    </section>
  )
}
