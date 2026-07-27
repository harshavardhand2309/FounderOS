import { Link } from 'react-router-dom'
import PageShell from '../components/PageShell.jsx'

const BUCKETS = [
  { k: 'Shot quality', d: 'Placement, depth, pace and error type — what you actually hit, not what you remember hitting.' },
  { k: 'Court positioning', d: 'Where you recover to, how much ground you cover, and the space you leave open.' },
  { k: 'Rally patterns', d: 'How points are built and lost: length, the shot before the error, and which patterns win you the most.' },
  { k: 'Movement & load', d: 'Joint angles, asymmetry and workload across a session — indicators, not diagnoses.' },
]
const AUDIENCE = [
  { k: 'Players', d: 'See the one pattern costing you the most points this month, and whether last month\'s fix held.' },
  { k: 'Coaches', d: 'Bring evidence to a session instead of an impression, and track a whole squad in one view.' },
  { k: 'Clubs & academies', d: 'Benchmark members, spot the juniors worth developing, and show parents progress they can see.' },
]

export default function Analytics() {
  return (
    <PageShell title="Analytics">
      <div className="pg-head">
        <div className="pg-head-in">
          <span className="pg-eyebrow">Analytics</span>
          <h1 className="pg-h1">The match, in numbers you can act on.</h1>
          <p className="pg-lede">
            Footage on its own is a memory. Analytics turn it into the two or three things
            worth changing before your next match.
          </p>
        </div>
      </div>

      <div className="pg-wrap">
        <section className="pg-sec" aria-labelledby="what-h">
          <h2 className="pg-sec-h2" id="what-h">What we measure</h2>
          <p className="pg-sec-lede">
            Four groups, tuned per sport. We would rather report a handful of numbers you will
            use than forty you will scroll past.
          </p>
          <div className="pg-grid">
            {BUCKETS.map((b) => (
              <div className="pg-card" key={b.k}>
                <span className="pg-card-eyebrow">Metric group</span>
                <h3>{b.k}</h3>
                <p>{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="deep-h">
          <h2 className="pg-sec-h2" id="deep-h">One metric, explained properly</h2>
          <p className="pg-sec-lede">Take rally construction — the clearest example of what the analysis actually does.</p>
          <div className="pg-steps">
            <div className="pg-step"><b /><h3>Segment</h3><p>Every point is split into shots, with the contact moment detected from the footage.</p></div>
            <div className="pg-step"><b /><h3>Classify</h3><p>Each shot is labelled by type, court zone and outcome.</p></div>
            <div className="pg-step"><b /><h3>Attribute</h3><p>Errors are traced back to the shot that created the pressure, not just the one that missed.</p></div>
            <div className="pg-step"><b /><h3>Rank</h3><p>Patterns are ordered by points cost, so the top of the list is where to start.</p></div>
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="venue-h">
          <h2 className="pg-sec-h2" id="venue-h">Venue intelligence</h2>
          <p className="pg-sec-lede">
            The same player is a different player on a different surface, in different conditions,
            at 5–5 in the third. We report all three.
          </p>
          <div className="pg-grid">
            <div className="pg-card"><span className="pg-card-eyebrow">Surface</span><h3>Where you play best</h3><p>Performance split by surface and venue type, so you know which conditions flatter your game.</p></div>
            <div className="pg-card"><span className="pg-card-eyebrow">Conditions</span><h3>Heat, wind and indoor drift</h3><p>How external factors move your numbers, so a bad day can be read properly instead of taken personally.</p></div>
            <div className="pg-card"><span className="pg-card-eyebrow">Clutch</span><h3>When it is tight</h3><p>What happens to your shot selection and error rate on the points that decide matches.</p></div>
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="who-h">
          <h2 className="pg-sec-h2" id="who-h">Who it is for</h2>
          <div className="pg-grid">
            {AUDIENCE.map((a) => (
              <div className="pg-card" key={a.k}>
                <span className="pg-card-eyebrow">{a.k}</span>
                <h3>{a.k}</h3>
                <p>{a.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="data-h">
          <h2 className="pg-sec-h2" id="data-h">Your data</h2>
          <p className="pg-sec-lede">
            Your footage is yours. We process it to produce your analysis, and we only use it to
            improve our models if you separately opt in — it is off unless you turn it on. Movement
            and load indicators are informational and are not medical advice.
          </p>
          <p><Link to="/privacy">Read the Privacy Policy →</Link></p>
        </section>

        <div className="pg-cta">
          <h2>See it on your own match</h2>
          <p>The apps are close. Join the waitlist and we will tell you the moment they land.</p>
          <Link className="pg-btn" to="/">Back to the site</Link>
        </div>
      </div>
    </PageShell>
  )
}
