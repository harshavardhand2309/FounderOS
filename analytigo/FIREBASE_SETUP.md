# Firebase setup — Lvl-Up Sports

Everything in the site is already wired. Until the six config values exist the
site runs in **mock mode**: the auth screens and the waitlist are fully
clickable but nothing is sent. Adding the config switches every call to real
Firebase — no code change needed.

**Only you can do steps 1–6** — they need a Google account and the Firebase
console. Once the repo secrets in step 6 are set, the next deploy goes live
with real auth.

---

## 1. Create the project

1. <https://console.firebase.google.com> → **Add project** → name it (e.g. `lvlup-sports`).
2. Google Analytics is optional; you can skip it.
3. In the project, click the **Web** icon (`</>`) to register a web app
   (e.g. "Lvl-Up Web"). **Do not** tick Firebase Hosting — the site deploys via
   GitHub Pages.
4. Copy the `firebaseConfig` values it shows you. You need these six:

   | Config key from Firebase | Environment variable |
   |---|---|
   | `apiKey` | `VITE_FIREBASE_API_KEY` |
   | `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `VITE_FIREBASE_PROJECT_ID` |
   | `appId` | `VITE_FIREBASE_APP_ID` |
   | `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
   | `messagingSenderId` | `VITE_FIREBASE_SENDER_ID` |

> These are **not** secrets. Firebase web config is public by design — every
> visitor's browser downloads it. Your data is protected by the Firestore rules
> in step 4 and the authorised domains in step 3, never by hiding these keys.

## 2. Turn on the sign-in methods

**Authentication → Sign-in method**, enable:

- **Email/Password** — used by the Sign Up form.
- **Phone** — used for OTP. Add test numbers under *Phone numbers for testing*
  so you can develop without burning real SMS quota.
- **Google** — one click, pick a support email.
- **Apple** — needs a paid Apple Developer account and a Services ID. If you
  don't have one yet, leave Apple off; the button will simply report that it
  isn't connected.

## 3. Authorise your domains

**Authentication → Settings → Authorized domains** — add every domain the site
runs on, or Google/Apple popups and phone auth will be rejected:

- `localhost`
- `harshavardhand2309.github.io`
- your custom domain, once you have one
- the Vercel domain, if you move there later

## 4. Create Firestore and publish the rules

1. **Firestore Database → Create database** → *Production mode* → pick a region
   (`asia-south1` (Mumbai) or `asia-south2` (Delhi) for Indian users).
2. Open the **Rules** tab, replace the contents with
   [`firestore.rules`](./firestore.rules) from this repo, and **Publish**.

The rules matter. They let the public site *write* leads but never *read* them
back, so nobody can scrape your waitlist. Collections created automatically on
first write:

| Collection | Written when | Client can read? |
|---|---|---|
| `waitlist` | someone joins the footer waitlist | no |
| `contact_messages` | someone submits the Contact form | no |
| `users` | on sign-up and on every social login | owner only |
| `signin_events` | on every successful login | no |

`waitlist` is keyed by email address, so the same person submitting twice
updates one row instead of creating duplicates.

## 5. Local development

```bash
cd analytigo
cp .env.example .env     # then paste your six values in
npm run dev
```

## 6. Make the deployed site use it

The GitHub Actions build already passes these through — you just need to add
the values as repository secrets:

**GitHub → repo → Settings → Secrets and variables → Actions → New repository
secret**, one for each of the six `VITE_FIREBASE_*` names in the table above.

Push anything (or re-run the workflow) and the live site will be on real auth.

---

## Getting notified when someone joins the waitlist

Firestore does not email you on its own. Three options, cheapest first:

**a. Just watch the console.** Firestore → `waitlist`, sort by `createdAt`.
Free, no setup, but you have to remember to look.

**b. The "Trigger Email from Firestore" extension** — no code. Firebase →
Extensions → install it, point it at a `mail` collection and give it SMTP
credentials (Gmail App Password, SendGrid, Resend, etc). Then have it watch
`waitlist`. Requires the **Blaze** (pay-as-you-go) plan, though this volume sits
inside the free allowance.

**c. A Cloud Function.** Also needs Blaze. Sketch:

```js
// functions/index.js — deploy with: firebase deploy --only functions
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const nodemailer = require('nodemailer')

exports.onWaitlistJoin = onDocumentCreated('waitlist/{id}', async (event) => {
  const data = event.data.data()
  const transport = nodemailer.createTransport({ /* your SMTP config */ })
  await transport.sendMail({
    to: 'contact@thelvlupsports.com',
    subject: `New waitlist signup: ${data.email}`,
    text: `${data.email} joined from "${data.source}".`,
  })
})
```

This snippet is untested — it has never run against a live project — so treat
it as a starting point rather than something to deploy unread.

**Blaze note:** switching to Blaze requires a billing account, but Firebase's
free monthly allowance still applies. Set a budget alert so there are no
surprises.

---

## Before you take real users

- **Account deletion.** Google Play requires an in-app way to delete an account
  and its data. Not built yet — needed before the Android app ships.
- **App Check.** Blocks bots from hammering your auth and Firestore endpoints.
  Worth enabling before launch.
- **Backups.** Firestore → Backups, set a daily schedule.
- **Budget alerts.** Billing → Budgets & alerts.
