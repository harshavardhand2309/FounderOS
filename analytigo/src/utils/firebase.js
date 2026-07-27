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

export const firebaseReady = Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId)

// lazy, cached bootstrap — Firebase is only downloaded once a real call fires
let _fb
async function fb() {
  if (_fb) return _fb
  const [appMod, authMod, fsMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])
  const app = appMod.initializeApp(cfg)
  _fb = { app, authMod, fsMod, auth: authMod.getAuth(app), db: fsMod.getFirestore(app) }
  _fb.auth.useDeviceLanguage()
  return _fb
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
    const verifier = new authMod.RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' })
    // link the phone number to the freshly created account via OTP
    const provider = new authMod.PhoneAuthProvider(auth)
    const verificationId = await provider.verifyPhoneNumber(phone, verifier)
    confirmation = { verificationId, user: cred.user, authMod }
  }
  return { user: cred.user, confirmation }
}

// --- confirm the phone OTP entered on the verify step ---
export async function confirmPhone(confirmation, code) {
  if (!confirmation) return true
  const { authMod, user, verificationId } = confirmation
  const credential = authMod.PhoneAuthProvider.credential(verificationId, code)
  await authMod.linkWithCredential(user, credential)
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
    const verifier = new authMod.RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' })
    const confirmationResult = await authMod.signInWithPhoneNumber(auth, identifier.replace(/\s/g, ''), verifier)
    return { needsOtp: true, confirmationResult } // caller collects the OTP, then confirmationResult.confirm(code)
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

// Firestore document IDs may not contain "/" and are capped at 1500 bytes.
const emailKey = (email) => email.trim().toLowerCase().replace(/\//g, '_').slice(0, 300)

// Create or update the profile document for a signed-in user. Called on sign-up
// and on every social login, so a Google/Apple account gets a profile too.
export async function upsertUserProfile(user, extra = {}) {
  if (!firebaseReady || !user) return { ok: true, local: true }
  const { db, fsMod } = await fb()
  const ref = fsMod.doc(db, 'users', user.uid)
  await fsMod.setDoc(ref, {
    uid: user.uid,
    name: extra.name || user.displayName || '',
    email: user.email || extra.email || '',
    phone: extra.phone || user.phoneNumber || '',
    role: extra.role || 'Player',
    provider: extra.provider || user.providerData?.[0]?.providerId || 'password',
    emailVerified: !!user.emailVerified,
    updatedAt: fsMod.serverTimestamp(),
    // only set on first write — merge leaves an existing value untouched
    createdAt: fsMod.serverTimestamp(),
  }, { merge: true })
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
