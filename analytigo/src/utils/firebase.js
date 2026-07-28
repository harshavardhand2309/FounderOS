// Firebase auth + waitlist wiring for Lvl-Up Sports.
//
// Config comes from Vite env vars (VITE_FIREBASE_*). Until they are set the
// site runs in "mock" mode — the auth UI is fully clickable but sends nothing —
// so the public demo keeps working. Set the env vars (locally in .env, or in
// the deploy/CI environment) to switch every call below to real Firebase.
//
// Firebase config keys are NOT secrets — they are safe to expose in the client.
// The real security lives in Firebase Auth settings + Firestore rules.
//
// SETUP (once):
//   1. Create a Firebase project → Web app; copy its config.
//   2. Auth → Sign-in method: enable Email/Password, Phone, Google, Apple.
//   3. Auth → Settings → Authorized domains: add your site domains
//      (localhost, harshavardhand2309.github.io, and any custom domain).
//   4. Firestore: create a "waitlist" collection; add a rule allowing creates.
//   5. Set VITE_FIREBASE_* env vars (see .env.example) and rebuild.

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
}

// All four of these are required to initialise a usable app. appId used to be
// omitted from this check, so a half-filled .env produced a "ready" app that
// then failed at the first real call.
export const firebaseReady = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId)

// Phone numbers must reach Firebase in E.164 ("+919025867882"). India is the
// default country, so a bare 10-digit number is assumed to be Indian.
export function toE164(raw, defaultCountry = '+91') {
  const trimmed = String(raw || '').replace(/[\s()\-.]/g, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('+')) return trimmed
  if (trimmed.length === 10) return defaultCountry + trimmed
  if (trimmed.startsWith('0') && trimmed.length === 11) return defaultCountry + trimmed.slice(1)
  if (trimmed.startsWith('91') && trimmed.length === 12) return '+' + trimmed
  return '+' + trimmed
}

export function isValidE164(v) {
  return /^\+[1-9]\d{7,14}$/.test(v)
}

// Firebase surfaces raw strings like "Firebase: Error (auth/invalid-credential)."
// Showing those to users is not acceptable on a live site, so every code we can
// actually hit is mapped to something a person can act on.
const AUTH_MESSAGES = {
  'auth/email-already-in-use': 'That email already has an account. Try signing in instead.',
  'auth/invalid-email': 'That email address does not look right.',
  'auth/weak-password': 'Please choose a password of at least 6 characters.',
  'auth/invalid-credential': 'Those details did not match an account. Check the email and password.',
  'auth/wrong-password': 'That password is not right.',
  'auth/user-not-found': 'We could not find an account with those details.',
  'auth/user-disabled': 'That account has been disabled. Contact contact@thelvlupsports.com.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/invalid-phone-number': 'That phone number does not look right. Include the country code, e.g. +91 90258 67882.',
  'auth/missing-phone-number': 'Please enter a phone number.',
  'auth/invalid-verification-code': 'That code did not match. Please re-enter it.',
  'auth/code-expired': 'That code has expired. Send a new one and try again.',
  'auth/credential-already-in-use': 'That phone number is already linked to another account.',
  'auth/account-exists-with-different-credential': 'That email is already registered with a different sign-in method.',
  'auth/quota-exceeded': 'We have hit our SMS limit for now. Please try again shortly.',
  'auth/captcha-check-failed': 'The security check failed. Please reload the page and try again.',
  'auth/invalid-app-credential': 'The security check expired. Please reload the page and try again.',
  'auth/missing-app-credential': 'The security check did not load. Please reload the page and try again.',
  'auth/unauthorized-domain': 'This site is not authorised for sign-in yet. Please contact support.',
  'auth/operation-not-allowed': 'That sign-in method is not enabled yet.',
  'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
  'auth/network-request-failed': 'We could not reach the network. Check your connection and try again.',
}

export function authErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return AUTH_MESSAGES[err?.code] || fallback
}

// lazy, cached bootstrap — Firebase is only downloaded once a real call fires
let _fb
async function fb() {
  if (_fb) return _fb
  const [appMod, authMod, fsMod, stMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/storage'),
  ])
  const app = appMod.initializeApp(cfg)
  _fb = { app, authMod, fsMod, stMod, auth: authMod.getAuth(app), db: fsMod.getFirestore(app), storage: stMod.getStorage(app) }
  _fb.auth.useDeviceLanguage()
  return _fb
}

// --- reCAPTCHA lifecycle -------------------------------------------------
// Firebase renders the invisible reCAPTCHA into a DOM node and refuses to
// render a second one into the same node. Constructing a fresh verifier per
// attempt therefore throws "reCAPTCHA has already been rendered in this
// element" the moment anyone retries — a mistyped number, a back-and-resubmit,
// or a retry after auth/email-already-in-use. One instance is cached here and
// explicitly cleared on failure so the next attempt starts clean.
let _verifier = null
let _verifierContainerId = null

async function getVerifier(containerId) {
  const { auth, authMod } = await fb()
  if (_verifier && _verifierContainerId === containerId) return _verifier
  clearRecaptcha()
  _verifier = new authMod.RecaptchaVerifier(auth, containerId, { size: 'invisible' })
  _verifierContainerId = containerId
  return _verifier
}

export function clearRecaptcha() {
  try { _verifier?.clear() } catch { /* already gone */ }
  _verifier = null
  _verifierContainerId = null
}

// --- social sign-in (Google / Apple) ---
export async function socialLogin(providerName) {
  const { auth, authMod } = await fb()
  const provider = providerName === 'Apple'
    ? new authMod.OAuthProvider('apple.com')
    : new authMod.GoogleAuthProvider()
  const res = await authMod.signInWithPopup(auth, provider)
  return res.user
}

// --- sign up: create the account, email a verification link, start phone OTP ---
export async function signUp({ name, email, phone, password }, recaptchaContainerId) {
  const { auth, authMod } = await fb()
  const cred = await authMod.createUserWithEmailAndPassword(auth, email, password)
  if (name) await authMod.updateProfile(cred.user, { displayName: name })
  await authMod.sendEmailVerification(cred.user)
  let confirmation = null
  if (phone) {
    const e164 = toE164(phone)
    if (!isValidE164(e164)) {
      const e = new Error('Invalid phone number')
      e.code = 'auth/invalid-phone-number'
      throw e
    }
    try {
      const verifier = await getVerifier(recaptchaContainerId)
      // link the phone number to the freshly created account via OTP
      const provider = new authMod.PhoneAuthProvider(auth)
      const verificationId = await provider.verifyPhoneNumber(e164, verifier)
      confirmation = { verificationId, user: cred.user, authMod }
    } catch (err) {
      // A consumed or failed reCAPTCHA can never be reused — drop it so the
      // retry builds a fresh one instead of hitting "already rendered".
      clearRecaptcha()
      throw err
    }
  }
  return { user: cred.user, confirmation }
}

// --- confirm the phone OTP entered on the verify step ---
export async function confirmPhone(confirmation, code) {
  // No phone means nothing to confirm. The caller must not read this as
  // "any code is accepted" — it checks whether a confirmation exists first.
  if (!confirmation) return true
  const { authMod, user, verificationId } = confirmation
  const credential = authMod.PhoneAuthProvider.credential(verificationId, code)
  await authMod.linkWithCredential(user, credential)
  clearRecaptcha()
  return true
}

// --- re-check whether the email link was clicked ---
export async function refreshEmailVerified() {
  const { auth } = await fb()
  if (!auth.currentUser) return false
  await auth.currentUser.reload()
  return auth.currentUser.emailVerified
}

// --- sign in with email OR phone ---
export async function signInIdentifier(identifier, password, recaptchaContainerId) {
  const { auth, authMod } = await fb()
  const isPhone = /^\+?[0-9\s\-]{7,}$/.test(identifier) && !identifier.includes('@')
  if (isPhone) {
    const e164 = toE164(identifier)
    if (!isValidE164(e164)) {
      const e = new Error('Invalid phone number')
      e.code = 'auth/invalid-phone-number'
      throw e
    }
    try {
      const verifier = await getVerifier(recaptchaContainerId)
      const confirmationResult = await authMod.signInWithPhoneNumber(auth, e164, verifier)
      return { needsOtp: true, confirmationResult } // caller collects the OTP, then confirmationResult.confirm(code)
    } catch (err) {
      clearRecaptcha()
      throw err
    }
  }
  const res = await authMod.signInWithEmailAndPassword(auth, identifier, password)
  return { user: res.user }
}

// ---------------------------------------------------------------- Firestore
// Collections (see firestore.rules for the matching access rules):
//   users/{uid}        — one profile per account, written on sign-up and login
//   signin_events/{id} — append-only login log
//   waitlist/{emailKey}— launch waitlist, keyed by email so re-submits merge
//   contact_messages   — Contact Us form submissions

// Bump whenever the Terms or Privacy Policy change materially, so a stored
// consent says which version the person actually agreed to.
export const POLICY_VERSION = '1.0'

// Firestore document IDs may not contain "/" and are capped at 1500 bytes.
const emailKey = (email) => email.trim().toLowerCase().replace(/\//g, '_').slice(0, 300)

// Create or update the profile document for a signed-in user. Called on sign-up
// and on every social login, so a Google/Apple account gets a profile too.
export async function upsertUserProfile(user, extra = {}) {
  if (!firebaseReady || !user) return { ok: true, local: true }
  const { db, fsMod } = await fb()
  const ref = fsMod.doc(db, 'users', user.uid)

  const payload = {
    uid: user.uid,
    name: extra.name || user.displayName || '',
    email: user.email || extra.email || '',
    phone: extra.phone || user.phoneNumber || '',
    role: extra.role || 'Player',
    provider: extra.provider || user.providerData?.[0]?.providerId || 'password',
    emailVerified: !!user.emailVerified,
    updatedAt: fsMod.serverTimestamp(),
  }

  // Consent is evidence. The sign-up form collects an explicit agreement to the
  // Terms/Privacy Policy and a separate, unticked-by-default opt-in for model
  // training; neither used to be written anywhere, which left us collecting a
  // DPDP consent we could not produce on request. Stamped with the time and the
  // policy version so a record means something later.
  if (typeof extra.agreedToTerms === 'boolean') {
    payload.agreedToTerms = extra.agreedToTerms
    payload.agreedToTermsAt = fsMod.serverTimestamp()
    payload.policyVersion = extra.policyVersion || POLICY_VERSION
  }
  if (typeof extra.modelTrainingOptIn === 'boolean') {
    payload.modelTrainingOptIn = extra.modelTrainingOptIn
    payload.modelTrainingOptInAt = fsMod.serverTimestamp()
    payload.policyVersion = extra.policyVersion || POLICY_VERSION
  }

  // createdAt must only be written once. `merge: true` overwrites any field
  // present in the payload, so including it unconditionally reset the signup
  // date to "now" on every subsequent login.
  let exists = false
  try {
    exists = (await fsMod.getDoc(ref)).exists()
  } catch { /* first write, or rules deny the read — treat as new */ }
  if (!exists) payload.createdAt = fsMod.serverTimestamp()

  await fsMod.setDoc(ref, payload, { merge: true })
  return { ok: true }
}

// Record a login: stamps the profile and appends to the audit log.
export async function recordSignIn(user, method = 'password') {
  if (!firebaseReady || !user) return { ok: true, local: true }
  const { db, fsMod } = await fb()
  await fsMod.setDoc(fsMod.doc(db, 'users', user.uid), {
    lastSignInAt: fsMod.serverTimestamp(),
    signInCount: fsMod.increment(1),
  }, { merge: true })
  await fsMod.addDoc(fsMod.collection(db, 'signin_events'), {
    uid: user.uid,
    method,
    at: fsMod.serverTimestamp(),
  })
  return { ok: true }
}

// --- waitlist capture ---
export async function joinWaitlist(email, source = 'footer') {
  if (!firebaseReady) return { ok: true, local: true }
  const { db, fsMod } = await fb()
  // keyed by email so a repeat submit updates rather than duplicating the row
  await fsMod.setDoc(fsMod.doc(db, 'waitlist', emailKey(email)), {
    email: email.trim().toLowerCase(),
    source,
    createdAt: fsMod.serverTimestamp(),
  }, { merge: true })
  return { ok: true }
}

// --- Contact Us form ---
export async function submitContact({ name, email, topic, message }) {
  if (!firebaseReady) return { ok: true, local: true }
  const { db, fsMod } = await fb()
  await fsMod.addDoc(fsMod.collection(db, 'contact_messages'), {
    name, email, topic, message,
    status: 'new',
    createdAt: fsMod.serverTimestamp(),
  })
  return { ok: true }
}

// --- job applications ---
// The CV goes to Storage and the rest to Firestore, with the file's download URL
// stored alongside the answers so one document is everything a reviewer needs.
export async function submitApplication({ role, roleId, name, email, phone, location, experience, links, cover, resume }) {
  if (!firebaseReady) return { ok: true, local: true }
  const { db, fsMod, storage, stMod } = await fb()
  let resumeUrl = ''
  let resumeName = ''
  if (resume) {
    resumeName = resume.name
    const safe = resume.name.replace(/[^\w.\-]/g, '_').slice(-120)
    const path = `resumes/${roleId}/${Date.now()}-${safe}`
    const ref = stMod.ref(storage, path)
    await stMod.uploadBytes(ref, resume, { contentType: resume.type || 'application/octet-stream' })
    resumeUrl = await stMod.getDownloadURL(ref)
  }
  await fsMod.addDoc(fsMod.collection(db, 'job_applications'), {
    role, roleId, name, email, phone, location, experience, links, cover,
    resumeUrl, resumeName,
    status: 'new',
    createdAt: fsMod.serverTimestamp(),
  })
  return { ok: true }
}
