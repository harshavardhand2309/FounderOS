import { Link } from 'react-router-dom'
import PageShell from '../components/PageShell.jsx'
import PageMedia from '../components/PageMedia.jsx'

// Cams — the venue/camera overview. Figures here come from the hardware work;
// anything not yet settled (starting price, exact lux threshold) is described
// rather than invented, and the CCTV certification claim stays off the page
// until the certificate for the exact model is in hand.

const CAPTURE = [
  { s: 'Tennis', t: 'Serve placement and speed, rally length, shot type, court coverage and depth.' },
  { s: 'Pickleball', t: 'Kitchen play, third-shot patterns, dink rallies and shot placement.' },
]
const STEPS = [
  { h: 'Mount', p: 'A one-off install on a wall, fence, pole or tripod, positioned to see the whole court.' },
  { h: 'Calibrate', p: 'The camera learns the court lines once, so every later match is measured against the same reference.' },
  { h: 'Play', p: 'Recording starts and stops around play — nobody needs to operate anything courtside.' },
  { h: 'Review', p: 'Footage and stats appear in the app after the session, cut into clips you can share.' },
]
const FAQ = [
  ['Who owns the footage?', 'You do. We process it to produce your analysis, and we only use it to improve our models if you separately opt in. See the Terms and the Privacy Policy.'],
  ['What about players who did not agree to be filmed?', 'Venues display notice at every court entrance and camera position, capture is aimed at the playing area only, and anyone who appears in footage can ask us to remove it without needing an account.'],
  ['Can one camera cover two courts?', 'Usually no — one camera per court is what we install, because a ball is only a few pixels across at that distance and covering two courts halves the detail. If your courts are unusually close we will look at it during the walkthrough, but plan for one per court.'],
  ['What happens to junior players?', 'A player under 18 can only be added by a parent or guardian, who verifies their identity first. We do not track or profile junior players, we never show them advertising, and we never use their footage to train our models.'],
  ['How long is footage kept?', 'Raw video is kept for 90 days. Statistics stay for as long as the player\u2019s account is open.'],
  ['Who sees what?', 'Players see their own analysis. You see how much the system is being used across your courts — not other members\u2019 personal statistics.'],
  ['Does installation close the court?', 'No. Installation takes one to two days per venue and we work around your bookings.'],
  ['What if it breaks?', 'Faults are our problem, not yours. Tell us and we respond within two working days. If a court is out of service for more than a week, we credit that court\u2019s fee.'],
  ['What about ball strikes and weather?', 'The cameras are weatherproof and mounted clear of play. Normal wear and stray ball strikes are covered by us.'],
  ['What internet does it need?', 'A standard business broadband line covers several courts. Each camera uses about 8 Mbps while play is happening, and uploads run in the background.'],
  ['How do we get out?', 'Monthly rolling after any initial term. Thirty days\u2019 notice, we remove the equipment, and there is no exit fee.'],
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
        <PageMedia
          src="/assets/cctv.jpg"
          alt="Fixed cameras mounted on a pole, angled down over a playing area"
          tag="Fixed install"
          caption="One camera per court, mounted high and angled to see the whole playing area — the same framing every session, which is what makes a player's numbers comparable week to week."
        />

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

        <section className="pg-sec" aria-labelledby="cost-h">
          <h2 className="pg-sec-h2" id="cost-h">What it costs a venue</h2>
          <p className="pg-sec-lede">You don’t buy the hardware.</p>
          <div className="pg-grid">
            <div className="pg-card">
              <span className="pg-card-eyebrow">No capital cost</span>
              <h3>The cameras stay ours</h3>
              <p>You pay a monthly subscription per venue, and the equipment, installation, maintenance and replacement are all included in it. There is nothing to depreciate, and if you stop, we take the equipment away.</p>
            </div>
            <div className="pg-card">
              <span className="pg-card-eyebrow">Pricing</span>
              <h3>Quoted after the walkthrough</h3>
              <p>What you pay depends on how many courts you run and how many hours you want analysed. We publish a starting price once our pricing is finalised — until then we quote directly after seeing the site.</p>
            </div>
            <div className="pg-card">
              <span className="pg-card-eyebrow">Getting out</span>
              <h3>Monthly rolling</h3>
              <p>Thirty days’ notice after any initial term. We remove the equipment and there is no exit fee.</p>
            </div>
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="req-h">
          <h2 className="pg-sec-h2" id="req-h">What a venue needs</h2>
          <p className="pg-sec-lede">
            We confirm all of this on a site walkthrough before anything is ordered — the answers
            differ between an indoor hall and an outdoor court.
          </p>
          <div className="pg-table-wrap">
            <table className="pg-table">
              <caption>Site requirements</caption>
              <tbody>
                <tr><th scope="row">Mounting</th><td>Wall, fence, pole or tripod, with a clear view of the full court. We confirm the exact height on site.</td></tr>
                <tr><th scope="row">Power &amp; network</th><td>Mains power at the mount, and a standard business broadband line. Each camera uses about 8 Mbps while play is happening; uploads run in the background.</td></tr>
                <tr><th scope="row">Lighting</th><td><strong>Evening play needs an even, adequate light level across the court, which we measure at the walkthrough.</strong> Flickering floodlights are the one condition we cannot work around from the camera — some older fittings pulse in a way that disrupts tracking. We test for it, and if it fails, the fix is at the light fitting rather than at the camera. Daytime play has no lighting requirement.</td></tr>
                <tr><th scope="row">Environment</th><td>Indoor or outdoor. The cameras are weatherproof and mounted clear of play.</td></tr>
                <tr><th scope="row">Coverage</th><td>One camera per court. Covering two courts with one unit halves the detail, so we do not do it by default.</td></tr>
                <tr><th scope="row">Install</th><td>One to two days per venue, worked around your bookings. The court does not close.</td></tr>
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
