// Policy content for the three legal pages.
//
// These are WORKING DRAFTS, not lawyer-reviewed documents. They are shaped to
// Indian law as it stands for a company of this type — the DPDP Act 2023 and
// DPDP Rules 2025, the IT Act 2000 and SPDI Rules 2011 (in force until they are
// omitted), the IT Intermediary Guidelines Rules 2021, the Consumer Protection
// Act 2019 with the E-Commerce Rules 2020, and the CCPA dark-pattern guidelines.
// Anything in [SQUARE BRACKETS] must be filled in before publication.

const ENTITY = '[LEGAL ENTITY NAME]'
const CITY = '[JURISDICTION CITY]'
const EMAIL = 'contact@thelvlupsports.com'

export const TERMS = {
  title: 'Terms of Service',
  path: '/terms',
  lede: 'The agreement between you and Lvl-Up Sports when you use our website, apps and analytics.',
  effective: '[EFFECTIVE DATE]',
  updated: '[LAST UPDATED]',
  version: '1.0 (draft)',
  sections: [
    {
      id: 'who-we-are', title: 'Who we are',
      body: [
        `Lvl-Up Sports is operated by ${ENTITY}, a company registered in India with its registered office at [REGISTERED OFFICE ADDRESS] (CIN [CIN], GSTIN [GSTIN]). In these terms, "we", "us" and "our" mean ${ENTITY}, and "you" means the person using the service.`,
        `You can reach us at <a href="mailto:${EMAIL}">${EMAIL}</a> or [PHONE].`,
      ],
    },
    {
      id: 'acceptance', title: 'Accepting these terms',
      short: 'Using Lvl-Up means you accept these terms. If you do not accept them, please do not use the service.',
      body: [
        'By creating an account, joining the waitlist, or otherwise using our website, mobile applications or analytics services (together, the "Service"), you agree to these Terms of Service and to our <a href="/privacy">Privacy Policy</a>.',
        'If you are using the Service on behalf of a club, academy or other organisation, you confirm you are authorised to accept these terms on its behalf.',
      ],
    },
    {
      id: 'eligibility', title: 'Eligibility and age',
      short: 'You must be 18 or older to hold an account. Under-18 players may be included only through a parent or guardian, who accepts these terms for them.',
      body: [
        'Under the Indian Contract Act, 1872, a person under 18 cannot enter into a binding contract. You must therefore be at least 18 years old to register an account and accept these terms.',
        'We recognise that junior athletes are a real part of racket sport. A parent or lawful guardian may hold an account and add a child to it. In that case the parent or guardian accepts these terms on the child\'s behalf, is responsible for use of the account, and must give verifiable consent to the processing of the child\'s personal data as described in our <a href="/privacy">Privacy Policy</a>.',
        'We do not carry out behavioural tracking, profiling or targeted advertising in respect of any user we know to be under 18. This is a hard limit, not a setting.',
      ],
    },
    {
      id: 'your-account', title: 'Your account',
      body: [
        'You agree to give accurate registration details and to keep them up to date. You are responsible for activity under your account and for keeping your credentials, one-time passwords and linked sign-in methods secure.',
        'Tell us promptly at <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> if you believe your account has been used without your permission.',
      ],
    },
    {
      id: 'the-service', title: 'What the Service does — and what it does not promise',
      short: 'Our analytics are computed estimates produced by software. They are not medical advice and they are not guaranteed to be accurate.',
      body: [
        'The Service records and analyses sport footage and produces statistics, motion analysis, comparisons and highlights. Outputs are generated automatically by computer vision and machine-learning models.',
        'Those outputs are <strong>estimates</strong>. Accuracy varies with camera placement, lighting, court type, occlusion and the quality of the footage. We do not warrant that any metric, line call, speed, angle or risk indicator is accurate, complete or fit for any particular purpose.',
        '<strong>Nothing in the Service is medical, physiotherapy, diagnostic or injury-prevention advice.</strong> Movement and injury-risk indicators are informational only. Always consult a qualified medical professional before acting on anything the Service reports about your body, and never delay seeking medical advice because of something you read here.',
        'Features described as beta, preview or "cooking" may change or be withdrawn.',
      ],
    },
    {
      id: 'acceptable-use', title: 'Acceptable use',
      short: 'Do not film people without their consent, do not upload footage of other people’s children, and do not use the Service to identify or monitor anyone.',
      body: [
        'You must not use the Service to upload, store, share or generate anything that:',
        { ul: [
          'contains an identifiable person who has not consented to being recorded and analysed;',
          'contains a child other than your own child, or a child for whom you are the coach, guardian or authorised academy, and then only with the consent of that child\'s parent or guardian;',
          'is used to identify, track, monitor, stalk or profile an individual outside ordinary coaching and match analysis;',
          'is obscene, pornographic, paedophilic, or invasive of another person\'s privacy including their bodily privacy;',
          'is harmful to a child, or promotes or depicts harm to a child;',
          'infringes anyone\'s intellectual property, or impersonates another person;',
          'is unlawful, defamatory, harassing or intended to incite violence or hatred.',
        ] },
        'You must also not reverse engineer the Service, scrape it, attempt to extract other users\' data or models, circumvent access controls, or use automated systems against it without our written permission.',
        'We may remove content and suspend accounts that breach this section.',
      ],
    },
    {
      id: 'your-footage', title: 'Your footage and content',
      short: 'Your footage stays yours. You give us permission to process it so the Service can work. Using your footage to train our models is a separate opt-in that you can decline or withdraw.',
      body: [
        'You keep ownership of the video, images and other content you upload or that is captured for you ("Your Content").',
        'You grant us a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, adapt and process Your Content <strong>strictly for the purpose of operating the Service for you</strong> — that is, to analyse it, generate your statistics and highlights, deliver it to you, and back it up. This licence ends when you delete the content or your account, except for copies we must retain by law and routine backups that expire on their normal cycle.',
        '<strong>Training our models is separate.</strong> We will not use Your Content to train or improve our machine-learning models unless you give a separate, specific opt-in for that. You can withdraw that opt-in at any time, and we will stop using your content for training from that point. Withdrawing it does not affect models already trained.',
        'You warrant that you have the rights to upload Your Content and that every identifiable person appearing in it has consented to being recorded and analysed — including, where a child appears, the consent of that child\'s parent or guardian.',
      ],
    },
    {
      id: 'appearing-in-footage', title: 'If you appear in someone else’s footage',
      short: 'If you appear in footage on Lvl-Up and did not agree to it, write to us and we will act. You do not need an account to ask.',
      body: [
        `If you are identifiable in footage held on the Service and you did not consent to it, contact us at <a href="mailto:${EMAIL}">${EMAIL}</a> with enough detail to locate the footage (venue, approximate date and time, and how to recognise you).`,
        'You do not need an account to make this request. We will acknowledge within 24 hours and aim to resolve it within 15 days, and we may restrict access to the footage while we investigate.',
      ],
    },
    {
      id: 'ip', title: 'Our intellectual property',
      body: [
        'The Service, including its software, models, interfaces, design, and the "Lvl-Up Sports" name and marks, belongs to us or our licensors. These terms do not transfer any of it to you.',
        'Aggregated and de-identified statistics — data that cannot reasonably be linked back to you — may be used by us to operate, benchmark and improve the Service.',
        'If you send us feedback or suggestions, we may use them without obligation to you.',
      ],
    },
    {
      id: 'subscriptions', title: 'Subscriptions, pricing and billing',
      short: 'Prices are shown inclusive of GST before you pay. Subscriptions renew automatically until you cancel, and you can cancel in the same number of steps it took to subscribe.',
      body: [
        'Paid plans are described at the point of purchase. The total price is displayed in a single figure inclusive of GST and any other applicable charges before you confirm. We do not add charges later in the flow.',
        'Subscriptions renew automatically at the end of each billing period at the then-current price until you cancel. Where we collect recurring card payments in India, the payment mandate is set up with additional factor authentication and you will receive a pre-debit notification at least 24 hours before each charge, with the option to decline that charge, in line with Reserve Bank of India requirements.',
        'If a free trial requires payment details, we will tell you clearly before the trial starts, tell you when it ends, and you may cancel before it converts.',
        '<strong>Cancelling is straightforward.</strong> You can cancel from your account settings in no more steps than it took to subscribe. If you bought through the Apple App Store or Google Play, you cancel in that store\'s subscription settings — we cannot cancel a store subscription for you.',
        'We may change prices with at least [NOTICE PERIOD] notice before the change applies to your next renewal.',
      ],
    },
    {
      id: 'refunds', title: 'Cancellation and refunds',
      body: [
        'Cancellations and refunds are dealt with in our <a href="/refunds">Return &amp; Refund Policy</a>, which forms part of these terms. It explains the refund window, what is and is not refundable, and the different routes that apply to purchases made on our website, through the Apple App Store, and through Google Play.',
      ],
    },
    {
      id: 'third-parties', title: 'Third-party services',
      body: [
        'The Service relies on third parties including cloud hosting, payment gateways, Apple and Google sign-in, and partner venues. Their terms apply to their parts of the experience, and we are not responsible for their acts or omissions.',
        'Where the app is distributed through the Apple App Store, Apple is not a party to these terms but may enforce them against you as a third-party beneficiary.',
      ],
    },
    {
      id: 'disclaimers', title: 'Disclaimers',
      body: [
        'To the fullest extent permitted by law, the Service is provided <strong>"as is" and "as available"</strong>, without warranties of any kind, whether express or implied, including any implied warranty of merchantability, fitness for a particular purpose, accuracy or non-infringement.',
        'We do not warrant that the Service will be uninterrupted, secure or error-free, that footage will always be captured successfully, or that any result will be achieved.',
        'Nothing in this section limits any right you have as a consumer under the Consumer Protection Act, 2019.',
      ],
    },
    {
      id: 'liability', title: 'Limitation of liability',
      short: 'Our liability is capped, but nothing here removes your rights as a consumer, or our liability for death, personal injury or fraud.',
      body: [
        'To the fullest extent permitted by law, we are not liable for indirect, incidental, special, punitive or consequential loss, or for loss of profit, revenue, data, goodwill or opportunity, however caused.',
        'Our total aggregate liability arising out of or in connection with the Service is limited to the greater of the amounts you paid us in the twelve months before the event giving rise to the claim, or [FLOOR AMOUNT].',
        '<strong>Nothing in these terms excludes or limits our liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for any liability that cannot lawfully be excluded — including your remedies as a consumer under the Consumer Protection Act, 2019.</strong>',
      ],
    },
    {
      id: 'indemnity', title: 'Indemnity',
      body: [
        'You agree to indemnify us against claims, losses and reasonable costs arising from your breach of these terms, and in particular from any claim by a person appearing in footage you uploaded without their consent. This does not apply to the extent the claim results from our own breach or negligence, and it does not apply to you as a consumer where the law does not permit it.',
      ],
    },
    {
      id: 'termination', title: 'Suspension and termination',
      body: [
        'You may stop using the Service and delete your account at any time. We may suspend or terminate access if you materially breach these terms, if required by law, or if continuing would create a security or safety risk — and otherwise on reasonable notice.',
        'Before deletion takes effect you will have a window of [EXPORT WINDOW] to export your data. After that, we delete or de-identify your personal data as described in the <a href="/privacy">Privacy Policy</a>, other than what we must keep by law.',
      ],
    },
    {
      id: 'changes', title: 'Changes to the Service and these terms',
      body: [
        'We may update these terms. If a change is material we will give notice — by email or in the app — at least [CHANGE NOTICE PERIOD] before it takes effect, together with a short summary of what changed, so you can stop using the Service if you disagree.',
        'The effective date at the top of this page always shows the version in force.',
      ],
    },
    {
      id: 'law', title: 'Governing law and disputes',
      short: 'Indian law applies. If you are a consumer, nothing here stops you going to a consumer commission where you live or work.',
      body: [
        `These terms are governed by the laws of India. Subject to the paragraph below, the courts at ${CITY} have exclusive jurisdiction.`,
        'Any dispute may be referred to arbitration under the Arbitration and Conciliation Act, 1996, with the seat at ' + CITY + ' and proceedings in English, before a sole arbitrator.',
        '<strong>Consumers keep their statutory route.</strong> Nothing in this section restricts your right, as a consumer, to bring a complaint before a Consumer Commission under the Consumer Protection Act, 2019, including at the place where you reside or work. Consumer disputes are not subject to mandatory arbitration unless you choose it after the dispute has arisen.',
      ],
    },
    {
      id: 'grievance', title: 'Grievance Officer',
      body: [
        'In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the Consumer Protection (E-Commerce) Rules, 2020 and applicable data protection law, our Grievance Officer is:',
        { ul: [
          'Name: [GRIEVANCE OFFICER NAME]',
          'Designation: [DESIGNATION]',
          `Email: <a href="mailto:${EMAIL}">${EMAIL}</a>`,
          'Phone: [PHONE]',
          'Address: [REGISTERED OFFICE ADDRESS], India',
        ] },
        'We acknowledge complaints within 24 hours, issue a ticket reference, and aim to resolve them within 15 days.',
      ],
    },
  ],
}

export const PRIVACY = {
  title: 'Privacy Policy',
  path: '/privacy',
  lede: 'What personal data Lvl-Up Sports collects, why, how long we keep it, and the rights you have over it.',
  effective: '[EFFECTIVE DATE]',
  updated: '[LAST UPDATED]',
  version: '1.0 (draft)',
  sections: [
    {
      id: 'who', title: 'Who we are and how to reach us',
      body: [
        `${ENTITY} ("we") is the Data Fiduciary for the personal data described here. Registered office: [REGISTERED OFFICE ADDRESS], India. CIN [CIN].`,
        `Questions about privacy: <a href="mailto:${EMAIL}">${EMAIL}</a>, marked for the attention of [DPO / PRIVACY CONTACT NAME].`,
      ],
    },
    {
      id: 'scope', title: 'What this policy covers',
      body: [
        'This policy covers our website, our mobile applications, cameras installed at partner venues, and any analytics we produce from them. It applies whether you have an account or simply joined the waitlist.',
      ],
    },
    {
      id: 'what-we-collect', title: 'What we collect',
      short: 'Account details, your phone number and email, the video captured of you playing, the body-movement data we derive from it, and basic device information.',
      body: [
        { h: 'You give us' },
        { ul: [
          '<strong>Account data</strong> — name, email address, phone number, password, and the role you pick (player, coach, venue, organiser).',
          '<strong>Social sign-in data</strong> — if you use Google or Apple to sign in, the name and email address that provider shares with us.',
          '<strong>Waitlist data</strong> — your email address and which part of the site you signed up from.',
          '<strong>Support and contact data</strong> — anything you write to us.',
        ] },
        { h: 'We capture or generate' },
        { ul: [
          '<strong>Video footage</strong> of matches and practice, from your device or from cameras at a partner venue.',
          '<strong>Pose and movement data</strong> — the positions of body joints over time, derived from that footage.',
          '<strong>Derived metrics</strong> — shot statistics, court coverage, rally patterns, movement quality and load indicators.',
          '<strong>Technical data</strong> — device type, app version, IP address, and logs needed to run and secure the Service.',
        ] },
        'We do not store card numbers. Payments are handled by [PAYMENT GATEWAY NAME]; we receive only a transaction reference and its status.',
      ],
    },
    {
      id: 'video-and-body-data', title: 'Video, pose and body data',
      short: 'Footage of you and the movement data taken from it are the most sensitive things we hold. We treat them that way.',
      body: [
        'Video that shows a recognisable person, and the pose and biomechanical data derived from it, deserve a higher standard of care than ordinary account data. We treat them as sensitive personal data and apply the strictest handling we operate, regardless of how they are classified from time to time under Indian law.',
        'Where it is technically possible, we minimise what is retained — extracting movement data and reducing or discarding raw footage rather than keeping everything indefinitely. Retention periods are set out in the retention section below.',
        'Where cameras operate at a partner venue, that venue displays notice of recording at the court. We and the venue agree in writing which of us is responsible for what. Capture is aimed at the playing area rather than spectator areas.',
        'If you appear in footage and did not agree to it, you can ask us to remove it — see <a href="/terms#appearing-in-footage">the Terms</a>. You do not need an account to ask.',
      ],
    },
    {
      id: 'why', title: 'Why we use it',
      body: [
        { ul: [
          'To create your account, sign you in, and verify your email and phone number.',
          'To produce the analysis, statistics, comparisons and highlights the Service exists to provide.',
          'To keep the Service secure, prevent abuse, and investigate incidents.',
          'To answer your messages and provide support.',
          'To take payment and meet our tax and accounting obligations.',
          'To tell you about launches and product news, where you asked us to.',
        ] },
        'We rely on your consent for these purposes, except where we are permitted or required to process data on another legal basis under the Digital Personal Data Protection Act, 2023 — for example to comply with a legal obligation.',
      ],
    },
    {
      id: 'model-training', title: 'Using footage to improve our models',
      short: 'We only train our models on your footage if you separately opt in. It is off unless you turn it on, and you can turn it off again.',
      body: [
        'Improving our computer-vision models is a distinct purpose from delivering the Service to you, so it gets its own consent. It is <strong>off by default</strong>.',
        'If you opt in, we may use your footage and derived data to train and evaluate our models. You can withdraw at any time in your settings; we stop using your data for training from that point, though we cannot retract models that have already been trained.',
        'We never use footage of a user we know to be under 18 for model training.',
      ],
    },
    {
      id: 'children', title: 'Children and junior athletes',
      short: 'Under-18 players may only be on Lvl-Up through a parent or guardian who has given verifiable consent. We never track, profile or advertise to them.',
      body: [
        'Under Indian data protection law a "child" is anyone under 18. Because junior athletes are central to racket sport, we handle their data under a stricter regime rather than pretending they are not there.',
        { ul: [
          'A child may only be added to the Service by a parent or lawful guardian, who must give verifiable consent before we process any of the child\'s personal data. We take reasonable steps to confirm that the person consenting is an identifiable adult.',
          '<strong>We do not carry out behavioural tracking or monitoring of children.</strong>',
          '<strong>We do not serve targeted advertising to children.</strong>',
          'We do not use children\'s footage to train our models.',
          'A parent or guardian may view, export and delete their child\'s footage and data at any time.',
        ] },
        `To ask about or withdraw consent for a child, write to <a href="mailto:${EMAIL}">${EMAIL}</a>.`,
      ],
    },
    {
      id: 'sharing', title: 'Who we share it with',
      body: [
        { ul: [
          '<strong>Service providers</strong> who host, process or secure data on our instructions, under a written contract — cloud hosting, model inference, email delivery and analytics.',
          '<strong>Payment gateway</strong> — to take payment and process refunds.',
          '<strong>Coaches, academies or venues</strong> — only where you have asked us to share your data with them.',
          '<strong>Authorities</strong> — where we are legally required to disclose.',
        ] },
        'We do not sell your personal data.',
      ],
    },
    {
      id: 'transfers', title: 'Where your data is held',
      body: [
        'Your data is primarily hosted in [DATA HOSTING LOCATION / CLOUD REGION]. Some of our service providers may process data outside India. Where that happens we do so subject to the conditions in the Digital Personal Data Protection Act, 2023 and any restrictions the Government notifies, and we require comparable protection by contract.',
      ],
    },
    {
      id: 'retention', title: 'How long we keep it',
      body: [
        'We keep personal data only as long as the purpose it was collected for is still being served, and then delete or de-identify it.',
        { ul: [
          'Raw video footage — [RETENTION: RAW VIDEO]',
          'Pose and derived metrics — [RETENTION: DERIVED DATA]',
          'Account data — for as long as your account is open, then [RETENTION AFTER CLOSURE]',
          'Waitlist email — until you ask us to remove it, or until launch communications end',
          'Security and access logs — [RETENTION: LOGS]',
          'Payment and tax records — as long as tax law requires',
        ] },
        'Where we are about to erase data because a retention period has run out, we give you advance notice so you can act if you want to keep it.',
      ],
    },
    {
      id: 'security', title: 'How we protect it',
      body: [
        'We apply encryption in transit and at rest, role-based access control, logging and monitoring of access with audit trails, backups, and contractual security obligations on our processors. No system is perfectly secure, but these are the measures we operate and maintain.',
      ],
    },
    {
      id: 'your-rights', title: 'Your rights',
      short: 'You can see your data, correct it, delete it, complain to us, and nominate someone to act for you.',
      body: [
        'You have the right to:',
        { ul: [
          '<strong>Access</strong> — a summary of the personal data we process about you, what we do with it, and who we have shared it with.',
          '<strong>Correction, completion and updating</strong> — fix anything inaccurate or incomplete.',
          '<strong>Erasure</strong> — have your data deleted, unless we are required to keep it.',
          '<strong>Grievance redressal</strong> — complain to us and get an answer.',
          '<strong>Nomination</strong> — nominate another person to exercise these rights on your behalf if you die or become incapable of exercising them yourself.',
          '<strong>Withdraw consent</strong> — at any time, as easily as you gave it.',
        ] },
        `To exercise any of these, write to <a href="mailto:${EMAIL}">${EMAIL}</a> from the email address on your account, telling us which right you want to use. We may ask for enough information to confirm it is you. We respond within [RIGHTS RESPONSE TIME].`,
        'If we cannot resolve your complaint, you may complain to the Data Protection Board of India. We ask that you raise it with us first, as the law expects our own grievance process to be used before the Board is approached.',
      ],
    },
    {
      id: 'deletion', title: 'Deleting your account',
      body: [
        'You can delete your account and its associated data from your account settings, or by writing to us at ' + `<a href="mailto:${EMAIL}">${EMAIL}</a>.`,
        'A public deletion request page is available at [ACCOUNT DELETION URL] so you can make a request without reinstalling the app.',
        'After deletion we retain only what the law requires — for example payment and tax records — and we tell you what those are on request.',
      ],
    },
    {
      id: 'cookies', title: 'Cookies',
      body: [
        'We use a small number of cookies and similar technologies to keep you signed in, remember preferences and understand how the site is used. You can control these in your browser. [COOKIE DETAIL / LINK TO COOKIE POLICY]',
      ],
    },
    {
      id: 'breach', title: 'If something goes wrong',
      body: [
        'If a personal data breach occurs, we notify the Data Protection Board of India without delay and provide a detailed report within the period the law requires. We also tell affected users directly, in plain language — what happened, what it means for you, what we have done about it, and what you should do.',
      ],
    },
    {
      id: 'changes-privacy', title: 'Changes to this policy',
      body: [
        'We will post any change here and update the effective date. If a change is material we will tell you directly before it takes effect.',
      ],
    },
  ],
}

export const REFUNDS = {
  title: 'Return & Refund Policy',
  path: '/refunds',
  lede: 'How cancellations and refunds work for Lvl-Up Sports subscriptions, including purchases made through the app stores.',
  effective: '[EFFECTIVE DATE]',
  updated: '[LAST UPDATED]',
  version: '1.0 (draft)',
  sections: [
    {
      id: 'scope-refunds', title: 'What this policy covers',
      short: 'Lvl-Up sells digital subscriptions, not physical goods, so there is nothing to post back. This page is about cancellations and refunds.',
      body: [
        'We provide digital services on subscription. No physical goods are shipped, so there are no returns in the postal sense. Where hardware is supplied to a venue under a separate agreement, that agreement governs its return.',
      ],
    },
    {
      id: 'statutory', title: 'Your rights come first',
      body: [
        'Nothing in this policy limits your rights under the Consumer Protection Act, 2019 or any other law that applies to you. Where this policy is more generous than the law, this policy applies.',
      ],
    },
    {
      id: 'pricing', title: 'Pricing and taxes',
      body: [
        'Prices are shown in Indian Rupees, inclusive of GST, as a single total before you confirm payment, with a breakdown of what makes it up. We do not add charges later in the checkout flow.',
      ],
    },
    {
      id: 'trials', title: 'Free trials',
      body: [
        'If we offer a free trial, we tell you how long it lasts and what happens when it ends before you start. If it converts into a paid subscription we tell you in advance, and you can cancel before you are charged.',
      ],
    },
    {
      id: 'cancelling', title: 'Cancelling',
      short: 'Cancel any time, in no more steps than it took to subscribe. You keep access until the end of the period you have paid for.',
      body: [
        'You can cancel from your account settings at any time. Cancellation stops the next renewal; you keep access until the end of the period you have already paid for. We do not charge a cancellation fee.',
        'If you subscribed through the Apple App Store or Google Play, you must cancel in that store\'s subscription settings — deleting the app does not cancel a subscription, and we cannot cancel a store subscription on your behalf.',
      ],
    },
    {
      id: 'window', title: 'Refund window',
      short: 'We offer a [REFUND WINDOW]-day refund on a first subscription. That is something we choose to give you, not a legal cooling-off period.',
      body: [
        'If you are unhappy with a new subscription, tell us within [REFUND WINDOW] days of the first charge and we will refund it.',
        'India does not have a statutory cooling-off period for digital services. This window is a contractual commitment we make voluntarily, and it sits on top of your legal rights rather than replacing them.',
      ],
    },
    {
      id: 'not-refundable', title: 'What we do not normally refund',
      body: [
        { ul: [
          'Subscription periods that have already been substantially used, other than where the Service was deficient.',
          'Renewals after the refund window has passed, though you can cancel to prevent the next one.',
          'Plans bought at a promotional or heavily discounted rate, where this is stated at purchase.',
          'Accounts terminated for a serious breach of the <a href="/terms">Terms of Service</a>.',
        ] },
        'This is not an absolute exclusion. If the Service did not do what it promised, the next section applies.',
      ],
    },
    {
      id: 'deficiency', title: 'If the Service does not work',
      short: 'If we failed to deliver, you get your money back — full or pro-rata — regardless of the refund window.',
      body: [
        'Where there has been a deficiency in the service — for example a sustained outage, a failure to capture or process footage we agreed to capture, or a billing error — we will refund you in full or on a pro-rata basis as appropriate, whether or not the refund window has passed.',
      ],
    },
    {
      id: 'how-to-request', title: 'How to ask for a refund',
      body: [
        `Email <a href="mailto:${EMAIL}">${EMAIL}</a> from the address on your account with your name, the plan, the approximate date of the charge and what went wrong.`,
        'We acknowledge every request within 48 hours with a ticket reference you can use to track it, and we aim to decide within [REFUND DECISION TIME] and in any case within one month.',
      ],
    },
    {
      id: 'how-paid', title: 'How and when you get the money',
      body: [
        'Approved refunds go back to the original payment method. Once we process a refund it typically takes [REFUND PROCESSING TIME] working days to appear, depending on your bank or card issuer. We do not reimburse foreign exchange differences or bank charges outside our control.',
      ],
    },
    {
      id: 'apple', title: 'Purchases through the Apple App Store',
      short: 'Apple handles all App Store refunds. We are not able to issue one.',
      body: [
        'If you subscribed through the Apple App Store, Apple — not us — processes the payment and any refund. We cannot issue, approve or refuse a refund for an App Store purchase.',
        'Request a refund through Apple at <a href="https://reportaproblem.apple.com" target="_blank" rel="noreferrer">reportaproblem.apple.com</a>, and manage or cancel the subscription in your device settings. If Apple declines and you believe the service was deficient, still write to us and we will help where we can.',
      ],
    },
    {
      id: 'google', title: 'Purchases through Google Play',
      short: 'Google refunds within 48 hours of purchase. After that, come to us and this policy applies.',
      body: [
        'If you subscribed through Google Play, you can request a refund directly from Google within 48 hours of the purchase.',
        `After 48 hours, Google directs you to the developer — contact us at <a href="mailto:${EMAIL}">${EMAIL}</a> and we will apply this policy. Cancel or manage the subscription in the Play Store\'s subscriptions screen.`,
      ],
    },
    {
      id: 'chargebacks', title: 'Chargebacks',
      body: [
        'If something looks wrong on your statement, please contact us before raising a chargeback — it is almost always quicker. We may suspend an account while a chargeback is being investigated.',
      ],
    },
    {
      id: 'escalation', title: 'If you are still not happy',
      body: [
        'Contact our Grievance Officer, [GRIEVANCE OFFICER NAME], at ' + `<a href="mailto:${EMAIL}">${EMAIL}</a> or [PHONE]. We acknowledge within 24 hours and aim to resolve within 15 days, and in any event within one month.`,
        'You may also contact the National Consumer Helpline on 1915, or approach the appropriate Consumer Commission — including where you live or work.',
      ],
    },
  ],
}

export const DOCS = { terms: TERMS, privacy: PRIVACY, refunds: REFUNDS }
