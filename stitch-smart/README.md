# Stitch Smart — Website

Research and design direction for the Stitch Smart website rebuild.

> **Note on location:** these documents live in the FounderOS repo only because the Stitch Smart
> source repo (`stitchsmartai/SS-website`) is unreachable from this session — cross-owner repo
> adds are not supported, so it could not be cloned, forked, or read. Move this directory into
> the website repo once access exists.

## Contents

| File | Purpose |
| --- | --- |
| [`DESIGN-DIRECTION.md`](DESIGN-DIRECTION.md) | **Start here.** The strategic position, design thesis, technical direction, and open questions for the client. |
| [`research/REFERENCE.md`](research/REFERENCE.md) | Supporting material — award-site reference list, technique catalogue, competitor teardown, Awwwards mechanics, measured bundle data. |

## The short version

**Position.** Manufacturing process is the most reliably award-winning subject matter in fashion
(Lacoste Polo Factory, 45R Denim Karuta, Loro Piana, X-BIONIC). B2B textile and apparel-
manufacturing is simultaneously the *weakest* award category — a concept site for a Sri Lankan
yarn mill cleared the Awwwards bar. Stitch Smart is a software company sitting inside the
Coimbatore–Tiruppur knitwear cluster, i.e. inside the source material. That gap is structural
whitespace, not a trend.

**Thesis.** The **marker** — nested pattern pieces laid out for maximum fabric yield — is gorgeous
abstract geometry, is literally what the software optimises, is instantly legible to a factory
owner, and is used by nobody. Make it the hero, the grid, and the ornament.

**Register.** Not a spectacle site. High density, immaculately set, built from the industry's own
artifacts and vocabulary. Warm textile neutrals, not dark-mode purple. Real factory-floor
photography — the one asset no Western competitor can obtain.

**Motion encodes state change**, never decoration: a marker re-nesting 82% → 91%, a line balancing,
180 days collapsing to 21. One WebGL moment only — real cloth drape.

**Budget:** under 120 KB gzip initial JS, WebGL lazy-loaded. Astro + Lenis + GSAP + OGL.

## Blocking question

Public records place the company (STITCHSMART DIGITAL PRIVATE LIMITED, Coimbatore, incorporated
16 Sep 2025, classified as IT services). The **product** is unconfirmed. The GitHub org's public
repos suggest *"WeaveSmart Design Studio."*

If that is a **generative design tool**, the buyer is a designer and the site should be
imagery-led. If it is **factory-floor software**, the buyer is a production head and the site
should be dense and artifact-driven. These are nearly opposite briefs — the documents here assume
the second. Confirm before building.

## Verification debt

This environment's egress policy returned HTTP 403 on every direct page fetch, so **no competitor
or award site was rendered or inspected.** Award records were reconstructed from search-indexed
content of the award platforms' own pages; visual critiques are informed priors. The measured
bundle sizes are the exception — those are first-party and reproducible. Spot-check anything
visual in a browser before presenting it to the client.
