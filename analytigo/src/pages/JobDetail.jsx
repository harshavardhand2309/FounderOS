import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageShell from '../components/PageShell.jsx'
import { findJob } from '../content/jobs.js'
import { submitApplication, firebaseReady } from '../utils/firebase.js'

// Role detail + application. Only the fields we genuinely need are required;
// the CV goes to Firebase Storage and the answers to Firestore.

const MAX_MB = 5
const OK_TYPES = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export default function JobDetail() {
  const { id } = useParams()
  const job = findJob(id)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [fileName, setFileName] = useState('')
  const summaryRef = useRef(null)

  if (!job) {
    return (
      <PageShell title="Role not found">
        <div className="pg-head"><div className="pg-head-in">
          <span className="pg-eyebrow">Careers</span>
          <h1 className="pg-h1">That role isn’t open.</h1>
          <p className="pg-lede">It may have been filled or closed. <Link to="/careers">See the roles we are hiring for →</Link></p>
        </div></div>
      </PageShell>
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const f = e.target
    const found = []
    const get = (n) => (f[n]?.value || '').trim()
    const resume = f.resume?.files?.[0] || null

    if (!get('name')) found.push({ id: 'j-name', msg: 'Enter your full name.' })
    if (!/^\S+@\S+\.\S+$/.test(get('email'))) found.push({ id: 'j-email', msg: 'Enter an email address we can reply to.' })
    if (!get('phone')) found.push({ id: 'j-phone', msg: 'Enter a phone number.' })
    if (!get('location')) found.push({ id: 'j-location', msg: 'Tell us where you are based.' })
    if (!get('experience')) found.push({ id: 'j-experience', msg: 'Tell us how many years of relevant experience you have.' })
    if (!resume) found.push({ id: 'j-resume', msg: 'Attach your CV — PDF or Word, up to 5 MB.' })
    else if (resume.size > MAX_MB * 1024 * 1024) found.push({ id: 'j-resume', msg: `That file is over ${MAX_MB} MB. Please attach a smaller one.` })
    else if (OK_TYPES.length && !OK_TYPES.includes(resume.type) && !/\.(pdf|docx?)$/i.test(resume.name))
      found.push({ id: 'j-resume', msg: 'Please attach a PDF or Word document.' })

    setErrors(found)
    if (found.length) { requestAnimationFrame(() => summaryRef.current?.focus()); return }

    setBusy(true)
    try {
      await submitApplication({
        role: job.title, roleId: job.id,
        name: get('name'), email: get('email'), phone: get('phone'),
        location: get('location'), experience: get('experience'),
        links: get('links'), cover: get('cover'), resume,
      })
      setSent(true)
    } catch {
      setErrors([{ id: 'j-resume', msg: 'That did not send. Please try again, or email your CV to contact@thelvlupsports.com.' }])
    } finally { setBusy(false) }
  }

  const errFor = (k) => errors.find((e) => e.id === k)?.msg
  const cls = (k) => (errFor(k) ? 'ct-input bad' : 'ct-input')
  const aria = (k) => ({ 'aria-invalid': !!errFor(k), 'aria-describedby': errFor(k) ? `${k}-e` : undefined })

  return (
    <PageShell title={job.title}>
      <div className="pg-head">
        <div className="pg-head-in">
          <span className="pg-eyebrow"><Link to="/careers">Careers</Link> · {job.team}</span>
          <h1 className="pg-h1">{job.title}</h1>
          <p className="pg-lede">{job.blurb}</p>
          <div className="pg-badges">
            <span className="pg-badge">{job.type}</span>
            <span className="pg-badge">{job.location}</span>
            <span className="pg-badge">{job.openings} {job.openings === 1 ? 'opening' : 'openings'}</span>
          </div>
        </div>
      </div>

      <div className="pg-wrap">
        <div className="cr-cols">
          <div>
            <section className="pg-sec" aria-labelledby="about-h" style={{ marginTop: 0 }}>
              <h2 className="pg-sec-h2" id="about-h">About the role</h2>
              <p className="pg-sec-lede">{job.about}</p>
            </section>

            <section className="pg-sec" aria-labelledby="resp-h">
              <h2 className="pg-sec-h2" id="resp-h">What you will do</h2>
              <ul className="cr-ul">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
            </section>

            <section className="pg-sec" aria-labelledby="must-h">
              <h2 className="pg-sec-h2" id="must-h">What we need from you</h2>
              <ul className="cr-ul">{job.must.map((r) => <li key={r}>{r}</li>)}</ul>
              <h3 className="cr-h3">Nice to have</h3>
              <ul className="cr-ul cr-ul-soft">{job.nice.map((r) => <li key={r}>{r}</li>)}</ul>
            </section>
          </div>

          <aside className="cr-apply" id="apply">
            <h2 className="cr-apply-h">Apply</h2>
            {sent ? (
              <div className="ct-done" role="status">
                <h3>Application received.</h3>
                <p>
                  Thanks for applying for <strong>{job.title}</strong>. We read every application
                  and reply either way — usually within 5 working days.
                  {!firebaseReady && ' (Demo mode: nothing was actually transmitted.)'}
                </p>
                <p className="ct-done-next"><Link to="/careers">See the other roles →</Link></p>
              </div>
            ) : (
              <form className="ct-form" onSubmit={onSubmit} noValidate>
                {errors.length > 0 && (
                  <div className="ct-errsum" role="alert" tabIndex={-1} ref={summaryRef}>
                    <b>Please fix {errors.length === 1 ? 'this' : 'these'} before sending:</b>
                    <ul>{errors.map((e) => <li key={e.id}><a href={`#${e.id}`}>{e.msg}</a></li>)}</ul>
                  </div>
                )}

                <label className="ct-label" htmlFor="j-name">Full name *</label>
                <input className={cls('j-name')} id="j-name" name="name" autoComplete="name" required {...aria('j-name')} />
                {errFor('j-name') && <span className="ct-err" id="j-name-e">{errFor('j-name')}</span>}

                <label className="ct-label" htmlFor="j-email">Email *</label>
                <input className={cls('j-email')} id="j-email" name="email" type="email" autoComplete="email" required {...aria('j-email')} />
                {errFor('j-email') && <span className="ct-err" id="j-email-e">{errFor('j-email')}</span>}

                <div className="ct-row">
                  <div>
                    <label className="ct-label" htmlFor="j-phone">Phone *</label>
                    <input className={cls('j-phone')} id="j-phone" name="phone" type="tel" autoComplete="tel" required {...aria('j-phone')} />
                    {errFor('j-phone') && <span className="ct-err" id="j-phone-e">{errFor('j-phone')}</span>}
                  </div>
                  <div>
                    <label className="ct-label" htmlFor="j-location">Based in *</label>
                    <input className={cls('j-location')} id="j-location" name="location" placeholder="City, country" required {...aria('j-location')} />
                    {errFor('j-location') && <span className="ct-err" id="j-location-e">{errFor('j-location')}</span>}
                  </div>
                </div>

                <label className="ct-label" htmlFor="j-experience">Years of relevant experience *</label>
                <input className={cls('j-experience')} id="j-experience" name="experience" inputMode="numeric" required {...aria('j-experience')} />
                {errFor('j-experience') && <span className="ct-err" id="j-experience-e">{errFor('j-experience')}</span>}

                <label className="ct-label" htmlFor="j-links">Portfolio, GitHub or reel</label>
                <input className="ct-input" id="j-links" name="links" placeholder="https://" />

                <label className="ct-label" htmlFor="j-resume">CV / résumé *</label>
                <div className={errFor('j-resume') ? 'cr-file bad' : 'cr-file'}>
                  <input
                    id="j-resume" name="resume" type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                    required {...aria('j-resume')}
                  />
                  <span>{fileName || `PDF or Word, up to ${MAX_MB} MB`}</span>
                </div>
                {errFor('j-resume') && <span className="ct-err" id="j-resume-e">{errFor('j-resume')}</span>}

                <label className="ct-label" htmlFor="j-cover">Cover letter</label>
                <textarea className="ct-input" id="j-cover" name="cover" rows={6}
                  placeholder="Why this role, and what you would want to work on first." />

                <button className="pg-btn" type="submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Submit application'}
                </button>
                <p className="ct-consent">
                  We use what you send here only to consider you for this role.
                  See our <Link to="/privacy">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </aside>
        </div>
      </div>
    </PageShell>
  )
}
