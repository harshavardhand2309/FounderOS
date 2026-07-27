import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/PageShell.jsx'
import { JOBS } from '../content/jobs.js'

// Careers index — search across title, team, location and blurb, then straight
// into the role. Roles live in content/jobs.js so adding one is a data change.

export default function Careers() {
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return JOBS
    return JOBS.filter((j) =>
      [j.title, j.team, j.location, j.type, j.blurb].join(' ').toLowerCase().includes(t))
  }, [q])

  const total = JOBS.reduce((n, j) => n + j.openings, 0)

  return (
    <PageShell title="Careers">
      <div className="pg-head">
        <div className="pg-head-in">
          <span className="pg-eyebrow">Careers</span>
          <h1 className="pg-h1">Build the thing that reads the game.</h1>
          <p className="pg-lede">
            We are a small team in Chennai building AI analytics for racket sports — cameras on
            courts, models that understand play, and products that hand a player their match back
            in numbers. {total} {total === 1 ? 'opening' : 'openings'} across {JOBS.length} roles right now.
          </p>
        </div>
      </div>

      <div className="pg-wrap">
        <div className="cr-hero">
          <img src="/assets/carrer.jpg" alt="The Lvl-Up team working together" loading="lazy" />
          <div className="cr-hero-scrim" />
          <div className="cr-hero-copy">
            <strong>Small team, real ownership</strong>
            <span>Everyone here ships something a player or a venue actually touches.</span>
          </div>
        </div>

        <section className="pg-sec" aria-labelledby="roles-h">
          <div className="cr-bar">
            <h2 className="pg-sec-h2" id="roles-h">Open roles</h2>
            <div className="cr-search">
              <label className="ld-sr" htmlFor="cr-q">Search roles</label>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                id="cr-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by role, team or location"
                autoComplete="off"
              />
            </div>
          </div>

          <p className="cr-count" role="status">
            {results.length === JOBS.length
              ? `Showing all ${JOBS.length} roles`
              : `${results.length} ${results.length === 1 ? 'role' : 'roles'} matching “${q}”`}
          </p>

          {results.length === 0 ? (
            <div className="cr-empty">
              <p>Nothing matches that search.</p>
              <p>
                We still want to hear from good people — send us a note at{' '}
                <a href="mailto:contact@thelvlupsports.com?subject=Open%20application">contact@thelvlupsports.com</a>.
              </p>
            </div>
          ) : (
            <ul className="cr-list">
              {results.map((j) => (
                <li key={j.id}>
                  <Link className="cr-row" to={`/careers/${j.id}`}>
                    <div className="cr-row-main">
                      <h3>{j.title}{j.openings > 1 && <em> · {j.openings} openings</em>}</h3>
                      <p>{j.blurb}</p>
                    </div>
                    <div className="cr-row-meta">
                      <span className="cr-chip">{j.team}</span>
                      <span className="cr-chip">{j.type}</span>
                      <span className="cr-chip">{j.location}</span>
                    </div>
                    <span className="cr-row-go" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pg-cta">
          <h2>Don’t see your role?</h2>
          <p>If you think you belong here, tell us what you would work on and why.</p>
          <a className="pg-btn" href="mailto:contact@thelvlupsports.com?subject=Open%20application">Send an open application</a>
        </div>
      </div>
    </PageShell>
  )
}
