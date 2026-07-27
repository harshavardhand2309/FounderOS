import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/PageShell.jsx'
import PageMedia from '../components/PageMedia.jsx'
import { submitContact, firebaseReady } from '../utils/firebase.js'

// Contact — kept to four visible fields by default (inquiry type, name, email,
// message); venue-specific fields appear only when they apply. Spam is handled
// with a honeypot plus a time-to-submit check rather than a CAPTCHA, so nothing
// is exposed to assistive tech.

const TOPICS = [
  { id: 'venue', label: 'Club or venue', reply: 'We review new venue enquiries within 2 working days.' },
  { id: 'player', label: 'Player or coach', reply: 'We usually reply to players and coaches within 2 working days.' },
  { id: 'support', label: 'Support', reply: 'Support requests are answered within 1 working day.' },
  { id: 'press', label: 'Press & partnerships', reply: 'Press and partnership enquiries reach us directly.' },
]

export default function Contact() {
  const [topic, setTopic] = useState('venue')
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const summaryRef = useRef(null)
  const startedAt = useRef(Date.now())

  const active = TOPICS.find((t) => t.id === topic)

  const onSubmit = async (e) => {
    e.preventDefault()
    const f = e.target
    // honeypot + time trap: real people don't submit in under two seconds
    if (f.company.value || Date.now() - startedAt.current < 2000) { setSent(true); return }

    const found = []
    const name = f.name.value.trim()
    const email = f.email.value.trim()
    const message = f.message.value.trim()
    if (!name) found.push({ id: 'c-name', msg: 'Enter your name so we know who we are replying to.' })
    if (!/^\S+@\S+\.\S+$/.test(email)) found.push({ id: 'c-email', msg: 'Enter an email address like name@club.com.' })
    if (message.length < 10) found.push({ id: 'c-message', msg: 'Tell us a little more — at least a sentence.' })
    setErrors(found)
    if (found.length) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setBusy(true)
    try {
      const detail = topic === 'venue' && f.venue?.value
        ? `${message}\n\n— Club: ${f.venue.value}, courts: ${f.courts.value || 'n/a'}`
        : message
      await submitContact({ name, email, topic: active.label, message: detail })
      setSent(true)
    } catch {
      setErrors([{ id: 'c-message', msg: 'That did not send. Please try again, or email us directly.' }])
    } finally { setBusy(false) }
  }

  const errFor = (id) => errors.find((e) => e.id === id)?.msg

  return (
    <PageShell title="Contact Us">
      <div className="pg-head">
        <div className="pg-head-in">
          <span className="pg-eyebrow">Contact</span>
          <h1 className="pg-h1">Talk to us.</h1>
          <p className="pg-lede">
            Whether you run a venue, coach a squad, or just want to know when the app lands —
            send us a line and a person will read it.
          </p>
        </div>
      </div>

      <div className="pg-wrap">
        <div className="ct-cols">
          <section aria-labelledby="ct-form-h">
            <h2 className="pg-sec-h2" id="ct-form-h">Send a message</h2>
            <p className="pg-sec-lede">{active.reply}</p>

            {sent ? (
              <div className="ct-done" role="status">
                <h3>Thanks — that's with us.</h3>
                <p>
                  We've logged your message under <strong>{active.label}</strong>. {active.reply}
                  {!firebaseReady && ' (Demo mode: nothing was actually transmitted.)'}
                </p>
                <p className="ct-done-next">
                  In the meantime, see <Link to="/cams">how the cameras work</Link> or{' '}
                  <Link to="/analytics">what the analytics cover</Link>.
                </p>
              </div>
            ) : (
              <form className="ct-form" onSubmit={onSubmit} noValidate>
                {errors.length > 0 && (
                  <div className="ct-errsum" role="alert" tabIndex={-1} ref={summaryRef}>
                    <b>Please fix {errors.length === 1 ? 'this' : 'these'} before sending:</b>
                    <ul>
                      {errors.map((e) => <li key={e.id}><a href={`#${e.id}`}>{e.msg}</a></li>)}
                    </ul>
                  </div>
                )}

                <fieldset className="ct-fieldset">
                  <legend className="ct-legend">What is this about?</legend>
                  <div className="ct-pills">
                    {TOPICS.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className={t.id === topic ? 'ct-pill on' : 'ct-pill'}
                        aria-pressed={t.id === topic}
                        onClick={() => setTopic(t.id)}
                      >{t.label}</button>
                    ))}
                  </div>
                </fieldset>

                <label className="ct-label" htmlFor="c-name">Your name</label>
                <input className={errFor('c-name') ? 'ct-input bad' : 'ct-input'} id="c-name" name="name"
                  autoComplete="name" required aria-invalid={!!errFor('c-name')}
                  aria-describedby={errFor('c-name') ? 'c-name-e' : undefined} />
                {errFor('c-name') && <span className="ct-err" id="c-name-e">{errFor('c-name')}</span>}

                <label className="ct-label" htmlFor="c-email">Email</label>
                <input className={errFor('c-email') ? 'ct-input bad' : 'ct-input'} id="c-email" name="email"
                  type="email" autoComplete="email" required aria-invalid={!!errFor('c-email')}
                  aria-describedby={errFor('c-email') ? 'c-email-e' : undefined} />
                {errFor('c-email') && <span className="ct-err" id="c-email-e">{errFor('c-email')}</span>}

                {topic === 'venue' && (
                  <div className="ct-row">
                    <div>
                      <label className="ct-label" htmlFor="c-venue">Club or venue name</label>
                      <input className="ct-input" id="c-venue" name="venue" autoComplete="organization" />
                    </div>
                    <div>
                      <label className="ct-label" htmlFor="c-courts">Number of courts</label>
                      <input className="ct-input" id="c-courts" name="courts" inputMode="numeric" />
                    </div>
                  </div>
                )}

                <label className="ct-label" htmlFor="c-message">Message</label>
                <textarea className={errFor('c-message') ? 'ct-input bad' : 'ct-input'} id="c-message" name="message"
                  rows={5} required aria-invalid={!!errFor('c-message')}
                  aria-describedby={errFor('c-message') ? 'c-message-e' : undefined} />
                {errFor('c-message') && <span className="ct-err" id="c-message-e">{errFor('c-message')}</span>}

                {/* honeypot — hidden from people and from assistive tech */}
                <div className="ct-hp" aria-hidden="true">
                  <label htmlFor="c-company">Company (leave blank)</label>
                  <input id="c-company" name="company" tabIndex={-1} autoComplete="off" />
                </div>

                <button className="pg-btn" type="submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Send message'}
                </button>
                <p className="ct-consent">
                  By sending this you agree we may use these details to reply to you.
                  See our <Link to="/privacy">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </section>

          <aside className="ct-aside" aria-label="Other ways to reach us">
            <div className="pg-card">
              <span className="pg-card-eyebrow">Direct</span>
              <h3>Email &amp; phone</h3>
              <p>
                <a href="mailto:contact@thelvlupsports.com">contact@thelvlupsports.com</a><br />
                <a href="tel:+919025867882">+91 90258 67882</a> — call &amp; WhatsApp
              </p>
            </div>
            <div className="pg-card">
              <span className="pg-card-eyebrow">Hours</span>
              <h3>When we're around</h3>
              <p>Monday to Saturday, 9:00–19:00 IST. Messages sent outside those hours are picked up the next working morning.</p>
            </div>
            <PageMedia
              src="/assets/sports-paddle.png"
              alt="A padel court of the kind we fit"
              tag="On site"
              caption="A walkthrough takes about an hour and settles mounting, lighting and network before anything is ordered."
              tall
            />
            <div className="pg-card">
              <span className="pg-card-eyebrow">What happens next</span>
              <h3>Three steps</h3>
              <p>
                1. Your message is routed by the category you picked.<br />
                2. A person — not a bot — reads it.<br />
                3. You get a reply within the window above.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  )
}
