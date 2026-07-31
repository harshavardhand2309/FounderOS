import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { css } from '../utils/css.js'
import { firebaseReady, socialLogin, signUp, confirmPhone, refreshEmailVerified, signInIdentifier, upsertUserProfile, recordSignIn } from '../utils/firebase.js'
import '../styles/auth.css'

// Sign In / Sign Up — one white-and-lime auth screen matching the hero.
// Backed by Firebase when VITE_FIREBASE_* is configured; otherwise it runs a
// mock flow so the public demo stays clickable. Verification reflects Firebase
// reality: a 6-digit PHONE OTP plus an EMAIL verification LINK (not a code).

// Three roles, one per app. Venue operators and tournament organisers share an
// app (usually the same person), so they share a role too.
const ROLES = ['Player', 'Coach', 'Venue & Organiser']

function CodeInput({ label, value, onChange }) {
  const refs = useRef([])
  const set = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = value.split('')
    next[i] = d
    onChange(next.join('').slice(0, 6))
    if (d && refs.current[i + 1]) refs.current[i + 1].focus()
  }
  const onKey = (i, e) => { if (e.key === 'Backspace' && !value[i] && refs.current[i - 1]) refs.current[i - 1].focus() }
  return (
    <div className="au-field">
      <span className="au-label">{label}</span>
      <div className="au-otp">
        {Array.from({ length: 6 }, (_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el }}
            className="au-otp-box"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            aria-label={`${label} digit ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function Auth({ mode = 'signin' }) {
  const isSignup = mode === 'signup'
  const [role, setRole] = useState('Player')
  const [show, setShow] = useState(false)
  const [step, setStep] = useState('form') // 'form' | 'verify' | 'done'
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [contact, setContact] = useState({ email: '', phone: '' })
  const [phoneCode, setPhoneCode] = useState('')
  const [emailOk, setEmailOk] = useState(false)
  // One agreement covering the Terms, the Privacy Policy and use of footage for
  // model training. It starts unticked and is required to submit.
  //
  // NOTE: this bundles model-training consent into the main agreement. Terms
  // section 82 in src/content/legal.js still promises it is "a separate opt-in
  // that you can decline or withdraw", so that copy needs to change to match.
  const [agree, setAgree] = useState(false)
  const confirmRef = useRef(null) // Firebase phone confirmation handle

  const onSignup = async (e) => {
    e.preventDefault()
    const f = e.target
    const data = { name: f.name.value, email: f.email.value, phone: f.phone.value.replace(/\s/g, ''), password: f.password.value, role }
    setContact({ email: data.email, phone: f.phone.value })
    setNotice('')
    if (!agree) { setNotice('Please confirm you have read the Terms of Service and Privacy Policy.'); return }
    if (!firebaseReady) { setStep('verify'); return } // mock
    setBusy(true)
    try {
      const { user, confirmation } = await signUp(data, 'au-recaptcha')
      // consent to model training is part of the single agreement, so it is
      // recorded from the same tick rather than a second checkbox
      await upsertUserProfile(user, { name: data.name, email: data.email, phone: data.phone, role, provider: 'password', modelTrainingOptIn: agree })
      confirmRef.current = confirmation
      setStep('verify')
    } catch (err) {
      setNotice(err?.message || 'Could not create the account. Please try again.')
    } finally { setBusy(false) }
  }

  const onSignin = async (e) => {
    e.preventDefault()
    const f = e.target
    setNotice('')
    if (!firebaseReady) { setStep('done'); return } // mock
    setBusy(true)
    try {
      const r = await signInIdentifier(f.identifier.value, f.password.value, 'au-recaptcha')
      if (r.needsOtp) { confirmRef.current = { confirmationResult: r.confirmationResult }; setContact({ phone: f.identifier.value, email: '' }); setStep('verify') }
      else { await recordSignIn(r.user, 'password'); setStep('done') }
    } catch (err) {
      setNotice(err?.message || 'Sign-in failed. Check your details and try again.')
    } finally { setBusy(false) }
  }

  const onVerify = async (e) => {
    e.preventDefault()
    setNotice('')
    if (!firebaseReady) { if (phoneCode.length < 6) { setNotice('Enter the 6-digit code to continue.'); return } setStep('done'); return }
    setBusy(true)
    try {
      const c = confirmRef.current
      if (c?.confirmationResult) {
        const res = await c.confirmationResult.confirm(phoneCode) // sign-in OTP
        await upsertUserProfile(res.user, { provider: 'phone' })
        await recordSignIn(res.user, 'phone')
      } else if (c) await confirmPhone(c, phoneCode) // sign-up: link phone
      setStep('done')
    } catch (err) {
      setNotice(err?.message || 'That code did not match. Please re-enter it.')
    } finally { setBusy(false) }
  }

  const onCheckEmail = async () => {
    if (!firebaseReady) { setEmailOk(true); return }
    setEmailOk(await refreshEmailVerified())
    if (!emailOk) setNotice('Not verified yet — click the link in your email, then try again.')
  }

  const onSocial = async (provider) => {
    setNotice('')
    if (!firebaseReady) { setNotice(`${provider} sign-in connects once the Firebase keys are added.`); return }
    setBusy(true)
    try {
      const user = await socialLogin(provider)
      await upsertUserProfile(user, { role, provider: provider.toLowerCase() })
      await recordSignIn(user, provider.toLowerCase())
      setStep('done')
    }
    catch (err) { setNotice(err?.message || `${provider} sign-in was cancelled.`) }
    finally { setBusy(false) }
  }

  return (
    <div className="au-root">
      <aside className="au-brand">
        <Link to="/" className="au-logo" aria-label="Lvl-Up Sports home">
          <img className="au-logo-mark" src="/assets/Logo.png" alt="" aria-hidden="true" />
          <span className="au-logo-word">Lvl-Up</span>
        </Link>
        <div className="au-brand-mid">
          <h1 className="au-brand-h1">
            {isSignup ? <>Level up your <span className="au-hl">game</span>.</> : <>Welcome <span className="au-hl">back</span>.</>}
          </h1>
          <p className="au-brand-sub">
            {isSignup
              ? 'Create your account and turn every match into measurable progress.'
              : 'Sign in to pick up your analytics, rankings, and progress where you left off.'}
          </p>
          <ul className="au-brand-list">
            <li>AI-powered performance analytics</li>
            <li>Head-to-head player comparisons</li>
            <li>Local benchmarks and rankings</li>
          </ul>
        </div>
        <span className="au-brand-foot">Your AI-powered Coaching Assistant</span>
      </aside>

      <main className="au-panel">
        <div className="au-card">
          <div className="au-switch" role="tablist" aria-label="Auth mode">
            <Link to="/signin" role="tab" aria-selected={!isSignup} className={!isSignup ? 'au-tab on' : 'au-tab'}>Sign In</Link>
            <Link to="/signup" role="tab" aria-selected={isSignup} className={isSignup ? 'au-tab on' : 'au-tab'}>Sign Up</Link>
          </div>

          {step === 'verify' && (
            <>
              <h2 className="au-title">Verify it's you</h2>
              <p className="au-lead">
                We sent a 6-digit code to <strong>{contact.phone || 'your phone'}</strong>
                {contact.email && <> and a verification link to <strong>{contact.email}</strong></>}.
              </p>
              <form className="au-form" onSubmit={onVerify}>
                <CodeInput label="Phone OTP" value={phoneCode} onChange={setPhoneCode} />
                {contact.email && (
                  <div className="au-emailverify">
                    <span>{emailOk ? '✓ Email verified' : 'Open your email and click the verification link.'}</span>
                    {!emailOk && <button type="button" className="au-resend" onClick={onCheckEmail}>I've verified</button>}
                  </div>
                )}

                {notice && <p className="au-notice">{notice}</p>}
                <button type="submit" className="au-submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
                <button type="button" className="au-resend" onClick={() => { setStep('form'); setNotice('') }}>← Back</button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div className="au-success">
              <span className="au-success-tick" aria-hidden="true">✓</span>
              <h2 className="au-title">You're all set</h2>
              <p className="au-lead">Welcome to Lvl-Up Sports.</p>
              <Link to="/" className="au-submit au-submit-link">Go to dashboard</Link>
            </div>
          )}

          {step === 'form' && (
            <>
              <h2 className="au-title">{isSignup ? 'Create your account' : 'Sign in to your account'}</h2>
              <p className="au-lead">{isSignup ? 'It takes less than a minute.' : 'Enter your details to continue.'}</p>

              <form className="au-form" onSubmit={isSignup ? onSignup : onSignin}>
                {isSignup && (
                  <label className="au-field">
                    <span className="au-label">Full name</span>
                    <input className="au-input" type="text" name="name" autoComplete="name" placeholder="Aadhitya Kumar" required />
                  </label>
                )}

                {isSignup ? (
                  <>
                    <label className="au-field">
                      <span className="au-label">Email</span>
                      <input className="au-input" type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
                    </label>
                    <label className="au-field">
                      <span className="au-label">Phone number</span>
                      <input className="au-input" type="tel" name="phone" autoComplete="tel" placeholder="+91 90000 00000" pattern="[0-9+\s\-]{7,}" required />
                    </label>
                  </>
                ) : (
                  <label className="au-field">
                    <span className="au-label">Email or phone number</span>
                    <input className="au-input" type="text" name="identifier" autoComplete="username" placeholder="you@example.com or +91 90000 00000" required />
                  </label>
                )}

                <label className="au-field">
                  <span className="au-label">Password</span>
                  <span className="au-pass">
                    <input className="au-input" type={show ? 'text' : 'password'} name="password" autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="••••••••" required minLength={6} />
                    <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
                  </span>
                </label>

                {isSignup && (
                  <div className="au-field">
                    <span className="au-label">I am a…</span>
                    <div className="au-roles">
                      {ROLES.map((r) => (
                        <button type="button" key={r} className={r === role ? 'au-role on' : 'au-role'} onClick={() => setRole(r)}>{r}</button>
                      ))}
                    </div>
                  </div>
                )}

                {!isSignup && (
                  <div className="au-row">
                    <label className="au-check"><input type="checkbox" /> Remember me</label>
                    <a className="au-link" href="#">Forgot password?</a>
                  </div>
                )}

                {notice && <p className="au-notice">{notice}</p>}

                {isSignup && (
                  <div className="au-consent">
                    <label className="au-consent-check">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
                      <span>
                        I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>,
                        including the use of my footage to improve Lvl-Up's AI models.
                      </span>
                    </label>
                    <p className="au-consent-foot">
                      Questions or complaints: Grievance Officer — <a href="mailto:contact@thelvlupsports.com">contact@thelvlupsports.com</a>,
                      +91 90258 67882. You may also complain to the Data Protection Board of India.
                    </p>
                  </div>
                )}

                <button type="submit" className="au-submit" disabled={busy}>{busy ? 'Please wait…' : (isSignup ? 'Create account' : 'Sign in')}</button>

                <div className="au-or"><span>or continue with</span></div>
                <div className="au-oauth">
                  <button type="button" className="au-oauth-btn" onClick={() => onSocial('Google')} disabled={busy}>Google</button>
                  <button type="button" className="au-oauth-btn" onClick={() => onSocial('Apple')} disabled={busy}>Apple</button>
                </div>
              </form>

              <p className="au-foot">
                {isSignup ? (
                  <>Already have an account? <Link to="/signin" className="au-link strong">Sign in</Link></>
                ) : (
                  <>New to Lvl-Up? <Link to="/signup" className="au-link strong">Create an account</Link></>
                )}
              </p>
            </>
          )}

          {/* invisible reCAPTCHA mount point for Firebase phone auth */}
          <div id="au-recaptcha" />
        </div>
      </main>
    </div>
  )
}
