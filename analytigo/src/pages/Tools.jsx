import { Link } from 'react-router-dom'
import PageShell from '../components/PageShell.jsx'
import PageMedia from '../components/PageMedia.jsx'

// Tools — an index of the utilities around the core product. Anything not built
// yet is labelled honestly rather than presented as available.

const TOOLS = [
  { k: 'Match', n: 'Highlight builder', d: 'Turn a full match into a share-ready reel — the AI picks the moments, you approve them.', s: 'Cooking' },
  { k: 'Match', n: 'Clip trimmer', d: 'Pull any point out of a session and send it to a player or a group chat.', s: 'Cooking' },
  { k: 'Court', n: 'Court calibration', d: 'Teach a camera the lines of a new court once, so every later match measures against the same reference.', s: 'Cooking' },
  { k: 'Compare', n: 'Face Off', d: 'Put two players side by side across nine metrics — a member against a club rival, or against a touring professional.', s: 'On the site' },
  { k: 'Squad', n: 'Squad dashboard', d: 'One view across every player a coach or academy works with, with the outliers surfaced.', s: 'Cooking' },
  { k: 'Events', n: 'Tournament exports', d: 'Draws, results and clips packaged for organisers to publish or broadcast.', s: 'Cooking' },
]

export default function Tools() {
  return (
    <PageShell title="Tools">
      <div className="pg-head">
        <div className="pg-head-in">
          <span className="pg-eyebrow">Tools</span>
          <h1 className="pg-h1">The bits around the analysis.</h1>
          <p className="pg-lede">
            Small utilities that make footage and data usable day to day — for players,
            for coaches, and for the people running the venue.
          </p>
        </div>
      </div>

      <div className="pg-wrap">
        <PageMedia
          src="/assets/home-intro.mp4"
          poster="/assets/home-intro-poster.jpg"
          alt="Lvl-Up Sports film"
          tag="Tools"
          caption="The tools all work on the same footage the cameras already captured — nothing needs uploading twice."
        />

        <section className="pg-sec" aria-labelledby="tools-h">
          <h2 className="pg-sec-h2" id="tools-h">What's here</h2>
          <p className="pg-sec-lede">
            We would rather show you what is coming than pretend everything already ships.
            Anything marked <strong>Cooking</strong> is in build.
          </p>
          <div className="pg-grid">
            {TOOLS.map((t) => (
              <div className="pg-card" key={t.n}>
                <span className="pg-card-eyebrow">{t.k} · {t.s}</span>
                <h3>{t.n}</h3>
                <p>{t.d}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="pg-cta">
          <h2>Missing a tool you need?</h2>
          <p>Tell us what would actually save you time — it is the fastest way onto the roadmap.</p>
          <Link className="pg-btn" to="/contact">Suggest a tool</Link>
        </div>
      </div>
    </PageShell>
  )
}
