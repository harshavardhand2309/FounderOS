import { Link } from 'react-router-dom'
import PageShell from '../components/PageShell.jsx'

// Public account-deletion page. Google Play requires a URL that works without
// signing in or reinstalling the app, so this page is intentionally reachable
// from the footer and asks nothing of the visitor before explaining the route.

export default function DeleteAccount() {
  return (
    <PageShell title="Delete your account">
      <div className="pg-head">
        <div className="pg-head-in">
          <span className="pg-eyebrow">Your data</span>
          <h1 className="pg-h1">Delete your Lvl-Up account.</h1>
          <p className="pg-lede">
            You can delete your account and your data at any time. You do not need to be
            signed in to make the request, and there are two ways to do it.
          </p>
        </div>
      </div>

      <div className="pg-wrap">
        <section className="pg-sec" aria-labelledby="how-h">
          <h2 className="pg-sec-h2" id="how-h">Two ways to delete</h2>
          <div className="pg-grid">
            <div className="pg-card">
              <span className="pg-card-eyebrow">In the app</span>
              <h3>Settings → Account → Delete account</h3>
              <p>Immediate and permanent. The app confirms once before it goes ahead.</p>
            </div>
            <div className="pg-card">
              <span className="pg-card-eyebrow">By email</span>
              <h3>Write to us</h3>
              <p>
                Email <a href="mailto:contact@thelvlupsports.com?subject=Delete%20my%20account">contact@thelvlupsports.com</a> from
                the address on your account, with the subject “Delete my account”. We confirm
                within 24 hours and complete the deletion within 30 days.
              </p>
            </div>
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="what-h">
          <h2 className="pg-sec-h2" id="what-h">What gets deleted</h2>
          <div className="pg-grid">
            <div className="pg-card">
              <span className="pg-card-eyebrow">Removed</span>
              <h3>Everything that identifies you</h3>
              <p>Your profile and login details, your video footage, your movement data and match statistics, and your highlights and clips.</p>
            </div>
            <div className="pg-card">
              <span className="pg-card-eyebrow">Retained</span>
              <h3>Only what the law requires</h3>
              <p>
                Payment and tax records, which Indian tax law requires us to keep; basic account
                records for 180 days after closure, as Indian IT rules require; and anything else we
                are under a legal obligation to retain. Nothing kept for these reasons is used to
                provide the service or for any other purpose.
              </p>
            </div>
          </div>
        </section>

        <section className="pg-sec" aria-labelledby="export-h">
          <h2 className="pg-sec-h2" id="export-h">Want your data before you go?</h2>
          <p className="pg-sec-lede">
            Ask us for an export first. We send it within 7 days, and you have 30 days to download
            it before the deletion completes.
          </p>
        </section>

        <section className="pg-sec" aria-labelledby="third-h">
          <h2 className="pg-sec-h2" id="third-h">Appear in someone else’s footage?</h2>
          <p className="pg-sec-lede">
            You do not need an account to have it removed. Write to{' '}
            <a href="mailto:contact@thelvlupsports.com">contact@thelvlupsports.com</a> with the
            venue, the approximate date and time, and how to recognise you. We acknowledge within
            24 hours.
          </p>
        </section>

        <div className="pg-cta">
          <h2>Questions before you delete?</h2>
          <p>Our Grievance Officer answers within 24 hours and aims to resolve within 15 days.</p>
          <Link className="pg-btn" to="/contact">Contact us</Link>
        </div>
      </div>
    </PageShell>
  )
}
