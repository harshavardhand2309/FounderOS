# Going live — thelvlupsports.com

Everything here is a one-time setup except step 3, which is the deploy command
you will run repeatedly.

Order matters: **1 → 2 → 3** gets the site live on a Firebase URL. **4 → 5**
puts it on your domain. **6** is email (DKIM). **7** is the list of things to do
before you let real users in.

---

## 1. Fill in the Firebase config

The site runs in **mock mode** until these exist — auth screens are clickable
but nothing is sent, and the waitlist writes nowhere.

```bash
cd analytigo
cp .env.example .env      # then paste your six values in
```

Get them from **Firebase console → Project settings → Your apps → Web app**:

| Firebase console key | `.env` variable |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_SENDER_ID` |

All four of `apiKey`, `authDomain`, `projectId` and `appId` must be present or
the site deliberately stays in mock mode. `.env` is gitignored — these keys are
public by design, but keep the habit.

**Enable the sign-in methods** you actually use — Authentication → Sign-in
method: **Email/Password**, **Phone**, **Google**, **Apple**. A provider you
forget to enable fails at runtime with `auth/operation-not-allowed`.

> **Phone OTP needs the Blaze plan.** Without a billing account you get 10 SMS
> per day, total. Add billing before launch and set a budget alert.

---

## 2. Publish the security rules

```bash
cd analytigo
npx firebase login
npx firebase use --add          # pick your project, alias it "default"
npx firebase deploy --only firestore:rules,storage
```

`firestore.rules` lets the public site *write* leads but never *read* them back,
so nobody can scrape your waitlist. `storage.rules` is new — without it,
anonymous CV uploads on the careers form either fail outright or land in an open
bucket.

---

## 3. Build and deploy

```bash
cd analytigo
npm ci
npm run build
npx firebase deploy --only hosting
```

**The one trap:** this repo's GitHub Pages workflow builds with
`ANALYTIGO_BASE=/FounderOS/`. Firebase serves from the domain root, so build
with the default base (`/`) — i.e. just `npm run build`, with `ANALYTIGO_BASE`
unset. If you build with the Pages base, every asset 404s.

`firebase.json` is already configured with:
- a catch-all rewrite to `/index.html`, so `/tennis/analytics` survives a refresh
- `immutable` caching only on Vite's content-hashed files, and short caching on
  `public/assets/*` (those keep their names across deploys, so they must not be
  pinned forever)
- `no-cache` on the SPA shell, so a deploy is picked up immediately
- `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`

Verify: `curl -sI https://<project>.web.app | grep -i cache-control`

---

## 4. Point the domain at Firebase

Firebase console → **Hosting → Add custom domain**.

Add **`www.thelvlupsports.com`** first as the content domain, then add
**`thelvlupsports.com`** and tick *"redirect to another domain"* → target
`https://www.thelvlupsports.com`. (Or the reverse if you prefer the bare apex —
just pick one and redirect the other, so you never serve both.)

**Use the exact records the console prints.** Firebase does not hand every
project the same IPs, and blog posts are out of date. Expect roughly:

| Purpose | Type | Host | Value |
|---|---|---|---|
| Ownership | `TXT` | `@` | `hosting-site=…` (console generates it) |
| Apex → Hosting | `A` | `@` | the IPs the console shows (add every one) |
| www → Hosting | `A` or `CNAME` | `www` | as shown, or `<site>.web.app` |

Notes that actually bite:

- **Keep the TXT verification record forever.** It authorises SSL renewal;
  deleting it later silently breaks the certificate.
- **Never put a `CNAME` on the apex** (`@`). A CNAME at the root legally
  excludes every other record at that name — it would wipe out your `MX`, SPF
  and the Firebase TXT. That is why Firebase gives you `A` records for the apex.
  If your registrar only offers ALIAS/ANAME, that is fine; a raw CNAME is not.
- **If you use Cloudflare, keep the proxy OFF (grey cloud).** An orange-clouded
  record blocks certificate issuance and renewal.
- Allow up to 24 h for the certificate. Status goes *Needs setup → Pending →
  Connected*.
- If verification stalls, check the registrar did not append your domain twice
  (`thelvlupsports.com.thelvlupsports.com`) — enter `@` or leave the host blank
  for apex records.

### Then authorise the domain for sign-in

**Authentication → Settings → Authorized domains** — add:

```
thelvlupsports.com
www.thelvlupsports.com
```

Keep `localhost`, `<project>.web.app` and `<project>.firebaseapp.com`.

Miss this and Google/Apple sign-in fails with `auth/unauthorized-domain` and
phone OTP fails its reCAPTCHA check — while email/password keeps working, which
is exactly why this ships unnoticed.

If you use Google sign-in, also add `https://www.thelvlupsports.com` to
**Authorized JavaScript origins** and `https://<project>.firebaseapp.com/__/auth/handler`
to **Authorized redirect URIs** in the Google Cloud credentials console.

---

## 5. Retire the old links

Nothing in the site points at `tennisanalytics-0072.web.app` any more —
analytics now opens in-page at `/tennis/analytics`, and `/tennis/upload`
redirects there so any old link still lands somewhere sensible.

---

## 6. Email — DKIM, SPF, DMARC

### DKIM

Your key is 408 characters, which exceeds the 255-character limit for a single
DNS string. It must be **one TXT record containing two quoted strings** — *not*
two separate TXT records. Two records publishes two broken keys.

| Field | Value |
|---|---|
| Type | `TXT` |
| Host | `google._domainkey` |
| TTL | `3600` |

Most registrars (Cloudflare, GoDaddy, Namecheap, Squarespace, Hostinger) accept
the whole value pasted into one box and chunk it for you. Paste this:

```
v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuFIqt6liHKmXnoe2NCvtGLCJsu2GK7+QRHw55C/Bk/DyKPuN1lGjbR2MDzIhqStIaVWWWdIZUNayC0JsK02sPjK5Nxis8HkdlaxoeEaO47N4jvvCgQLT2Clfx7x3Bwk8sIsWKQ9/Bgrph5S1zkWs34TGeVSg4Z4LlgQVtxcJ9sevcx8tujrnkkeq2y6WmOeWOTDo1Th7SNilnjJnyFxHOB8Z4GBbKQCLxucmFCNHdNVa5wtwpgiwyWaQozduLyjlTIT3IhyBPtSF/w2HQ2VDVss/2o1Vzm76K2ppvZWAVgO8nXh90hETlMWYOSwjSN40FTSWmEmoqhgky9MAn3ZCXQIDAQAB
```

If your registrar (Route 53, Google Cloud DNS, some BigRock/ResellerClub panels)
rejects it as too long, enter it as two strings in the **same** record:

```
"v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuFIqt6liHKmXnoe2NCvtGLCJsu2GK7+QRHw55C/Bk/DyKPuN1lGjbR2MDzIhqStIaVWWWdIZUNayC0JsK02sPjK5Nxis8HkdlaxoeEaO47N4jvvCgQLT2Clfx7x3Bwk8sIsWKQ9/Bgrph5S1zkWs34TGeVSg4Z4LlgQVtxcJ9sevcx8tujrnkkeq2y6WmOeWOTD"
"o1Th7SNilnjJnyFxHOB8Z4GBbKQCLxucmFCNHdNVa5wtwpgiwyWaQozduLyjlTIT3IhyBPtSF/w2HQ2VDVss/2o1Vzm76K2ppvZWAVgO8nXh90hETlMWYOSwjSN40FTSWmEmoqhgky9MAn3ZCXQIDAQAB"
```

The two chunks are concatenated with no separator — do not add spaces, and do
not lose the trailing `=` padding.

Then: **Google Admin → Apps → Google Workspace → Gmail → Authenticate email →
Start authentication.** It can take up to 48 h to see the record.

### SPF — one record only, at the apex

| Host | Type | Value |
|---|---|---|
| `@` | `TXT` | `v=spf1 include:_spf.google.com ~all` |

A domain may have exactly **one** SPF record. If one already exists, merge into
it rather than adding a second. Add any other senders (SendGrid, Resend…) before
the `~all`, and keep the total under 10 DNS lookups.

### DMARC — start in monitor mode

| Host | Type | Value |
|---|---|---|
| `_dmarc` | `TXT` | `v=DMARC1; p=none; rua=mailto:dmarc@thelvlupsports.com; fo=1; pct=100` |

Run `p=none` for 2–4 weeks, read the aggregate reports, then tighten to
`p=quarantine` and eventually `p=reject`. The `rua` mailbox must exist and accept
external mail.

### Verify

```bash
dig +short TXT google._domainkey.thelvlupsports.com @8.8.8.8
dig +short TXT thelvlupsports.com @8.8.8.8
dig +short TXT _dmarc.thelvlupsports.com @8.8.8.8
```

You want **one** DKIM record ending in `IDAQAB`. Two records, or a value cut off
mid-base64, means the registrar mangled it. Then send a message to
<https://www.mail-tester.com/> and confirm `DKIM: PASS with domain
thelvlupsports.com` — it must be *your* domain, not gmail.com.

**DNS coexistence:** Hosting uses `A`/`AAAA` at `@` and `www`; email uses `MX`
and `TXT`. They never collide. The only rule is the no-CNAME-at-apex one above.

---

## 7. Before you let real users in

Ranked by how much they will cost you if skipped.

1. **SMS region policy.** Authentication → Settings → SMS region policy → allow
   **India only**. Phone auth without this is the standard SMS-toll-fraud
   vector: someone scripts OTPs to premium numbers and bills your Blaze account.
   This is free and takes a minute.
2. **App Check.** Roll out in *monitor* mode first, then enforce. Enforcing on
   day one locks out real users.
3. **Test phone numbers.** Auth → Sign-in method → Phone → *Phone numbers for
   testing*, so development never burns real SMS quota.
4. **`xlsx@0.18.5` has two unpatched advisories** (prototype pollution, ReDoS)
   and there is no fixed version on npm. It only runs client-side on a file the
   user picked themselves, and it is lazy-loaded, so the blast radius is that
   one browser tab — but fix it properly when you can:
   ```bash
   npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
   ```
   (SheetJS publishes to its own CDN now, not npm. That host was unreachable
   from the build sandbox, which is why it is not already done.)
5. **Firestore backups.** Firestore → Backups → daily schedule.
6. **Budget alerts.** Billing → Budgets & alerts.

---

## Rollback

Firebase keeps every release:

```bash
npx firebase hosting:releases:list
npx firebase hosting:rollback
```

## Preview a change before it goes live

```bash
npx firebase hosting:channel:deploy pr-preview --expires 7d
```
