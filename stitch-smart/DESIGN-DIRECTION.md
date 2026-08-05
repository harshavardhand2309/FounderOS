# Stitch Smart — Website Design Direction

**Status:** Research complete, direction proposed. Product not yet confirmed by client.
**Date:** 4 August 2026
**Basis:** Five parallel research streams — award-winning fashion sites, interaction/motion
patterns, technical stack economics, B2B fashion-tech competitive landscape, 2026 design
direction. Full digests in `research/`.

---

## 0. The one thing that must be confirmed first

Public-record research located the company but **not the product**.

| Fact | Evidence |
| --- | --- |
| STITCHSMART DIGITAL PRIVATE LIMITED | CIN `U62099TZ2025PTC036073`, incorporated 16 Sep 2025 |
| Registered office | Periyakuyilai, Coimbatore South, Tamil Nadu 641201 |
| Classification | NIC `62099` — IT & computer services, **not** apparel manufacturing |
| Location significance | Inside the Coimbatore–Tiruppur knitwear cluster, India's largest garment-export belt |
| `stitchsmart.ai` | Does not resolve — no A record |
| Public presence | No Crunchbase entity, no LinkedIn company page, no press coverage |
| GitHub org `stitchsmartai` | Created ~Oct 2025. Public repos: `weavesmart-DesignStudio` (JS, pushed through Feb 2026), `weavesmart-assets-test`, `Womania` (TS) |

**The open question: is "WeaveSmart Design Studio" the product?**

This is not a detail. It forks the entire brief:

- **If it is a design tool** — the buyer is a designer or merchandiser. High visual bar, imagery-led,
  the product's own output is the marketing material. Reference model: Raspberry AI.
- **If it is factory-floor software** — the buyer is a production head or plant manager. Density,
  artifacts, numbers, verifiable claims. Reference model: unspun / Carbonfact.

These produce nearly opposite websites. **Everything below assumes the second reading** — that
Stitch Smart sells software into apparel manufacturing — because the NIC classification, the
Coimbatore–Tiruppur location, and the competitive set all point that way. If WeaveSmart is the
product and it is a generative design tool, sections 3, 4 and 6 need revision; the strategy in
sections 1 and 2 survives either way.

---

## 1. The strategic position

Three research findings collide, and the collision is the whole opportunity.

### 1.1 Manufacturing process is the most award-winning subject matter in fashion

Not a trend observation — a pattern across a decade of winners:

| Site | Award | What it did |
| --- | --- | --- |
| **Lacoste — Polo Factory** | Awwwards SOTD, 21 Jul 2026 | The production line *is* the navigation model. Scroll drives "visual machines," one per manufacturing stage: thread → knit → crocodile → finishing |
| **45R — Denim Karuta** | Awwwards SOTD, 30 Mar 2025 | 30+ years of denim craft taught through a playable Japanese poetry card game |
| **Loro Piana — Workshop of Wonders** | Awwwards HM, 28 Dec 2024 + FWA case | Lifelike cashmere simulation; QR-triggered WebGL quest linked to 36 Harrods windows |
| **X-BIONIC TerraSkin** | Awwwards SOTD, 8 Nov 2024 + Dev Award | A technical spec sheet narrated as an immersive scroll |
| **Luxury fabrics house** | Awwwards HM | 3D suit configurator + "initiatory journey through fabric manufacturing" |

### 1.2 B2B textile and apparel-manufacturing is the weakest award category

Most entries top out at Honorable Mention or Nominee. **Yarnity — a *concept* site for a Sri Lankan
yarn manufacturer — cleared the Awwwards bar** (HM, 22 Oct 2025). A concept, for a yarn mill.

The one real proof the ceiling is higher: **21 TSI** (sports-industry B2B) took Awwwards SOTD
+ Developer Award, 12 Apr 2025, plus CSSDA and FWA, with a published Codrops case study titled
*"Beyond the Corporate Mold."* A B2B site sweeping three award platforms, with its process
documented. That is the blueprint.

### 1.3 Stitch Smart is a software company physically inside a garment-manufacturing cluster

### The synthesis

> **The single most award-winning subject matter in fashion is the thing B2B manufacturing
> companies already own — and almost none of them are executing on it. Stitch Smart sits inside
> the source material.**

This is structural whitespace, not a trend to follow. And the raw material — real cutting rooms,
real sewing lines, real fabric stores in Tiruppur and Coimbatore — is imagery no Western competitor
can obtain at any price.

---

## 2. The tension this direction has to resolve

Two research streams point in opposite directions. Naming the conflict precisely is what makes the
direction defensible.

**Awwwards scores Design 40% / Usability 30% / Creativity 20% / Content 10%**, judged by a minimum
of 18 jurors with the 3 furthest-from-average scores discarded, over a 5-day voting window.

Three consequences most teams get wrong:

1. **Design + Usability = 70%.** The platform does *not* reward wild experiments. It rewards
   beautiful *and usable*, with creativity as tiebreaker.
2. **The outlier-discard rule punishes polarization.** A divisive site loses its champions along
   with its detractors and collapses toward the middle. You need 15 people to broadly agree, not
   3 to be evangelists. This kills brutalism and anti-design as an awards strategy.
3. **Content is only 10%** — substance is barely scored, which explains the category's drift
   toward spectacle.

But the *buyer* pulls the other way. Merchandisers, production planners and factory owners read
spec sheets for a living. They are comfortable with density and mildly suspicious of vast
whitespace. The Awwwards-fashion instinct — 14vw type, oceanic margins, one idea per screen — is
wrong for this audience.

### The resolution

**Not a spectacle site. A site that is immaculately designed at high density, built from the
industry's own artifacts.**

Think a Bloomberg terminal crossed with a Japanese pattern-drafting manual. Real tables, visible
rules, tight leading, a genuine typographic grid — executed with the precision that reads as craft
to a jury and as competence to a factory owner. Nobody in this category has attempted it.

This also happens to be consensus-friendly rather than polarizing, which the scoring math rewards.

---

## 3. The design thesis: the marker is the hero

Apparel generates some of the most beautiful technical documents in any industry, and **not one
site in the entire competitive research uses them.**

The **marker** (lay plan) — irregular pattern pieces nested at maximum density to minimize fabric
waste — is:

- genuinely gorgeous abstract geometry
- literally the image of manufacturing efficiency
- literally what the software optimizes
- instantly legible to a factory owner in Tiruppur
- completely novel to a design jury
- **used by nobody**

### How the marker propagates through the system

| Surface | Application |
| --- | --- |
| **Hero** | A live marker, nesting in real time. Efficiency percentage climbing as pieces settle. This is the product's value proposition rendered as its own visual identity. |
| **Grid system** | Section geometry derived from marker nesting logic — asymmetric, tight, deliberately irregular but systematic. Not a 12-column bootstrap grid. |
| **Section dividers** | Cutting lines, notches, grainline arrows |
| **Loading / empty states** | Pattern pieces settling into place |
| **404** | A marker that failed to nest |
| **Ornament** | Notches, drill holes, seam allowance dashes, grade-rule increments |

### The wider artifact vocabulary

Beyond the marker, all unclaimed: the **pattern piece** (notches, grainline, seam allowance), the
**grade rule table**, the **size run**, the **operation bulletin / SMV breakdown**, the
**line-balance pitch diagram**, the **shade band**, the **lab dip**, the **strike-off**, the
**trim card**, the **Pantone TCX chip**, the **fit comment sheet with red-pen markup**, the
**cut ticket**, the **bundle card**.

---

## 4. Palette, typography, imagery

### Palette — cream, white, gold

Derived from the logo (client-specified). It lands in unclaimed territory: every competitor is
either **sterile cold** (blue / black / purple) or **sustainability sage**. Nobody owns the palette
of actual textiles, and cream reads "greige" and "undyed cotton" pre-cognitively.

```
Paper white     #FCFAF5    the sheet, the spec, the light
Cream           #F4EEE1    the ground — greige, unbleached
Kraft           #E2D8C1    packaging, trim cards, secondary surfaces
Leaf gold       #C9A227    fills, rules, chips, ornament — NEVER type
Deep gold       #9C761A    the only gold that may carry type
Ink             #1C1A15    type, rules, structure
```

> **Provisional.** Sampled from the description "cream white gold," not from the logo file. These
> become exact once the asset is supplied.

**Two golds, and the reason matters.** Leaf gold on cream is roughly **2.6:1** — it fails WCAG AA
for text at any size (4.5:1 normal, 3:1 large). Deep gold clears 4.5:1 on cream and is the one that
may carry type. Collapsing them into a single "brand gold" is the most likely accessibility failure
in this palette, and it is the specific mistake this split exists to prevent.

**A tension worth naming.** Gold is a *luxury* signal, not an industrial one. It pulls against the
dense technical spec-sheet register argued for in §2. Two ways to resolve it, and the choice
depends on the answer to §0:

1. **Gold as metal, not ornament** — treat it the way a trim card or a metal garment fitting reads:
   sparse, functional, structural. Hairline rules, chip marks, the single accent on a data figure.
   This keeps the technical register intact and is the recommended path for factory-floor software.
2. **Gold as luxury** — lean premium and brand-side, which would mean revisiting the density
   argument entirely. Appropriate only if the buyer is brand-side rather than production-side.

The direction assumes (1). Note also that dark-mode-purple is not the only contaminated default —
**cream + serif + gold is close to the "warm cream editorial" look now common in AI-generated
design.** The escape is register, not hue: technical drawing rather than magazine spread, monospace
carrying data rather than a serif display headline, hairline rules rather than soft shadows.

### Typography — serif display + technical mono, both doing real work

- **Serif display** for editorial voice and headline architecture
- **Technical monospace** for SMV values, size runs, efficiency percentages, timestamps, SKUs,
  micro-labels — the aesthetic quotation of a garment tag and a spec sheet

The mono must carry **actual data**, never decoration. `font-variant-numeric: tabular-nums` on
every number so figures don't jitter on filter or hover changes.

**Variable-font axis animation on scroll** (`@property` + `animation-timeline`) is one of the few
techniques the research flags as still genuinely fresh, because it requires a licensed variable
font and therefore stays out of template-land.

### Imagery — real factory floors, shot properly

The category's current options are renders, Western studio stock, or CSR-brochure factory photos.
**Nobody has commissioned serious art direction on a real production floor** — the cutting room,
the sewing line, the finishing section, the fabric store — shot the way Anduril shoots hardware or
an industrial photographer shoots a shipyard.

This is the strategic moat. It is unfakeable, unbuyable, and unmistakably Stitch Smart's.

### What this deliberately avoids

The research is emphatic that **simulated craft is the new template**. Elizabeth Goodspeed's
critique (It's Nice That): faking realness on a computer gets you nowhere; "handcrafted" has
stopped describing how something was made and now only describes how an image wants to be read.

**A CSS grain overlay in 2026 is the purple gradient of 2022.** The answer is not texture filters.
It is real material, captured at a fidelity nobody can fabricate. A fashion-manufacturing company
has access to physical reality that most categories don't — that access *is* the differentiation.

---

## 5. Motion: state change, not decoration

Motion in this category is universally decorative — parallax, floating orbs, scroll-jacked
carousels. The correct use here is **encoding state change**, because every value proposition in
apparel software *is* a state change:

| From | To |
| --- | --- |
| flat pattern | draped garment |
| marker at 82% efficiency | re-nested to 91% |
| unbalanced line | balanced line (the bar chart evening out) |
| 14 physical samples | 2 |
| 180-day lead time | 21 days |

Scroll-linked transitions on **real artifacts with real numbers**. No parallax, no orb, no
scroll-jack. This satisfies the jury's creativity axis *and* functions as product proof — the same
pixels doing both jobs.

### The one WebGL moment: cloth

Not a hero blob. **One garment, real drape.** The research identifies cloth simulation as
simultaneously the most on-brief effect for fashion and the least commoditised — almost nobody
ships genuine drape.

Three cost tiers, pick by budget:

1. **Blender-baked MDD vertex animation** — cheap, deterministic, works everywhere. *Start here.*
2. **CPU Verlet** — interactive, ~30×30 grid ceiling on mobile
3. **WebGPU compute** — best fidelity, needs a fallback path

This is the concrete technique that executes the "point technology at real craft" thesis. It is
also the only WebGL effect in the research that a competitor cannot clone in an afternoon.

### Cheap differentiator: scroll velocity as input

Map `lenis.velocity` (clamped, smoothed) to skew, bend, or marquee `timeScale` — instead of
mapping scroll *position* to progress. ~15 lines, physically legible, and it immediately separates
you from the CSS-only version of the same component.

---

## 6. Proof strategy

Stitch Smart has **no logos, no case studies, no funding announcement.** Every standard B2B trust
mechanism is unavailable. Two cautionary tales make gloss actively dangerous here:

- **Fashinza** — $100M Series B (2022, ~$300M valuation), IIT Delhi founders, by far the
  brightest and most-designed site in the Indian B2B cohort. Now out of business; Groyyo took the
  segment. Design did not save the unit economics.
- **Zilingo** — collapsed 2023 amid accounting and governance failures.

This market's buyers are wary of polish without substance. So credibility has to come from
**specificity and craft**:

### 6.1 Vocabulary as the credential

The fastest, cheapest way to feel like a fashion company while behaving like a software company is
to write in the industry's own words: **SMV. DHU. OTIF. shade band. lay plan. cut-to-ship. line
balancing. grade rule. lab dip. cut ticket.**

Generic sites throw this away and substitute "efficiency" and "visibility" — a catastrophic trade.
**Jargon is free credibility; adjectives cost trust.**

### 6.2 Numbers, not adjectives

The three best proof lines in the entire research set are pure arithmetic:

- **Zyod:** 21 days vs 180 days. 50 pieces vs 2,000.
- **unspun:** a pair of pants in under 10 minutes, direct from yarn.
- **ZOZO:** 3.7mm average error vs. a laser scanner.

And the best trust device anywhere in the category — **Carbonfact's "audited annually by PwC."**
One verifiable third-party fact beats a hundred claims. For a product whose core buying objection
is *"can I trust your numbers?"*, some equivalent is close to mandatory.

### 6.3 One live, working thing on the homepage

Nothing in this category lets you try anything before a sales call. Everything is "Book a Demo."

A single genuinely functional homepage widget — upload a tech pack and get an SMV estimate, paste
an order and see a line-balance plan, drop a spec and get a cost range — would be **the only one
in the segment** and would carry more persuasion than the entire rest of the page.

---

## 7. Technical direction

All bundle figures below were **measured directly** (npm tarballs, esbuild `--bundle --minify`,
gzip -9, 4 Aug 2026), not quoted from blogs.

### 7.1 Stack

| Layer | Pick | Rationale |
| --- | --- | --- |
| Framework | **Astro 7** | Discrete heavy moments, not one continuous cross-route canvas. Ships zero JS by default; heavy work becomes an island. (Cloudflare acquired Astro on 16 Jan 2026 — durability signal.) |
| CMS | **Sanity** | Structured content fits lookbooks/case studies; best art-directed media handling. **Payload** if self-hosting matters more. |
| Hosting | **Cloudflare** | Cheapest egress, and now Astro's corporate home |
| Video | **Mux / Cloudflare Stream** | Never the web host. Adaptive bitrate + AV1 ladder, predictable cost |
| Smooth scroll | **Lenis** (5.2 KB) | Wraps native scroll — sticky, anchors, find-in-page all keep working |
| Choreography | **GSAP + ScrollTrigger** (44.1 KB) | Free since 30 Apr 2025 |
| UI motion | **Motion** w/ `LazyMotion` + `m` (26.6 KB) | MIT. `MotionConfig reducedMotion` is free accessibility |
| WebGL | **OGL** (15.1 KB) | 8× smaller than Three.js for shader-on-plane work |
| Images | AVIF → WebP → JPEG via `<picture>`, `sharp` at build | Fashion gradients band visibly in WebP; AVIF doesn't |

### 7.2 The measured argument for OGL over Three.js

| Import | gzip |
| --- | ---: |
| `three` — minimal real scene (renderer, scene, camera, mesh, plane, shader, texture) | **127.8 KB** |
| `three` — typical (`import * as THREE` + GLTFLoader + OrbitControls + EffectComposer) | 200.8 KB |
| `@react-three/fiber` + three, minimal `<Canvas>` | 235.2 KB |
| **`ogl` — minimal scene** (Renderer, Camera, Transform, Program, Mesh, Plane, Texture) | **15.1 KB** |

Three.js **cannot be meaningfully tree-shaken** — importing only `Vector3` and `Matrix4`, pure math
with no renderer, still costs 53 KB gzip. Budget for the whole library or don't use it.

Full stack comparison:

| Stack | gzip |
| --- | ---: |
| React 19 + react-dom baseline | 58.8 KB |
| + GSAP + ScrollTrigger + SplitText + Lenis | 110.7 KB |
| + minimal Three.js scene | **238.4 KB** |

The canonical award-site payload is **~240 KB gzipped before a single line of application code.**
Swapping Three.js for OGL and lazy-loading it takes initial JS from 238 KB to **111 KB** — a 53%
cut with zero visible difference.

**Budget: under 120 KB gzip initial, WebGL dynamically imported after first paint.**

Use Three.js *only* if the cloth simulation demands real 3D lighting and GLTF loading. That is a
legitimate reason — just make it a deliberate, lazy-loaded decision rather than a default.

### 7.3 GSAP licence — act on this

GSAP 3.15.0 (published 2026-04-13) ships **every former paid Club plugin** in the public npm
package — SplitText, ScrollSmoother, MorphSVG, DrawSVG, Inertia, Flip, Observer, Draggable,
CustomEase, Physics2D. The `gsap-trial` package is formally deprecated. Cost today: **$0.**

Three caveats:

1. **"Free" ≠ open source.** GSAP is proprietary, not MIT, not OSI-approved. The terms exist only
   at a URL Webflow controls. **There is no LICENSE file in the npm tarball.**
   → *Snapshot the full licence text into the repo on the day of adoption, with a date.*
2. **Webflow ran layoffs on 27 May 2026** (~140 roles). No evidence GSAP was affected, and releases
   continue — but a proprietary library owned by a company in cost-cutting mode is a bus factor
   worth naming. The licence does not permit a community fork.
3. Budget nothing, but don't architect as if the licence were irrevocable.

### 7.4 Avoid

- **Theatre.js** on any critical path — all packages stuck at v0.7.2, last published 2024-05-19,
  **26 months without a release**
- **Locomotive Scroll v4** — dead; faked scroll with transforms and broke sticky, anchors, and
  find-in-page. (v5 is a thin declarative wrapper around Lenis and is fine.)
- **Contentful** — steepest entry price for no benefit at this stage
- Any hero that cannot render something meaningful without JavaScript

---

## 8. The strategic award target: Mobile Excellence

The **Mobile Excellence Award** (Awwwards in collaboration with Google) is the best
effort-to-reward ratio available:

- Scored by a **dedicated mobile panel**, not the main jury
- Four criteria: Mobile Friendliness, Performance, Best Practices/PWA, Usability
- **≥75/100 earns the badge regardless of whether the site wins Site of the Day**
- It is a **fixed threshold, not a competition**

And critically: **the entire WebGL-showpiece cohort is structurally bad at it.** Those sites are
desktop-first by construction and get punished on Performance.

A density-first, artifact-driven, sub-120 KB site is *naturally* good at exactly this. The
direction in this document and the most winnable award on the board point the same way.

Mobile principles: don't port the desktop WebGL scene — ship a genuinely different mobile
experience. Cap `devicePixelRatio` at 1.5–2. Pause the render loop off-screen and on
`visibilitychange`. Ship a pre-rendered AV1 video of the cloth effect on touch devices.

---

## 9. Performance and accessibility guardrails

Non-negotiable, from the technical research:

1. **Ship the LCP image un-animated.** No shader reveal, no split-text, no fade on the element
   Core Web Vitals is timing. The poster image is the LCP element — always; the video is
   progressive enhancement.
2. **Preload it:** `<link rel="preload" as="image" fetchpriority="high">`. Note `fetchpriority`
   works only on real `<img>` and `rel=preload` — not CSS backgrounds, not `<video>`. If the hero
   is a CSS background, it cannot be prioritised.
3. **`prefers-reduced-motion` is a designed variant, not a fallback.** Destroy Lenis outright
   (`lenis.destroy()`), don't shorten durations. **Lenis ships zero reduced-motion handling** —
   verified by grepping the shipped module. Two lines fix it, and almost nobody adds them.
4. **Instrument INP first.** LCP can be engineered around with a poster. But a main thread
   saturated by a scroll timeline + rAF loop + WebGL pass will blow past 200 ms on a mid-range
   Android. That is where heavy sites actually die.
5. **Optimise for CrUX field data, not Lighthouse.** A site can score 40 in Lighthouse and pass
   Core Web Vitals, or score 95 and fail.
6. **WCAG 2.2 SC 2.2.2 (Level A):** anything auto-playing and looping >5s needs a pause control.
   That includes the hero video.
7. **European Accessibility Act** (Directive (EU) 2019/882) began applying to e-commerce services
   28 June 2025. **Confirm scope with counsel** if selling into the EU — it changes the definition
   of done.

---

## 10. The kill list

Banned outright — every item is either dead or contaminated by association:

**Category clichés**
1. Measuring tape, needle-and-thread, spool, or scissors as the "fashion" icon
2. The word **"seamless"** — plus "stitching together," "tailored to," "woven into," "the fabric
   of." Pun-driven copy is the fastest way to read as an outsider.
3. Featureless grey mannequin on a gradient
4. Fake dashboard floating in 3D space inside fake browser chrome
5. Grayscale logo wall as the sole proof mechanism
6. Animated stat counters
7. Macro denim-weave close-up as decorative background texture
8. Hands-at-a-sewing-machine stock photo
9. Glowing-brain / neural-mesh "AI" imagery
10. "Trusted by the world's leading brands" (unquantified)
11. Bento grid whose boxes contain icons instead of evidence

**Web design clichés**
12. Dark-mode purple-gradient SaaS look — the most template-coded aesthetic on the web
13. Blurry gradient blobs — now the default background of every AI-generated landing page
14. Abstract 3D blob hero (Spline made these free, which killed them)
15. Heavy glassmorphism — Apple's Liquid Glass backlash contaminated it
16. Borrowed brutalism — the aesthetic of not caring, while selling caring
17. Percentage preloader counters (0→100)
18. Full-page scroll-jacking
19. Fade-up-on-scroll applied to every element
20. Circle cursor with `mix-blend-mode: difference`
21. Constant-speed brand-word marquee
22. PavelDoGreat fluid simulation as page background
23. The 2018 displacement-map image hover
24. Cursor image trails
25. Infinite draggable scattered image canvas (the defining 2024–25 effect, now saturated)

**The underlying test:** nothing on this list died because it stopped working visually. Each died
the moment it became *free* — the moment a template, a Spline preset, or an AI generator could
produce it. Apply that test to anything new.

---

## 11. Naming — flag this early

**"Stitch" is the most saturated morpheme in this category.** Live competitors and collisions:

| Name | What |
| --- | --- |
| **StitchSense** (`stitchsense.ai`) | Closest direct competitor — "Your Co-Pilot for Apparel Manufacturing" |
| **StitchProof** (`getstitchproof.com`) | "Intelligence from Fibre to Fashion" |
| **Google Stitch** (`stitch.withgoogle.com`) | Mainstream AI design tool — will dominate the search term |
| **Stitch Fix** | The category's most famous name |
| STITCH MES, Stitchy, Smart Stitch (NJ) | Further dilution |
| A second **StitchSmart** in India | Direct name collision |

The name provides **zero separation**. The visual identity has to do all the differentiating work —
which argues for a *distinctive* system over a *safe* one, and strengthens the case for the
artifact-driven direction in §3.

### On the closest competitor

StitchSense's copy is genuinely good — it names SMV, line balancing, buyer-specific costing. That
vocabulary is the credential. Their visual identity is a generic dark AI-startup template; swap the
nouns and it's a co-pilot for logistics.

**Beat them on the visual axis. Match them on vocabulary.**

---

## 12. Open questions for the client

1. **Is WeaveSmart Design Studio the product?** (§0 — forks the entire brief)
2. **Who is the buyer** — designer/merchandiser, or production head/plant manager?
3. **What is the one number?** The Zyod/unspun/ZOZO-grade arithmetic proof. Without it, §6.2 has
   nothing to work with.
4. **Is there anything auditable** — a third-party validation, a pilot result, a measured accuracy
   figure — that can play the role Carbonfact's PwC audit plays?
5. **Can we get camera access to a real production floor** in Coimbatore or Tiruppur? This is the
   single highest-leverage asset in the whole direction (§4).
6. **Does the product have a demonstrable slice** that could run live on the homepage? (§6.3)
7. **EU sales?** Determines whether the European Accessibility Act is in scope (§9.7).

---

## Appendix: research provenance and confidence

Five parallel research streams, 4 Aug 2026. Full digests in `research/`.

**A material constraint on all of it:** this environment's egress policy returned **HTTP 403 on
every direct page fetch**, including `awwwards.com`, `creativebloq.com`, `itsnicethat.com` and
`example.com`. Proxy diagnostics confirmed `connect_rejected: gateway answered 403 to CONNECT` —
an organisation policy denial, not a bug.

Consequences:

- **No site was rendered, screenshotted, or DOM-inspected.** Every visual critique of a competitor
  is an informed prior, not fresh observation. **Spot-check in a browser before presenting to the
  client.**
- Award records were reconstructed from search-indexed content *of the award platforms' own pages* —
  stronger than a listicle, weaker than reading the record.
- **The bundle sizes in §7 are the exception** — measured first-party from npm tarballs in this
  session, and reproducible.

**Known gaps to close manually:**

- No direct juror commentary found on what Awwwards judges are tired of seeing
- Awwwards Site of the Year 2025 attribution conflicts across sources (Messenger vs. the Lando
  Norris site by OFF+BRAND) — verify before citing
- Webby *Fashion, Style & Beauty* website winners 2025–26 unverified (gallery behind registration)
- Several award dates conflict — Max Mara Jacket Circle (16 vs 27 Apr 2026), Outfit (11/12/18 May
  2026), Quechua 2025 Lookbook (1 vs 5 May 2025)
- Two sites commonly listed as fashion are miscategorised: **Marsea** is a Corsican aesthetic-
  medicine clinic; **UND NY** is a Japanese bakery. Exclude both.

**Worth knowing:** no fashion site won a 2025 Awwwards annual award. Site of the Year went to
Messenger (a WebGL delivery game); E-commerce of the Year to Scout Motors.
