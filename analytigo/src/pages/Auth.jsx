import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { css } from '../utils/css.js'
import { firebaseReady, socialLogin, signUp, confirmPhone, refreshEmailVerified, signInIdentifier, upsertUserProfile, recordSignIn, authErrorMessage, clearRecaptcha } from '../utils/firebase.js'
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
  // Two separate consents. Model training must start unticked and must not be
  // bundled with the main agreement — a pre-ticked or bundled consent is not consent.
  const [agree, setAgree] = useState(false)
  const [trainOptIn, setTrainOptIn] = useState(false)
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
      await upsertUserProfile(user, {
        name: data.name, email: data.email, phone: data.phone, role, provider: 'password',
        agreedToTerms: agree,
        modelTrainingOptIn: trainOptIn,
      })
      confirmRef.current = confirmation
      setStep('verify')
    } catch (err) {
      // The account may already exist from a previous attempt that failed at the
      // phone step — say so plainly instead of leaving people stuck on a form
      // that will never succeed.
      setNotice(authErrorMessage(err, 'Could not create the account. Please try again.'))
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
      setNotice(authErrorMessage(err, 'Sign-in failed. Check your details and try again.'))
    } finally { setBusy(false) }
  }

  const onVerify = async (e) => {
    e.preventDefault()
    setNotice('')
    if (!firebaseReady) { if (phoneCode.length < 6) { setNotice('Enter the 6-digit code to continue.'); return } setStep('done'); return }

    const c = confirmRef.current
    // Only demand a code when there is actually an OTP outstanding. Previously
    // an account created without a phone number advanced past this screen on an
    // empty box, because `confirmPhone(null)` returns true.
    const needsCode = Boolean(c?.confirmationResult || c?.verificationId)
    if (needsCode && !/^\d{6}$/.test(phoneCode)) {
      setNotice('Enter the 6-digit code we sent by SMS.')
      return
    }

    setBusy(true)
    try {
      if (c?.confirmationResult) {
        const res = await c.confirmationResult.confirm(phoneCode) // sign-in OTP
        await upsertUserProfile(res.user, { provider: 'phone' })
        await recordSignIn(res.user, 'phone')
        clearRecaptcha()
      } else if (needsCode) {
        await confirmPhone(c, phoneCode) // sign-up: link phone
      }
      setStep('done')
    } catch (err) {
      setNotice(authErrorMessage(err, 'That code did not match. Please re-enter it.'))
    } finally { setBusy(false) }
  }

  const onCheckEmail = async () => {
    if (!firebaseReady) { setEmailOk(true); return }
    // Read the result into a local first. Checking the `emailOk` state here
    // read the *previous* render's value, so a user who had just verified was
    // shown "verified" and "not verified yet" at the same time.
    const ok = await refreshEmailVerified()
    setEmailOk(ok)
    setNotice(ok ? '' : 'Not verified yet — click the link in your email, then try again.')
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
    catch (err) { setNotice(authErrorMessage(err, `${provider} sign-in was cancelled.`)) }
    finally { setBusy(false) }
  }

  return (
    <div className="au-root">
      <aside className="au-brand">
        <Link to="/" className="au-logo" aria-label="Lvl-Up Sports home">
          <img className="au-logo-mark" src="/assets/logo.jpg" alt="" aria-hidden="true" />
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
                    <h3>Before you create your account</h3>
                    <div className="au-consent-cols">
                      <div>
                        <b>What we collect</b>
                        <ul>
                          <li>Your name, email address, phone number and the role you choose</li>
                          <li>Video of you playing, from venue cameras or your own device</li>
                          <li>Movement data derived from that video</li>
                          <li>Your match statistics</li>
                          <li>Basic device and app information</li>
                        </ul>
                      </div>
                      <div>
                        <b>What we do with it</b>
                        <ul>
                          <li>Produce your match analysis, statistics and highlights</li>
                          <li>Run your account and answer your messages</li>
                          <li>Keep the service secure</li>
                          <li>Take payment where you are on a paid plan</li>
                        </ul>
                      </div>
                      <div>
                        <b>Choices that stay yours</b>
                        <ul>
                          <li>Training our AI on your footage is <strong>off</strong> unless you switch it on</li>
                          <li>You can withdraw consent at any time, as easily as you gave it</li>
                          <li>You can download or delete your data whenever you want</li>
                        </ul>
                      </div>
                      <div>
                        <b>How long we keep it</b>
                        <ul>
                          <li>Video — 90 days</li>
                          <li>Statistics — while your account is open</li>
                          <li>After you close your account — 180 days, then deleted</li>
                        </ul>
                      </div>
                    </div>
                    <label className="au-consent-check">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
                      <span>I have read this and agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</span>
                    </label>
                    <label className="au-consent-check">
                      <input type="checkbox" checked={trainOptIn} onChange={(e) => setTrainOptIn(e.target.checked)} />
                      <span>Optional — use my footage to help improve Lvl-Up's AI models. You can change this later in settings.</span>
                    </label>
                    <p className="au-consent-foot">
                      Questions or complaints: Grievance Officer — <a href="mailto:contact@thelvlupsports.com">contact@thelvlupsports.com</a>,
                      +91 90258 67882. You may also complain to the Data Protection Board of India.
                    </p>
                  </div>
                )}

                {/* On sign-up the consent block sits between the first notice and
                    this button, so an error shown up there is off-screen when the
                    button is what the user is looking at. Repeat it here. */}
                {notice && isSignup && <p className="au-notice" role="alert">{notice}</p>}

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
              {isSignup && (
                <p className="au-terms">By creating an account you agree to our <a className="au-link" href="#">Terms</a> and <a className="au-link" href="#">Privacy Policy</a>.</p>
              )}
            </>
          )}

          {/* invisible reCAPTCHA mount point for Firebase phone auth */}
          <div id="au-recaptcha" />
        </div>
      </main>
    </div>
  )
}
