import { Link } from 'react-router-dom'
import PageShell from '../components/PageShell.jsx'

// Cams — the venue/camera overview. Hard numbers a buyer would rely on
// (mount heights, bandwidth, IP ratings, prices) are deliberately left as
// bracketed placeholders rather than invented.

const CAPTURE = [
  { s: 'Tennis', t: 'Serve placement and speed, rally length, shot type, court coverage and depth.' },
  { s: 'Pickleball', t: 'Kitchen play, third-shot patterns, dink rallies and shot placement.' },
  { s: 'Badminton', t: 'Smash speed, clear depth, net play and footwork recovery.' },
  { s: 'Padel', t: 'Wall play, lob depth, net position and point construction.' },
]
const STEPS = [
  { h: 'Mount', p: 'A one-off install on a wall, fence, pole or tripod, positioned to see the whole court.' },
  { h: 'Calibrate', p: 'The camera learns the court lines once, so every later match is measured against the same reference.' },
  { h: 'Play', p: 'Recording starts and stops around play — nobody needs to operate anything courtside.' },
  { h: 'Review', p: 'Footage and stats appear in the app after the session, cut into clips you can share.' },
]
const FAQ = [
  ['Who owns the footage?', 'You do. We process it to produce your analysis, and we only use it to improve our models if you separately opt in. See the Terms and the Privacy Policy.'],
  ['What about players who did not agree to be filmed?', 'Venues display notice at the court, capture is aimed at the playing area, and anyone who appears in footage can ask us to remove it without needing an account.'],
  ['Does it work under floodlights or indoors?', 'Yes, within limits — very low light and heavy shadow reduce tracking accuracy. We will tell you honestly what your specific court can support before you commit.'],
  ['Can one camera cover two courts?', 'It depends on the geometry of your venue. That is one of the things a site walkthrough settles.'],
  ['What happens to junior players?', 'Under-18 players are only included through a parent, guardian or academy with verifiable consent, and we never profile or advertise to them.'],
  ['What internet does it need?', 'A stable upload connection at the venue. The exact figure depends on resolution and how many courts you run — [BANDWIDTH REQUIREMENT].'],
]

export default function Cams() {
  return (
    <PageShell title="Cams">
      <div className="pg-head">
        <div className="pg-head-in">
          <span className="pg-eyebrow">Cams</span>
          <h1 className="pg-h1">Every court, always recording.</h1>
          <p className="pg-lede">
            Cameras that watch the whole court, start when play starts, and hand every player
            their match back as footage and numbers — without anyone standing behind a tripod.
          </p>
        </div>
      </div>

      <div className="pg-wrap">
        <section className="pg-sec" aria-labelledby="setup-h">
          <h2 className="pg-sec-h2" id="setup-h">Two ways to set up</h2>
          <p className="pg-sec-lede">Most venues start with one court and grow. Both routes feed the same analytics.</p>
          <div className="pg-grid">
            <div className="pg-card">
              <span className="pg-card-eyebrow">One court</span>
              <h3>Portable</h3>
              <p>A single unit you can move between courts. Best for a club testing the idea, a coach who travels, or a venue with one show court.</p>
            </div>
            <div className="pg-card">
              <span className="pg-card-eyebrow">Whole venue</span>
              <h3>Fixed install</h3>
              <p>Permanently mounted per court, wired for power and network, always on. Best when every member expects their match to be recorded.</p>
            </div>
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="capture-h">
          <h2 className="pg-sec-h2" id="capture-h">What it captures, by sport</h2>
          <p className="pg-sec-lede">The models are tuned per code rather than adapted from one sport to another.</p>
          <div className="pg-grid">
            {CAPTURE.map((c) => (
              <div className="pg-card" key={c.s}>
                <span className="pg-card-eyebrow">{c.s}</span>
                <h3>{c.s} coverage</h3>
                <p>{c.t}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="how-h">
          <h2 className="pg-sec-h2" id="how-h">How it works</h2>
          <div className="pg-steps">
            {STEPS.map((s) => (
              <div className="pg-step" key={s.h}>
                <b />
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="req-h">
          <h2 className="pg-sec-h2" id="req-h">What a venue needs</h2>
          <p className="pg-sec-lede">
            We confirm all of this on a site walkthrough before anything is ordered — the answers
            differ between an indoor badminton hall and an outdoor padel court.
          </p>
          <div className="pg-table-wrap">
            <table className="pg-table">
              <caption>Site requirements</caption>
              <tbody>
                <tr><th scope="row">Mounting</th><td>Wall, fence, pole or tripod, at [MOUNT HEIGHT] with a clear view of the full court</td></tr>
                <tr><th scope="row">Power</th><td>[POWER REQUIREMENT]</td></tr>
                <tr><th scope="row">Network</th><td>[BANDWIDTH REQUIREMENT] upload per camera</td></tr>
                <tr><th scope="row">Environment</th><td>Indoor or outdoor — [WEATHER RATING], operating range [TEMPERATURE RANGE]</td></tr>
                <tr><th scope="row">Coverage</th><td>[COURTS PER UNIT] per unit, depending on venue geometry</td></tr>
                <tr><th scope="row">Install</th><td>[INSTALL TYPE AND TYPICAL DURATION]</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="faq-h">
          <h2 className="pg-sec-h2" id="faq-h">Questions venues ask</h2>
          <div className="pg-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="pg-cta">
          <h2>Book a site walkthrough</h2>
          <p>Tell us how many courts you run and we will tell you honestly what it would take.</p>
          <Link className="pg-btn" to="/contact">Talk to us about your venue</Link>
        </div>
      </div>
    </PageShell>
  )
}
