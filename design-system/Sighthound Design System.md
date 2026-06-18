# Sighthound Design System — Single-File Bundle (v0.9.1)

> 🟡 **v0.9.1 Provisional.** Composition-first design. Imagery is optional supporting context. Use freely internally; don't publish externally as canonical.

Generated 2026-05-20. Self-contained bundle of the entire design system + four UI kits (marketing + 3 products).

**Contents**

1. [Brand guidelines (README)](#1-brand-guidelines)
2. [Operating mode — v0.9.1 provisional](#2-operating-mode)
3. [Authoritative status](#3-authoritative-status)
4. [Decisions log](#4-decisions-log)
5. [Agent skill manifest](#5-agent-skill-manifest)
6. [Design tokens](#6-design-tokens)
7. [UI kit — Sighthound marketing](#7-ui-kit--sighthound-marketing)
8. [UI kit — Sighthound ALPR+](#8-ui-kit--sighthound-alpr-app)
9. [UI kit — Sighthound Redactor](#9-ui-kit--sighthound-redactor-app)
10. [UI kit — Sighthound Video](#10-ui-kit--sighthound-video-app)
11. [Asset manifest](#11-asset-manifest)

---

<a id="1-brand-guidelines"></a>
## 1. Brand guidelines (`README.md`)

# Sighthound Design System — v0.9.1 (Provisional)

> 🟡 **Provisional, internal-use, decisions reversible.** Use freely; don't publish
> externally as canonical. See [`OPERATING_MODE.md`](./OPERATING_MODE.md) for how to keep
> moving without sign-off.
>
> **v0.9.1 (May 2026)** — reframed imagery as optional supporting context rather than a
> primary visual driver. Added composition motifs (grids, schematics, data panels, soft
> gradients) as first-class alternatives to photography. See *Visual Foundations →
> Composition systems* below.

A design system for **Sighthound Inc.** and its sub-brand **Sighthound Redactor**.
Based on the official *Sighthound Brand Guidelines* (April 2022), the *Content Style Guide
v2026.04*, and a May 2026 internal audit of live practice across Slack, sales/proposal
docs, and the production sites.

> **Read first:** [`AUTHORITATIVE_STATUS.md`](./AUTHORITATIVE_STATUS.md) is the audit-of-record. Every
> rule below is annotated there as ✅ Confirmed, ⚠️ Practice not policy, or 🔴 Open gap.
> Items awaiting sign-off live in [`DECISIONS_LOG.md`](./DECISIONS_LOG.md).

---

## About the brand

**Sighthound** is an IoT / computer-vision company that turns video feeds into actionable
data. Their tagline is **"Turning sight into insight."** The greyhound (named **Lucy**,
after the founder's dog) is the mascot — a visual metaphor for keeping things in sight and
tracking them with speed and responsiveness.

### Brand feel (v0.9.1)
The Sighthound design system should feel: **Premium · Calm · Modern · Technical but
approachable · Enterprise-grade · Flexible · Trustworthy · Data-aware · Product-ready ·
Scalable** across software, hardware, marketing, and internal tools. It should feel
recognizably Sighthound *even when no imagery is used*.

> ✅ **Sighthound + Sighthound Redactor are one unified brand**, deliberately connected
> via JSON-LD schema: *"sighthound.com ⟷ redactor.com now read as one brand, not two."*
> Redactor is a sub-brand, not a separate identity.

### Products
| Product | What it is | Site |
|---|---|---|
| **Sighthound ALPR+** | Software — Automatic License Plate Recognition + vehicle make/model/color/generation (MMCG) | sighthound.com/products/alpr |
| **Sighthound Redactor** | Software — AI-powered video, image & audio redaction (faces, plates, audio) for FOIA / GDPR / CJIS workflows | redactor.com |
| **Sighthound Edge Compute** | Hardware — Edge AI compute cameras & nodes; IP67 rugged, made in USA | sighthound.com/products/hardware |
| **Sighthound Video** | Software — Flexible agile Video Management System (VMS) — the original product | sighthound.com/products/sighthound-video |

### Audience
Government, Engineering, and Enterprise — City Traffic Engineers, Retail Store Managers,
Python Developers, Business Developers, Law Enforcement.

### Brand pillars
Easy · Insightful · Data-Driven · Evolving · Connecting · Protecting

### Differentiators
Made in USA · Specialized CV expertise · Outcomes-focused · Free 24×7×365 support · Future-proof (software-defined hardware) · High performance.

---

## Sources used

- **`uploads/Sighthound-BrandGuidelines-Jul12.pdf`** — Official 62-page brand guide (April 2022). Primary visual source of truth.
- **Content Style Guide v2026.04** — internal copy guide. Active.
- **`anti-ai-writing-style.md`** — internal. Active.
- **May 2026 Slackbot audit** — captured verbatim in `AUTHORITATIVE_STATUS.md`. The
  authoritative cross-reference of what's confirmed, what's practice, and what's open.
- **www.sighthound.com** (Squarespace) — product pages, hero imagery.
- **www.redactor.com** (Webflow) — sub-brand visuals.

No codebase or Figma library was provided. For pixel-perfect fidelity, attach those.

---

## Content Fundamentals

**Tone.** *Informal yet polished.* The brand guide puts it explicitly: "We speak human, even
if we are referring to extremely complex technical concepts." Short, honest, solution-oriented.
No arrogance, no "talking at" the reader. Sleeves-up, collaborative.

**Voice traits.** Authentic · Succinct · Approachable · Helpful · A little quirky (the team is
a mix of entrepreneurs, AI researchers and CV scientists — "we might be the oddballs in the
industry, but we're fine with that").

**Person.** Prefers **we/our** (Sighthound) → **you/your** (customer). Collaborative, not
prescriptive. Examples from the sites:
- *"We solve complex edge & visual AI problems at scale."*
- *"Redactor gives you full control over what stays visible, and what gets anonymized."*
- *"Let's chat and see how we can make Sighthound ALPR+ work for you."*

**Case.** Sentence case everywhere except H4 / overlines / running headers which are
ALL CAPS. Titles are Title Case. Logo wordmark is all-lowercase. **✅ Blog and web
headers are sentence case** (Content Style Guide v2026.04). Never use all-lowercase body
copy.

**Product naming (confirmed).**
- ✅ **"Sighthound Redactor"** — proper case in all contexts.
- ✅ **"ALPR+"** — exact form. Never "ALPR Plus", never bare "ALPR".
- ⚠️ Use **"Sighthound ALPR+"** in marketing and product headers; bare **"ALPR+"** is OK
  in dense technical / product-UI contexts.
- ⚠️ Spell out **MMCG** (Make/Model/Color/Generation) on first use.

**Confirmed privacy claim.**
- ✅ *"Sighthound does not collect customer data; all data stays in the customer's
  deployment."* Usable verbatim or paraphrased.

**AI-generated content rule.**
- ✅ *"All AI-generated content must be manually verified."* No auto-publish. (Internal
  rule; no required external-facing disclosure language yet — see `DECISIONS_LOG.md` #13.)

**Copy patterns.**
- Benefit-led, metric-backed: *"Cut Costs by 93%"*, *"Up to 160 FPS on GPU"*, *"Over 2,800 Customers & Partners"*.
- "Made Easy" framing: *"Vehicle & Pedestrian Insights Made Easy."*
- Action verbs in CTAs: **Talk to our team** · **Get started** · **Book demo** · **Start Free Trial** · **Watch Demo** · **Explore Compute Hardware**.
- Checkmark lists for features (3–4 bullets, parallel construction).

**Emoji & gifs.** The brand guide says they "aim to keep things fun, with gifs, puns and
casual writing" — but the production websites use **no emoji**. Treat emoji as internal /
social-only; avoid in product and marketing UI. For icons, use the brand's illustrated
system (see Iconography).

**Examples to emulate.**
- *"The fastest, most accurate, and automated Video Redaction product available today."*
- *"Rugged. Proven Powerful. Made in the USA."*
- *"A privacy tool that works as hard as you do."*

---

## Visual Foundations

### Color
- **Primary:** Blurple `#4f60dc` + White. Per 2022 guide, Blurple drives ~60% of a composition. ⚠️ *Has softened in practice — Redactor reads more navy-forward today. Awaiting sign-off (`DECISIONS_LOG.md` #5).*
- **Secondary:** Dark Navy `#1a1d38` + Neutral Gray `#eff3f7`. ~30%. **All body text is Dark Navy on light backgrounds.**
- **Accents:** Light Orange `#f99f25` · Medium Orange `#f05d22` · Red Orange `#f62470`. Sparingly (~10%) — icons, gradients, illustration pops, key highlights. On orange/pink backgrounds, headings are **white**.
- **Gradients:** Used sparingly (~10%). Freeform or linear, any angle, built from palette colors. Brand gradient runs Blurple → Red Orange.

### ⚠️ Accessibility warning — orange palette is contrast-risky
- **Light Orange `#f99f25` on white** — borderline AA. Use for **large text / decorative only**, not body.
- **Red Orange `#f62470` on white** — **fails AA**. **Never** use for body text.
- **Blurple `#4f60dc` on white** — passes AA at large sizes; borderline for body. Prefer Navy for long-form copy.
- ✅ Navy on white and white on Navy are AA-safe.
- 🔴 We have **not formally committed to a WCAG target level**. Recommended: WCAG 2.1 AA minimum (`DECISIONS_LOG.md` #1).

### Typography
- **Primary:** **Lexend** (Google Fonts). ✅ Confirmed still the brand face.
- **Marketing hierarchy** (per 2022 guide): H1 Lexend Medium 46/1.2 · H2 Lexend Light 32/1.33 · H3 Lexend Light 16/1.5 · H4 Lexend Semibold ALL CAPS 16/1.5 · H5 Lexend Light 18/1.5 · **Body Lexend Regular 16/1.5**.
- **App hierarchy** ⚠️ *practice, not policy:* body is **Lexend Regular 14/1.5** for density. Light 300 is reserved for display type ≥32px. (`DECISIONS_LOG.md` #3)
- **Alternative (email / software):** **Verdana** ⚠️ practice as the fallback for Lexend. Regular ↔ Lexend Light, Bold ↔ Lexend Semibold. (`DECISIONS_LOG.md` #9)
- **Logo wordmark:** **Robofan** — ⚠️ vendor-locked, no license confirmed. Never recreate the wordmark; use the logo files in `assets/`. (`DECISIONS_LOG.md` #8)

### Spacing, radii, shadows
- Rounded corners are generous and modern. **Buttons: 20px radius** per 2022 guide. ⚠️ Practice split: **20px for CTA / marketing**; **8px for compact app controls** (table actions, chips, toolbar). (`DECISIONS_LOG.md` #10)
- Cards: 12px. Inputs: 8px. Pills: 999px.
- Spacing scale is 4/8/12/16/24/32/48/64/96 ⚠️ 4pt grid in practice; no formal 4 vs 8 decision.
- Shadows are soft and navy-tinted (not black) — see `colors_and_type.css`.
- Borders are subtle; navy on interactive hover/focus.

### Imagery & photography

**Core rule.** Imagery should support the content only when it adds specific meaning.
The Sighthound design system should **not** depend on literal photography, traffic visuals,
camera feeds, redaction screenshots, hardware renders, or road imagery to feel branded.
Prefer flexible composition, strong information hierarchy, abstract visual systems,
product UI structure, and placeholder-friendly layouts. Use real imagery only where it
improves understanding, trust, evidence, or product context.

**When imagery genuinely earns its place** (product-specific nuance):
| Product | Imagery is useful for |
|---|---|
| **Sighthound ALPR+** | Live recognition, vehicle events, camera feeds, evidence review |
| **Sighthound Redactor** | Before/after redaction examples, media review, workflow explanation |
| **Sighthound Edge Compute** | Hardware, deployment, edge infrastructure context |
| **Sighthound Video** | Monitoring, playback, camera management, video workflows |

**When imagery is wrong by default** (across all products):
Dashboards · Settings · Analytics · Reports · Onboarding · Admin tools · Documentation ·
Internal tools · Pricing · Forms · Empty states · Navigation · 404s · System screens ·
Auth flows · Marketing pages without a specific subject.

**Treatment rules when imagery does appear:**
- **People:** warm, human, smiling — only when the page is *about* people.
- **Vehicles / expansive views:** bird's-eye, panorama, day-time. Only when the page is *about* mobility, traffic, or geography.
- **Equipment:** product on black laptops / monitors / phones — only when the page is *about* the device.
- **Redactor-specific:** raw footage → redacted, side-by-side. Only when the page is *about* redaction.
- **Avoid:** screenshots of code, low-quality / pixelated images, heavy text overlays, software screenshots without a device mockup.

### Composition systems — first-class alternatives to imagery

A layout should feel recognizably Sighthound **even with no photography**. These motifs
do that:

- **Typography-led.** A confident H1 + supporting H5 + a thoughtful spacing rhythm carries most pages without an image.
- **Data panels.** Tables, KPI tiles, sparklines, status pills — the brand reads through structure and color hierarchy, not pictures.
- **Cards as the unit of layout.** White on Neutral Gray, 12px radius, soft navy-tinted shadow. Stackable, gridable, sortable.
- **Soft gradients.** Blurple → White, or Navy → Blurple at low saturation. Hero backdrops without committing to imagery.
- **The wave.** Signature curved form — any palette color, any opacity, any angle. Used sparingly as accent, not as wallpaper.
- **Detection-grid pattern.** Faint dot or square grid in `--sh-gray-200` over white — references CV/sensor language without literal cameras.
- **Map-inspired patterns.** Topographic line patterns, road-vector lines, low-opacity. References the geographic / mobility domain abstractly.
- **Schematic elements.** Outlined boxes with thin connectors, labelled callouts, isometric line diagrams — the "deployment diagram" feel. Great for hardware, architecture, and integration pages.
- **Icon-led sections.** A primary illustration icon + heading + body is sufficient — no photograph required.
- **Neutral placeholder blocks.** Solid Neutral Gray or Navy 700 panels with caption-style label text. Indicates "here is where evidence/footage/screenshot would live" without forcing one.
- **Product UI structure.** Show a slice of a real product UI (sidebar + content) when teaching how the product works — more informative than stock imagery.

Imagery is one tool. Composition is the system.

### Motion & interaction
- Motion is subtle and purposeful — the Redactor homepage uses a looping product-demo video. No bouncy/playful anim; favor standard `cubic-bezier(0.2, 0, 0.2, 1)` fades and slides at 200–320ms.
- **Hover:** buttons invert (primary → darker blurple; secondary white→navy background); links underline and deepen in blurple. No glow, no scale.
- **Press:** mild darken, no shrink.
- **Focus:** 3px blurple ring at 35% alpha for accessibility.

### Layout & graphic motifs
- **The wave.** The signature graphic element — a flowing curved form that can appear horizontal, angled or vertical. "Innovation, global technology, all-reaching, scanning, futuristic." Can be any palette color or gradient; transparency adjusted to blend.
- **Detection-grid pattern.** A faint dot or square grid using `--sh-gray-200` — the CV-language equivalent of graph paper. Use as section backgrounds at low opacity; never as wallpaper.
- **Map / topo patterns.** Subtle topographic-line patterns at low opacity for sections about deployment, geography, or mobility. Stroke 1px in `--sh-blurple-100` or `--sh-gray-200`.
- **Schematic illustrations.** Outlined diagrams — labelled boxes, thin connectors, isometric line art. The "deployment diagram" feel. 1.75px stroke in Navy or Blurple.
- **Illustrations.** Flat, minimalist, abstract. No more than 3 colors. Subjects: data/charts, cities, highways, parking, infrastructure.
- **Cards.** White surface, 12px radius, soft navy-tinted shadow, thin `#e4e8ef` border. The unit of layout. No colored left-accent.
- **Transparency & blur.** Used most in redacted imagery (the product IS blur); otherwise used lightly over wave / pattern backgrounds.
- **Corner radii.** Buttons (CTA) 20px · Buttons (compact) 8px · Cards 12px · Inputs 8px · Pills 999px.

---

## Sub-brand architecture

✅ **Sighthound + Sighthound Redactor read as one connected brand.** Speaker rules (in
practice — `DECISIONS_LOG.md` #19 for formal architecture):

| Surface | Speaker |
|---|---|
| Product UI + `redactor.com` | **Sighthound Redactor** |
| Legal / footer / billing | **Sighthound, Inc.** |
| Embedded Redactor (partner OEM) | **Branding stripped** |

**Incoming sub-brand:** A new ALPR UI product is being named — current candidates from
All Hounds include **Sighthound Checkpoint**, **Sighthound Beacon**, **Sighthound
Command**. Master-brand descriptor proposal: *"Sighthound Vision AI"*. The 2022 category
lockups (Recognizer, Identifier, Signaler, Sighthound Labs) remain placeholders.
(`DECISIONS_LOG.md` #4)

---

## Iconography

**Primary icons.** Flat illustration style (closer to a small illustration than a line
icon). Orange + navy palette, slightly rounded edges, outline style with a medium stroke
weight. Used only for major products, services, industries. The Redactor feature grid
is the canonical example — see `assets/redactor-icon-*.avif`. ⚠️ **No production SVG
source files exist** for the 2022 guide's primary/secondary icon set (`DECISIONS_LOG.md` #6).

**Secondary icons.** Same design language but applied more freely (list items, benefits,
contact). May use an **orange gradient** with navy or white.

**Emoji?** No, not in production. Brand guide allows gifs/puns in casual internal comms, but
the live marketing sites contain no emoji.

**What's in this project.**
- Product illustrations (hero imagery) — `assets/hero-*`.
- Redactor feature icons (6) — `assets/redactor-icon-*.avif`.
- Compute hardware renders — `assets/sighthound-compute-*.png`.
- Logos (horizontal/white, Redactor sub-brand) — `assets/sighthound-logo-*`, `assets/redactor-logo-*`.
- For UI-level icons, use **Lucide** (`unpkg.com/lucide@latest`) at 1.75 stroke weight,
  `currentColor`. ⚠️ Unblessed but uncontested — recommend formal adoption
  (`DECISIONS_LOG.md` #6). Navy by default, blurple for brand-forward moments, orange
  reserved for primary-icon illustrations.

---

## Index

```
├── README.md                   ← you are here
├── OPERATING_MODE.md           ← v0.9 provisional — how to use w/o sign-off
├── AUTHORITATIVE_STATUS.md     ← audit of every rule: ✅ / ⚠️ / 🔴
├── DECISIONS_LOG.md            ← items awaiting sign-off
├── SKILL.md                    ← Agent Skill manifest
├── colors_and_type.css         ← design tokens + semantic CSS vars
├── assets/                     ← logos, hero imagery, product icons, hardware renders
├── preview/                    ← design-system preview cards (registered in Asset panel)
├── ui_kits/
│   ├── sighthound-marketing/   ← sighthound.com recreation
│   └── redactor-app/           ← Redactor product UI recreation
└── uploads/                    ← source materials (brand guidelines PDF)
```

---

## Open gaps tracked separately

These sit in `DECISIONS_LOG.md` rather than this doc until they're ratified:

- 🔴 WCAG target level + AA-safe palette audit
- 🔴 Semantic color mapping (success / warning / danger / info)
- 🔴 Dark mode palette
- 🔴 Motion & animation spec
- 🔴 Data visualization palette
- 🔴 Partner / OEM white-label rules
- 🔴 Compliance copy kit (accuracy, privacy, footer legal)
- 🔴 Error & empty-state voice patterns
- 🔴 External AI-disclosure language
- 🔴 Sub-brand architecture diagram + ALPR UI product naming
- 🔴 Wave graphic canonical SVGs + usage rules
- 🔴 Photography DAM
- 🔴 Robofan licensing
- 🔴 Email signature + deck / whitepaper templates
- ⏸️ Localization (deferred)

---

## Caveats

- **Guidelines are from April 2022** and have not been formally updated. This system is
  effectively becoming the operational reference. See `AUTHORITATIVE_STATUS.md` for the
  status of every decision.
- **Robofan** (logo wordmark typeface) is vendor-locked — never recreate the wordmark.
- **No codebase / Figma provided** — UI kits are built from live-site observation +
  brand tokens.
- **UI icons** use Lucide as a stand-in for the (non-existent) internal icon set.
- **Orange accents fail or barely-pass AA on white** — use sparingly and never for body
  text. Formal a11y commitment pending (`DECISIONS_LOG.md` #1).


---

<a id="2-operating-mode"></a>
## 2. Operating mode (`OPERATING_MODE.md`)

# Operating Mode — v0.9.1 Provisional

This design system is in **provisional v0.9**. Use it freely. Decisions are reversible.

## What this means

- **Internal use is fully unblocked.** Any team can adopt the tokens, components, and
  copy rules today. The Content Relay migration is already shipping on this system.
- **External publication is not.** Don't push this as canonical to:
  - Public-facing brand or partner docs
  - Figma libraries shared outside Sighthound
  - Vendor / OEM handoffs
  - Marketing collateral framed as "Sighthound's official design system"
- **Decisions are reversible.** Anything in this repo can be changed by editing a file
  and merging. There's no parallel canonical document to keep in sync.

## How to keep moving

### 1. Code-in defensible defaults; don't wait
Every entry in `DECISIONS_LOG.md` already has a working default in the system. Build on
those. If leadership later picks differently, swap the value in one place. Most decisions
boil down to a single token or string.

### 2. Signal provisional in your work
When using the system in PRs, Slack, or commits, frame it as:

> *"Per the current design system (v0.9, pending sign-off on $TOPIC)."*

This protects you if a decision flips later, and creates a quiet paper trail that
leadership *had* the chance to weigh in.

### 3. Let practice become policy by accumulation
After ~3 months of unchallenged production use, the open questions answer themselves.
Formal sign-off then becomes a rubber stamp, not a gate.

### 4. Only escalate when something *actually* blocks
| Open gap | Becomes blocking when… |
|---|---|
| WCAG target | Sales pitches a gov RFP that asks |
| Semantic colors | Someone proposes a competing mapping |
| App type spec (14px) | Marketing leadership reviews the app |
| ALPR UI sub-brand | ~30 days before product launch |
| Robofan licensing | A new lockup is needed |
| Wave SVGs | A designer needs the source to remix |
| Photography DAM | We hit the same scrape twice in a quarter |
| Compliance copy | Legal flags a contract clause |

Everything else: ship and adjust.

### 5. One champion per gap, not a four-way meeting
Don't try to assemble Roger + Brent + Ryan + Julianna into one sign-off. Hand each open
question to the one person who already cares about it. A thumbs-up in Slack counts.
A drive-by hallway "yeah, that's fine" counts. The chain of small yeses is more durable
than the one big ratification meeting.

## Working placeholders to use today

When you need to write the thing **right now** and don't have a ratified answer:

| Need | Use this placeholder | When real, swap to |
|---|---|---|
| WCAG target | Build to **AA 2.1** | Whatever leadership picks |
| Success status color | `#1f9d55` green | TBD |
| App body type | **Lexend Regular 14/1.5** | TBD |
| ALPR UI product name | **"ALPR UI"** (literal placeholder) | Checkpoint / Beacon / Command / TBD |
| AI disclosure copy | *"Generated with AI assistance and reviewed by a human."* | TBD ratified copy |
| Compliance footer | *"© Sighthound, Inc. Data stays in your environment."* | Full kit when ready |
| Email font | **Verdana** as Lexend fallback | TBD |
| UI icons | **Lucide** at stroke 1.75 | Internal sprite if commissioned |

## Editing this system

The same rules that apply to code apply here:
- **Propose a change** by editing the relevant file and explaining the reasoning in the
  PR / commit.
- **Disagree?** Edit `DECISIONS_LOG.md` and open a row. Don't ambush people with breaking
  changes to `colors_and_type.css`.
- **No silent overrides.** If a project deviates from the system, document why in that
  project's README.

## Versioning

- **v0.9** — Initial provisional release, internal-use, decisions reversible.
- **v0.9.1** *(current, May 2026)* — Imagery reframed as optional supporting context.
  Composition motifs (detection grid, map patterns, schematics, data panels, soft gradients)
  added as first-class alternatives to photography. Product naming updated:
  *Sighthound Hardware → Sighthound Edge Compute.*
- **v1.0** — graduates when the four top-priority items in `DECISIONS_LOG.md` (WCAG,
  semantic colors, app type, ALPR sub-brand) are signed off. Not before.

That's it. Use it, edit it, move fast, fix what breaks.


---

<a id="3-authoritative-status"></a>
## 3. Authoritative status (`AUTHORITATIVE_STATUS.md`)

# Authoritative Status

Audit-of-record for every Sighthound Design System decision, based on a May 2026 Slackbot AI
review of internal sources (Slack, brand guidelines PDF, Content Style Guide v2026.04,
website schema, sales/proposal docs, video production briefs).

> **v0.9.1 update (May 2026):** Imagery reframed as optional supporting context, not a
> primary visual driver. Composition motifs (detection grid, topo, scan, soft gradients)
> added as first-class. Product naming aligned: *Sighthound Hardware → Sighthound Edge
> Compute.* See section 7 below.

## Legend
- ✅ **Confirmed** — explicit reference in an internal doc or active Slack record.
- ⚠️ **Practice, not policy** — actively used, but no formal sign-off. Documented here.
- 🔴 **Open gap** — needs a cross-functional decision before we treat it as canonical.

---

## 1. Brand evolution since 2022
- ⚠️ The April 2022 PDF remains the only formal brand guide.
- ✅ **Sighthound + Redactor are one brand**, deliberately unified via JSON-LD schema:
  *"sighthound.com ⟷ redactor.com now read as one brand, not two."*
- ⚠️ Redactor's navy-dominant treatment is intentional product-UI drift, not a formal
  sub-brand deviation. The 2022 "~60% Blurple" ratio has softened in practice.
- 🔴 **No updated brand-guidelines doc exists.** This design system effectively becomes
  the document. **Needs sign-off from Roger / Brent** on palette ratios before locking.

## 2. Typography
- ⚠️ **Lexend** is still the de facto brand face. No deprecation in any Slack record.
- ⚠️ **App body type spec (14px Regular)** — used in practice for app density. Not approved
  but uncontested. Flagged here as practice.
- ⚠️ **Robofan** — no license or access confirmed. Treat as vendor-locked to logo files
  until Ryan Campbell (legal) confirms otherwise.
- ⚠️ **Fallback chain** — not officially defined. **Verdana** is the de facto email
  fallback. Suggested formal chain: `Lexend → Verdana → Geneva → sans-serif`.
- 🔴 **App type spec + font fallback chain need a formal decision.**

## 3. Iconography
- ⚠️ **No canonical Sighthound icon library / Figma component set / SVG sprite exists.**
- ⚠️ The 2022 guide's primary/secondary illustration icons have **no production SVGs**
  available.
- ⚠️ **No AI/CV concept icons** (detection, redaction, ALPR, edge compute) exist as a set.
- 🔴 **Significant hole.** Two recommended actions:
  1. Formally adopt **Lucide** as the sanctioned UI icon set.
  2. Commission or source the 2022 illustration icons as production SVGs.

## 4. Color — semantic & status
- ⚠️ **No official semantic color spec.** Current mapping in `colors_and_type.css`:
  - Success: `#1f9d55` (invented)
  - Warning: Light Orange `#f99f25`
  - Danger: Red Orange `#f62470`
  - Info: Blurple `#4f60dc`
- ⚠️ **Dark mode** — no official palette. No priority stated.
- 🔴 **Needs sign-off from Brent (product) and Marketing.**

## 5. Voice & tone
- ✅ **Baseline** — *"informal yet polished, human, succinct"* from the 2022 guide is
  actively reinforced by the **Content Style Guide v2026.04** and the
  `anti-ai-writing-style.md` file.
- ⚠️ **Law enforcement / government** — no formal guidance. Practice: professional and
  precise but not stiff. The how-to video brief — *"calm, informed, intriguing…
  documentary narrator"* — is the closest ratified authoritative register.
- ⚠️ **Developer copy** — no spec. Suggested practice: drier and more technical is OK,
  keep contractions and direct address ("you"), avoid passive voice.
- ⚠️ **Privacy / FOIA / CJIS** — GDPR is referenced in proposals but no approved
  compliance-language templates exist.
- ⚠️ **Error & empty states** — no approved patterns. "Hounds couldn't find this"-style
  voice not yet decided.
- ✅ **AI-generated content** — confirmed practice: *"All AI-generated content must be
  manually verified (no auto-publish)."* No required external disclosure language.
- 🔴 **Error states, compliance copy, AI disclosure language all open** — need
  cross-functional input (Brent for compliance, Roger for legal tone).

## 6. Sub-brand boundaries
- ✅ Sighthound + Redactor unified as one connected brand (schema + SEO treatment).
- ⚠️ **Speaker rules in practice** —
  - Product UI + `redactor.com` speak as **"Sighthound Redactor"**.
  - Legal / footer / billing speak as **"Sighthound, Inc."**
  - The embedded Redactor for partners strips branding entirely.
- ⚠️ **No dedicated Redactor app-chrome lockup.** The server version uses the Sighthound
  logo in the UI.
- ✅ **A new ALPR UI product is being named.** Proposed at All Hounds: **Sighthound
  Checkpoint**, **Sighthound Beacon**, **Sighthound Command**. *"Sighthound Vision AI"*
  proposed as a potential master brand descriptor.
- ⚠️ The 2022 category lockups (Recognizer, Identifier, Signaler, Sighthound Labs) are
  placeholders — none activated in recent Slack discussion.
- 🔴 **Pre-architect a sub-brand slot system now.** The ALPR UI product needs a wordmark,
  lockup, and naming-convention decision imminently.

## 7. Photography & composition (v0.9.1)
- ✅ **Imagery is optional** — the system must feel Sighthound without photography.
  Reach for imagery only when it adds specific meaning (per product nuance in `README.md`).
- ✅ **Composition motifs are first-class alternatives** — detection grids, topo / map
  patterns, schematic illustrations, soft gradients, data panels, the wave, icon-led
  sections, neutral placeholder blocks. CSS utilities in `colors_and_type.css`:
  `.sh-pattern-dots`, `.sh-pattern-grid`, `.sh-pattern-topo`, `.sh-pattern-scan`,
  `.sh-pattern-detect`, `.sh-soft-mist`, `.sh-soft-fade`.
- ⚠️ **No official asset library.** Squarespace CDN + Google Drive logo/brand folder are
  the de facto sources.
- ⚠️ **Law enforcement imagery** — "body-worn camera company" is approved language;
  beyond that no formal uniform/face-redaction rules.
- 🔴 **Need a DAM (digital asset management) solution** when imagery volume scales.

## 8. Wave graphic
- ⚠️ **No canonical SVG sources, approved angles, opacities, or color combos.**
- 🔴 If the wave is in active use, source files and usage rules need to be tracked down
  from the original 2022 designer and committed to this system.

## 9. Product naming conventions
- ✅ **"Sighthound Redactor"** — proper case across all confirmed usage (brochures, user
  guides, website, schema, Slack).
- ✅ **"ALPR+"** — confirmed product name across website, brochure, and schema. **Not**
  "ALPR Plus", **not** plain "ALPR".
- ⚠️ Sentence case in running copy — not formally specified, but the **Content Style Guide
  v2026.04** mandates sentence case for blog/web headers.
- ⚠️ **MMCG** — no formal rule. Spell out on first use is safe.
- ⚠️ **"Sighthound ALPR+" vs "ALPR+"** — no formal rule. Practice: master brand retained
  in marketing + product headers; bare "ALPR+" used in dense technical / product-UI
  contexts.

## 10. Buttons & interactive radii
- ⚠️ The **20px CTA / 8px compact** split is not officially blessed but completely
  unaddressed beyond the 2022 guide's 20px CTA spec. Reasonable and defensible.
- 🔴 **Document the rationale and get a nod from Brent or Julianna** as product-side
  stakeholders.

## 11. Accessibility
- 🔴 **No WCAG target level has been officially stated.**
- ⚠️ **Color contrast risks** (per standard ratio checks):
  - Light Orange `#f99f25` on white — **borderline AA**, risky for body text.
  - Red Orange `#f62470` on white — **fails AA**, must not be used for body text.
  - Blurple `#4f60dc` on white — passes AA for large text; borderline for body. Prefer
    Navy for long-form body copy.
- ⚠️ No guidance for focus rings, motion preferences, or screen-reader copy.
- 🔴 **Legal / reputational risk**, especially for government customers. Recommend:
  - Formally commit to **WCAG 2.1 AA** as minimum.
  - Audit the brand palette for AA compliance.
  - Define AA-safe usage rules per color (e.g. Light Orange = large-text / decorative
    only, never body).

## 12. Email & PDF templates
- ⚠️ **No HTML email signature template.** Roger's signatures use plain text + name /
  title / phone.
- ✅ A **Canva workspace** is in active use for brochures; **CapCut** for video.
- ⚠️ **No formal deck / whitepaper layouts** beyond Canva templates.
- ⚠️ **Verdana** is the de facto email fallback for Lexend — not formally ratified.

## 13. Localization
- ⚠️ **No official localization guidance.** Transport Malta and other non-US testimonials
  exist but no approved-markets / date-format / RTL rules.
- 🔴 Low priority today (US / English-first) but reserve a placeholder section in this
  system so decisions get captured when they arise.

## 14. Legal / compliance copy
- ⚠️ **No approved disclaimer language, accuracy claim templates, FOIA / CJIS / GDPR
  statements, or footer legal templates.**
- ✅ **Confirmed privacy claim** — *"Sighthound does not collect customer data; all data
  stays in the customer's deployment."* Usable as-is.
- ⚠️ **GDPR** referenced in customer proposals as a compliance context.
- ⚠️ **Accuracy claims** — internal LPR character accuracy is tracked but **not cleared
  for public citation** without product-team confirmation.
- 🔴 **High-risk territory.** Recommend Ryan (legal) + Brent draft a minimum viable
  compliance copy kit:
  1. One accuracy disclaimer template.
  2. One data-privacy statement.
  3. One footer legal template.

## 15. Other open decisions a living design system needs
- 🔴 **Motion & animation spec** — duration curves, easing, reduced-motion fallbacks.
- ⚠️ **Spacing scale** — we use a 4pt grid; no formal 4pt vs 8pt decision exists.
- 🔴 **Data visualization palette** — charts, graphs, maps for ALPR dashboards.
- 🔴 **Partner / OEM white-label rules** — embedded Redactor strips branding; no policy
  in writing.
- 🔴 **Video / media production standards** — voice spec exists; thumbnail design,
  lower-third templates, and end-card layouts don't.
- 🔴 **Component state library** — hover, focus, active, disabled, loading, skeleton
  states not centralized.
- 🔴 **Brand-approved AI disclosure language** — internal need confirmed, no
  external-facing copy ratified.
- 🔴 **Sub-brand architecture diagram** — master brand → sub-brand → product hierarchy.
  Becomes essential as the ALPR UI product gets named.

---

## Top four to ratify before publishing
Per the Slackbot audit's bottom line, these are the priority decisions:

1. **WCAG target** — commit to AA 2.1 minimum.
2. **Semantic color mapping** — bless success / warning / danger / info.
3. **App type spec** — formally split marketing 16px vs app 14px.
4. **ALPR UI product sub-brand slot** — name + wordmark + lockup.

Sign-off owners (suggested):
- Roger — palette ratios, legal tone
- Brent — product, compliance copy, semantic colors
- Ryan Campbell — legal / accessibility commitment, Robofan licensing
- Julianna — product-side button/component blessing

---

## Live source inputs
1. **Sighthound Brand Guidelines, April 2022** — `uploads/Sighthound-BrandGuidelines-Jul12.pdf`
2. **Content Style Guide v2026.04** — internal
3. **`anti-ai-writing-style.md`** — internal
4. This design system project — the emerging operational doc


---

<a id="4-decisions-log"></a>
## 4. Decisions log (`DECISIONS_LOG.md`)

# Decisions Log

Items requiring formal cross-functional sign-off before they become canonical in the
design system. Each row links back to **`AUTHORITATIVE_STATUS.md`** for full context.

| # | Decision | Owner(s) | Status | Notes |
|---|---|---|---|---|
| 1 | **WCAG target level** — commit to 2.1 AA minimum | Ryan Campbell, Brent | 🔴 Open | Government customer base makes this legal/reputational risk |
| 2 | **Semantic color mapping** (success / warning / danger / info) | Brent + Marketing | 🔴 Open | Current mapping in `colors_and_type.css` is unblessed |
| 3 | **App type spec** — formally bless 14px Regular for app density | Brent, Julianna | 🔴 Open | Marketing stays 16px; app overrides documented |
| 4 | **ALPR UI product sub-brand** — pick from Checkpoint / Beacon / Command (or other) and commission wordmark | Roger, Brent | 🔴 Open | Naming actively in flight |
| 5 | **Palette ratios since 2022** — bless or revise the 60/30/10 Blurple/Navy/Orange | Roger | 🔴 Open | Redactor's navy drift is unratified |
| 6 | **Icon system** — formally adopt Lucide for UI; commission illustration set for primary icons | Brent | 🔴 Open | Current Lucide use is unblessed practice |
| 7 | **Dark mode palette** | Brent + Marketing | 🔴 Open | No palette, no priority stated |
| 8 | **Robofan license / access** | Ryan Campbell | 🔴 Open | Currently vendor-locked to logo files |
| 9 | **Font fallback chain** — ratify `Lexend → Verdana → Geneva → sans-serif` | Marketing | 🔴 Open | Verdana is practice; never ratified |
| 10 | **Button radii split** — bless 20px CTA / 8px compact | Brent, Julianna | 🔴 Open | Defensible but unblessed |
| 11 | **Compliance copy kit** — accuracy disclaimer, data-privacy statement, footer legal | Ryan Campbell, Brent | 🔴 Open | High-risk; minimum viable kit needed |
| 12 | **Error & empty-state voice patterns** | Roger, Brent | 🔴 Open | Decide on "Hounds couldn't find this" vs literal |
| 13 | **AI disclosure language** — external-facing copy | Roger, Brent | 🔴 Open | Internal "manual verification" rule confirmed |
| 14 | **Motion & animation spec** — durations, easing, reduced-motion | Brent, design | 🔴 Open | None documented |
| 15 | **Data visualization palette** — charts, maps, dashboards | Brent, product | 🔴 Open | Becomes critical for ALPR dashboards |
| 16 | **Partner / OEM white-label rules** | Roger | 🔴 Open | Embedded Redactor strips branding — no policy |
| 17 | **Photography DAM** — shared, organized library | Marketing | 🔴 Open | Squarespace CDN + Drive is de facto |
| 18 | **Wave graphic source files + usage rules** | Original 2022 designer / Marketing | 🔴 Open | No canonical SVGs |
| 19 | **Sub-brand architecture diagram** — master → sub-brand → product | Roger, Brent | 🔴 Open | Essential as ALPR UI gets named |
| 20 | **Localization placeholder** — markets, dates, RTL | — | ⏸️ Deferred | US/English-first; revisit when needed |

## How to use this log
- Each row stays open until the owner formally signs off (Slack post, doc comment, or PR
  approval).
- When closed, move the rationale into `AUTHORITATIVE_STATUS.md` under the relevant
  section and update the status legend (🔴 → ✅).
- Add new rows here as the system grows; never bake unblessed decisions into
  `README.md` or `colors_and_type.css` without a corresponding entry.

## Confirmed since the May 2026 audit
These were closed by the Slackbot audit and now live as ✅ in `AUTHORITATIVE_STATUS.md`:

- Lexend remains primary
- Sighthound + Redactor are one unified brand
- "Sighthound Redactor" proper case
- "ALPR+" canonical (not "ALPR Plus", not "ALPR")
- AI-generated content must be manually verified before publishing
- "Sighthound does not collect customer data" is a usable privacy claim
- Sentence case for blog/web headers (per Content Style Guide v2026.04)


---

<a id="5-agent-skill-manifest"></a>
## 5. Agent skill manifest (`SKILL.md`)

```markdown
---
name: sighthound-design
description: Use this skill to generate well-branded interfaces and assets for Sighthound (and the Sighthound Redactor sub-brand) — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and
create static HTML files for the user to view. If working on production code, you can copy
assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build
or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

## Quick orientation

- `README.md` — brand story, voice, visual foundations, iconography, index.
- `OPERATING_MODE.md` — v0.9 provisional mode. How to use without sign-off.
- `AUTHORITATIVE_STATUS.md` — audit-of-record. Every rule annotated ✅ / ⚠️ / 🔴.
- `DECISIONS_LOG.md` — open items awaiting sign-off.
- `colors_and_type.css` — drop-in CSS: design tokens + semantic element styles.
- `assets/` — real logos, hero imagery, product icons, hardware renders. Copy, don't redraw.
- `preview/` — small cards that render each part of the system.
- `ui_kits/sighthound-marketing/` — React recreation of sighthound.com.
- `ui_kits/redactor-app/` — React recreation of the Redactor product UI.

## Non-negotiables (✅ confirmed)

- **One brand.** Sighthound + Sighthound Redactor read as one connected brand. Redactor is a sub-brand, not a separate identity.
- **Products:** Sighthound ALPR+ (software), Sighthound Redactor (software), **Sighthound Edge Compute** (hardware), Sighthound Video (software).
- **Brand feel:** Premium · Calm · Modern · Technical but approachable · Enterprise-grade · Flexible · Trustworthy · Data-aware · Product-ready · Scalable.
- **Product names** — **"Sighthound Redactor"** (proper case). **"ALPR+"** (exact form, never "ALPR Plus" or "ALPR").
- Body text is **Dark Navy `#1a1d38`** on light backgrounds. Never black.
- Primary color is **Blurple `#4f60dc`** (~60% per 2022 guide; softened in practice).
- Orange accents (`#f99f25` / `#f05d22` / `#f62470`) are **~10%** only — pops, not fills.
- Buttons: **20px radius** for CTA / marketing; ⚠️ 8px in dense app contexts (practice).
- Primary font: **Lexend** (Google, free). Fallback: Verdana.
- The wordmark uses Robofan (vendor-locked) — never recreate; always use a logo file.
- Tagline: *"Turning sight into insight."*
- Voice: informal yet polished, human, succinct, no arrogance. We/you. Sentence case for headers (per Content Style Guide v2026.04).
- No emoji in production UI.
- ✅ **Privacy claim** usable verbatim: *"Sighthound does not collect customer data; all data stays in the customer's deployment."*
- ✅ **AI rule:** all AI-generated content must be manually verified — no auto-publish.

## Imagery is optional (v0.9.1)

The system must feel Sighthound **even without photography**. Imagery is one tool, not the default. Reach for it only when it adds specific meaning:

- **ALPR+** — live recognition, vehicle events, evidence review.
- **Redactor** — before/after redaction, media review.
- **Edge Compute** — hardware, deployment, edge infrastructure.
- **Video** — monitoring, playback, camera management.

Dashboards, settings, analytics, reports, onboarding, admin tools, docs, pricing, forms, empty states, and navigation should **not** require imagery.

When imagery is wrong, reach for these composition motifs (see `colors_and_type.css` for utility classes):

- **Typography-led** layouts with confident hierarchy
- **Data panels** — KPI tiles, tables, sparklines
- **Cards** as the unit of layout
- **Soft gradients** — `.sh-soft-mist`, `.sh-soft-fade`
- **The wave** — signature graphic, sparingly
- **Detection-grid pattern** — `.sh-pattern-detect`
- **Map / topo patterns** — `.sh-pattern-topo`, `.sh-pattern-grid`
- **Schematic illustrations** — labelled outline diagrams
- **Icon-led sections** — primary icon + heading + body
- **Neutral placeholder blocks** — solid gray panels with caption
- **Product UI structure** — show real UI slices instead of stock

## ⚠️ Accessibility caution

- Light Orange `#f99f25` on white = borderline AA → large text / decorative only.
- Red Orange `#f62470` on white = **fails AA** → never body text.
- Blurple on white = borderline → prefer Navy for body.
- Formal WCAG target not yet committed (see `DECISIONS_LOG.md` #1).

## Signature motifs
The **wave** graphic (curved flowing form, any angle, any palette color, often with transparency) and Blurple → Red-Orange gradients are the two hallmark brand devices. Use sparingly.

```

---

<a id="6-design-tokens"></a>
## 6. Design tokens — `colors_and_type.css`

```css
/* =========================================================
   Sighthound Design System — colors_and_type.css
   v0.9.1 Provisional (see OPERATING_MODE.md)
   Source: Sighthound Brand Guidelines (April 2022) +
           May 2026 Slackbot audit (AUTHORITATIVE_STATUS.md)
   ========================================================= */

/* Lexend — primary brand typeface (Google Fonts, open source) */
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap');

:root {
  /* ---------- COLOR — Primary ---------- */
  --sh-blurple:          #4f60dc; /* combination of blue & purple; primary brand hue (60% of design) */
  --sh-blurple-700:      #3d4bc2;
  --sh-blurple-800:      #2e3ba4;
  --sh-blurple-300:      #8792e8;
  --sh-blurple-100:      #dee2f8;
  --sh-blurple-50:       #eef1fc;

  --sh-white:            #ffffff;

  /* ---------- COLOR — Secondary (30% of design) ---------- */
  --sh-navy:             #1a1d38; /* text color on light; brand dark */
  --sh-navy-700:         #2a2e56;
  --sh-navy-500:         #4b4f73;
  --sh-gray:             #eff3f7; /* neutral gray surface */
  --sh-gray-200:         #d9dfe6;
  --sh-gray-400:         #9aa3b2;
  --sh-gray-600:         #64708a;

  /* ---------- COLOR — Accents (10% — pops of color) ---------- */
  --sh-orange-light:     #f99f25;
  --sh-orange-medium:    #f05d22;
  --sh-orange-red:       #f62470;

  /* ---------- COLOR — Gradients (~10% usage) ---------- */
  --sh-gradient-brand:   linear-gradient(135deg, #4f60dc 0%, #f62470 100%);
  --sh-gradient-warm:    linear-gradient(135deg, #f99f25 0%, #f05d22 50%, #f62470 100%);
  --sh-gradient-cool:    linear-gradient(135deg, #1a1d38 0%, #4f60dc 100%);
  --sh-gradient-surface: linear-gradient(180deg, #eff3f7 0%, #ffffff 100%);
  --sh-gradient-soft:    linear-gradient(180deg, rgba(79, 96, 220, 0.06) 0%, #ffffff 60%);
  --sh-gradient-mist:    radial-gradient(120% 80% at 30% 0%, rgba(79, 96, 220, 0.08), transparent 60%);

  /* ---------- PATTERN — Composition motifs (v0.9.1) ---------- */
  /* Subtle backgrounds for sections that read as "Sighthound" without photography.
     Apply as background-image; pair with --bg-canvas / --bg-surface for the base. */
  --pattern-dot-grid:    radial-gradient(circle at 1px 1px, rgba(26, 29, 56, 0.08) 1px, transparent 0);
  --pattern-dot-size:    20px 20px;
  --pattern-square-grid: linear-gradient(rgba(26, 29, 56, 0.05) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(26, 29, 56, 0.05) 1px, transparent 1px);
  --pattern-square-size: 32px 32px;
  --pattern-topo:        repeating-linear-gradient(135deg, rgba(79, 96, 220, 0.08) 0 1px, transparent 1px 24px);
  --pattern-scan:        repeating-linear-gradient(0deg, rgba(79, 96, 220, 0.05) 0 2px, transparent 2px 6px);
  --pattern-detection:   radial-gradient(circle at 1px 1px, rgba(79, 96, 220, 0.18) 1px, transparent 0);

  /* ---------- SEMANTIC — Foreground ---------- */
  --fg-1:                var(--sh-navy);       /* primary text */
  --fg-2:                var(--sh-navy-500);   /* secondary text */
  --fg-3:                var(--sh-gray-600);   /* tertiary / meta */
  --fg-inverse:          var(--sh-white);
  --fg-accent:           var(--sh-blurple);
  --fg-link:             var(--sh-blurple);

  /* ---------- SEMANTIC — Background ---------- */
  --bg-canvas:           var(--sh-white);
  --bg-surface:          var(--sh-gray);
  --bg-raised:           #ffffff;
  --bg-inverse:          var(--sh-navy);
  --bg-brand:            var(--sh-blurple);

  /* ---------- SEMANTIC — Border ---------- */
  --border-subtle:       #e4e8ef;
  --border-default:      var(--sh-gray-200);
  --border-strong:       var(--sh-navy-500);
  --border-focus:        var(--sh-blurple);

  /* ---------- SEMANTIC — Status ---------- */
  --status-success:      #1f9d55;
  --status-warning:      var(--sh-orange-light);
  --status-danger:       var(--sh-orange-red);
  --status-info:         var(--sh-blurple);

  /* ---------- TYPE — Families ---------- */
  --font-sans:           'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Verdana, sans-serif;
  --font-fallback:       Verdana, Geneva, sans-serif; /* brand-approved fallback for email/software */
  --font-mono:           'SF Mono', Menlo, Consolas, 'Roboto Mono', monospace;
  /* NOTE: the logo wordmark uses Robofan, a proprietary type; NEVER recreate the wordmark — use the logo files in assets/ */

  /* ---------- TYPE — Weights (Lexend) ---------- */
  --fw-light:            300;
  --fw-regular:          400;
  --fw-medium:           500;
  --fw-semibold:         600;
  --fw-bold:             700;

  /* ---------- TYPE — Scale (digital hierarchy, from brand guide) ---------- */
  /* Marketing surfaces (default). App surfaces override --fs-body to 14px — see OPERATING_MODE.md */
  --fs-h1:               46px;  /* Lexend Medium,   line-height 1.2 */
  --fs-h2:               32px;  /* Lexend Light,    line-height 1.33, Title Case */
  --fs-h3:               16px;  /* Lexend Light,    line-height 1.5 */
  --fs-h4:               16px;  /* Lexend Semibold, ALL CAPS, line-height 1.5 */
  --fs-h5:               18px;  /* Lexend Light,    line-height 1.5 */
  --fs-body:             16px;  /* Lexend Regular,  line-height 1.5 */
  --fs-button:           16px;  /* Lexend Regular */
  --fs-caption:          13px;
  --fs-overline:         12px;  /* Lexend Semibold, ALL CAPS, tracking 0.08em */

  /* ---------- SPACING ---------- */
  --space-1:             4px;
  --space-2:             8px;
  --space-3:             12px;
  --space-4:             16px;
  --space-5:             20px;
  --space-6:             24px;
  --space-8:             32px;
  --space-10:            40px;
  --space-12:            48px;
  --space-16:            64px;
  --space-20:            80px;
  --space-24:            96px;

  /* ---------- RADII ---------- */
  --radius-sm:           4px;
  --radius-md:           8px;
  --radius-lg:           12px;
  --radius-button:       20px;   /* buttons are rounded 20px per brand spec */
  --radius-pill:         999px;

  /* ---------- SHADOWS ---------- */
  --shadow-xs:           0 1px 2px rgba(26, 29, 56, 0.06);
  --shadow-sm:           0 2px 6px rgba(26, 29, 56, 0.08);
  --shadow-md:           0 8px 20px rgba(26, 29, 56, 0.10);
  --shadow-lg:           0 20px 40px rgba(26, 29, 56, 0.14);
  --shadow-focus:        0 0 0 3px rgba(79, 96, 220, 0.35);

  /* ---------- MOTION ---------- */
  --ease-standard:       cubic-bezier(0.2, 0.0, 0.2, 1);
  --ease-out:            cubic-bezier(0.0, 0.0, 0.2, 1);
  --dur-fast:            120ms;
  --dur-base:            200ms;
  --dur-slow:            320ms;
}

/* =========================================================
   Semantic element styles
   ========================================================= */

html, body {
  font-family: var(--font-sans);
  font-weight: var(--fw-regular);
  font-size: var(--fs-body);
  line-height: 1.5;
  color: var(--fg-1);
  background: var(--bg-canvas);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, .h1 {
  font-family: var(--font-sans);
  font-weight: var(--fw-medium);
  font-size: var(--fs-h1);
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--fg-1);
  margin: 0 0 var(--space-6);
}

h2, .h2 {
  font-family: var(--font-sans);
  font-weight: var(--fw-light);
  font-size: var(--fs-h2);
  line-height: 1.33;
  color: var(--fg-1);
  margin: 0 0 var(--space-5);
}

h3, .h3 {
  font-family: var(--font-sans);
  font-weight: var(--fw-light);
  font-size: var(--fs-h3);
  line-height: 1.5;
  margin: 0 0 var(--space-3);
}

h4, .h4 {
  font-family: var(--font-sans);
  font-weight: var(--fw-semibold);
  font-size: var(--fs-h4);
  line-height: 1.5;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 var(--space-3);
}

h5, .h5 {
  font-family: var(--font-sans);
  font-weight: var(--fw-light);
  font-size: var(--fs-h5);
  line-height: 1.5;
  margin: 0 0 var(--space-3);
}

p, .p {
  font-weight: var(--fw-regular);
  font-size: var(--fs-body);
  line-height: 1.5;
  margin: 0 0 var(--space-4);
  text-wrap: pretty;
}

.overline {
  font-size: var(--fs-overline);
  font-weight: var(--fw-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-2);
}

.caption { font-size: var(--fs-caption); color: var(--fg-3); }

a, .link {
  color: var(--fg-link);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  transition: color var(--dur-fast) var(--ease-standard);
}
a:hover { color: var(--sh-blurple-700); }

code, pre, .mono {
  font-family: var(--font-mono);
  font-size: 0.92em;
}

/* ---------- Pattern utility classes (v0.9.1) ---------- */
/* Drop on any container to add a Sighthound-flavored background without imagery. */
.sh-pattern-dots   { background-image: var(--pattern-dot-grid);    background-size: var(--pattern-dot-size); }
.sh-pattern-grid   { background-image: var(--pattern-square-grid); background-size: var(--pattern-square-size); }
.sh-pattern-topo   { background-image: var(--pattern-topo); }
.sh-pattern-scan   { background-image: var(--pattern-scan); }
.sh-pattern-detect { background-image: var(--pattern-detection);   background-size: var(--pattern-dot-size); }
.sh-soft-mist      { background-image: var(--sh-gradient-mist); }
.sh-soft-fade      { background-image: var(--sh-gradient-soft); }

/* ---------- Button base ---------- */
button, .btn {
  font-family: var(--font-sans);
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-weight: var(--fw-regular);
  font-size: var(--fs-button);
  line-height: 1;
  padding: 14px 29px;                 /* per brand spec */
  border-radius: var(--radius-button); /* 20px */
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--dur-base) var(--ease-standard);
  white-space: nowrap;
}
.btn-primary { background: var(--sh-blurple); color: var(--sh-white); }
.btn-primary:hover { background: var(--sh-blurple-700); }
.btn-secondary { background: var(--sh-white); color: var(--sh-navy); border-color: var(--sh-navy); }
.btn-secondary:hover { background: var(--sh-navy); color: var(--sh-white); }
.btn-tertiary { background: transparent; color: var(--sh-blurple); padding: 14px 12px; }
.btn-tertiary:hover { color: var(--sh-blurple-800); text-decoration: underline; }

```

---

<a id="7-ui-kit--sighthound-marketing"></a>
## 7. UI kit — Sighthound marketing

# Sighthound marketing site — UI kit (v0.9.1)

A composition-first recreation of **sighthound.com** built from brand tokens, with
imagery used only where it earns its place.

## v0.9.1 reframe

This kit was rebuilt to demonstrate that the system feels Sighthound **without depending
on photography**. The page reads as Sighthound through type, structure, colour, and
composition motifs:

- **Hero** — type-led with a live-detection events panel on the right (data, not stock imagery)
- **Capabilities** — 4 icon-led cards, no images
- **ProductSpotlight** — the 4 products in a 2×2 grid — imagery preserved here, because *this* is where it earns its place
- **Stats** — "By the numbers" data panel on Navy: KPI tiles + sparkline + scan-line pattern
- **Schematic** — "How it deploys" SVG deployment diagram with topo-pattern accent
- **Marquee · CustomerLogos · Footer** — unchanged

## Components
- `Nav.jsx` — top navigation
- `Hero.jsx` — type-led hero + live events panel
- `Capabilities.jsx` — icon-led capability cards
- `ProductSpotlight.jsx` — 4 products (ALPR+, Redactor, Edge Compute, Video)
- `Stats.jsx` — KPI + sparkline data panel
- `Schematic.jsx` — deployment diagram
- `Marquee.jsx` — proof-points marquee
- `CustomerLogos.jsx` — customer grid
- `Footer.jsx` — four-column footer

Open `index.html` to see them assembled.

## Notes
- Built on top of the brand tokens in `../../colors_and_type.css` (v0.9.1).
- No codebase provided; cosmetic-level React.
- Imagery in `ProductSpotlight` pulled from the live Squarespace CDN + saved under `../../assets/`.


### `ui_kits/sighthound-marketing/Nav.jsx`

```jsx
const { useState } = React;

function Nav() {
  const [open, setOpen] = useState(null);
  const menus = {
    Products: ['Sighthound ALPR+', 'Sighthound Redactor', 'Sighthound Hardware', 'Sighthound Video'],
    Solutions: ['Parking & EV', 'Law Enforcement', 'Retail & QSR', 'Education & Campus Security', 'Legal & FOIA', 'Transportation & Logistics'],
    Support: ['Frequently Asked Questions', 'Developer Resources'],
    About: ['Team', 'Technology', 'Partners', 'Careers', 'News', 'Blog'],
  };
  return (
    <nav style={{position:'sticky',top:0,zIndex:50,background:'#fff',borderBottom:'1px solid #e4e8ef'}}>
      <div style={{maxWidth:1240,margin:'0 auto',padding:'16px 32px',display:'flex',alignItems:'center',gap:32}}>
        <img src="../../assets/sighthound-logo-horizontal.jpg" style={{height:40}} alt="Sighthound"/>
        <div style={{display:'flex',gap:4,flex:1}} onMouseLeave={()=>setOpen(null)}>
          {Object.keys(menus).map(k => (
            <div key={k} style={{position:'relative'}} onMouseEnter={()=>setOpen(k)}>
              <button style={{background:'none',border:0,padding:'10px 14px',fontFamily:'Lexend',fontWeight:300,fontSize:15,color:'#1a1d38',cursor:'pointer'}}>{k}</button>
              {open===k && (
                <div style={{position:'absolute',top:'100%',left:0,background:'#fff',border:'1px solid #e4e8ef',borderRadius:12,boxShadow:'0 8px 20px rgba(26,29,56,.10)',padding:8,minWidth:240}}>
                  {menus[k].map(i => <a key={i} href="#" style={{display:'block',padding:'10px 14px',fontSize:14,color:'#1a1d38',textDecoration:'none',borderRadius:8,fontWeight:300}} onMouseEnter={e=>e.currentTarget.style.background='#eff3f7'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{i}</a>)}
                </div>
              )}
            </div>
          ))}
        </div>
        <a href="#" style={{fontFamily:'Lexend',fontWeight:300,fontSize:15,color:'#1a1d38',textDecoration:'none'}}>Contact</a>
        <button className="btn btn-primary" style={{padding:'12px 22px'}}>Talk to our team</button>
      </div>
    </nav>
  );
}
window.Nav = Nav;

```

### `ui_kits/sighthound-marketing/Hero.jsx`

```jsx
function Hero() {
  const events = [
    { t:'09:42:18', plate:'7ABC123', make:'Tesla',   model:'Model 3', color:'White',  region:'CA' },
    { t:'09:42:15', plate:'4XKD891', make:'Ford',    model:'F-150',   color:'Silver', region:'NV' },
    { t:'09:42:11', plate:'8RTL204', make:'Toyota',  model:'Camry',   color:'Black',  region:'CA' },
    { t:'09:42:07', plate:'2GHM559', make:'Honda',   model:'CR-V',    color:'Blue',   region:'AZ' },
    { t:'09:42:03', plate:'9PLN710', make:'BMW',     model:'X5',      color:'Gray',   region:'CA' },
  ];
  return (
    <section className="sh-soft-mist" style={{position:'relative',overflow:'hidden',background:'#fff'}}>
      <div className="sh-pattern-detect" style={{position:'absolute',inset:0,opacity:.5,pointerEvents:'none'}}/>
      <div style={{position:'relative',maxWidth:1240,margin:'0 auto',padding:'96px 32px 120px',display:'grid',gridTemplateColumns:'1.15fr 1fr',gap:64,alignItems:'center'}}>
        <div>
          <div className="overline" style={{marginBottom:16,color:'#4f60dc'}}>Vehicle & Pedestrian Insights, Made Easy</div>
          <h1 style={{fontSize:60,lineHeight:1.05,margin:'0 0 20px',letterSpacing:'-0.015em'}}>Turning sight into <span style={{background:'linear-gradient(120deg,#4f60dc 20%,#f62470)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent'}}>insight</span>.</h1>
          <p style={{fontSize:19,color:'#4b4f73',maxWidth:560,marginBottom:32,fontWeight:400}}>Edge AI cameras and computer-vision software that turn every camera into a real-time data source — for traffic, smart cities, and enterprise.</p>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button className="btn btn-primary">Talk to our team</button>
            <button className="btn btn-tertiary">See how it works →</button>
          </div>
          <div style={{display:'flex',gap:28,marginTop:36,paddingTop:24,borderTop:'1px solid #e4e8ef'}}>
            <div><div style={{fontSize:11,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600}}>Accuracy</div><div style={{fontSize:22,fontWeight:500,color:'#1a1d38',fontVariantNumeric:'tabular-nums'}}>99.4%</div></div>
            <div><div style={{fontSize:11,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600}}>Edge latency</div><div style={{fontSize:22,fontWeight:500,color:'#1a1d38',fontVariantNumeric:'tabular-nums'}}>&lt; 40 ms</div></div>
            <div><div style={{fontSize:11,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600}}>Made in USA</div><div style={{fontSize:22,fontWeight:500,color:'#1a1d38'}}>Always</div></div>
          </div>
        </div>
        {/* Type-led "live detections" panel — composition motif, not stock imagery */}
        <div style={{position:'relative'}}>
          <div style={{background:'#fff',borderRadius:18,border:'1px solid #e4e8ef',boxShadow:'0 20px 40px rgba(26,29,56,.14)',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid #eef1fc'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{width:8,height:8,borderRadius:999,background:'#1f9d55',boxShadow:'0 0 0 4px rgba(31,157,85,.18)'}}/>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1d38'}}>Live · ALPR+ stream</div>
              </div>
              <div style={{fontSize:11,color:'#64708a',fontVariantNumeric:'tabular-nums'}}>Site 02 · Lane 3</div>
            </div>
            <div style={{padding:'10px 4px 14px'}}>
              {events.map((e,i)=>(
                <div key={i} style={{display:'grid',gridTemplateColumns:'70px 1fr auto',gap:12,alignItems:'center',padding:'10px 18px',borderTop:i?'1px solid #f4f6fa':0,opacity:1 - i*0.13}}>
                  <div style={{fontSize:11,color:'#64708a',fontFamily:'SF Mono, Menlo, monospace'}}>{e.t}</div>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{display:'inline-block',padding:'2px 8px',borderRadius:6,background:'#1a1d38',color:'#fff',fontSize:11,fontWeight:600,letterSpacing:'.04em',fontFamily:'SF Mono, Menlo, monospace'}}>{e.region} · {e.plate}</span>
                    </div>
                    <div style={{fontSize:12,color:'#4b4f73',marginTop:3}}>{e.color} {e.make} {e.model}</div>
                  </div>
                  <div style={{width:8,height:8,borderRadius:999,background: i===0 ? '#4f60dc' : '#dee2f8'}}/>
                </div>
              ))}
            </div>
            <div style={{padding:'10px 18px',borderTop:'1px solid #eef1fc',display:'flex',justifyContent:'space-between',fontSize:11,color:'#64708a'}}>
              <span>Detection rate · <b style={{color:'#1a1d38',fontWeight:500}}>14.3 / min</b></span>
              <span>Confidence · <b style={{color:'#1a1d38',fontWeight:500}}>0.97 avg</b></span>
            </div>
          </div>
          {/* Floating insight tag */}
          <div style={{position:'absolute',top:-14,right:-14,padding:'8px 14px',background:'linear-gradient(135deg,#4f60dc,#f62470)',color:'#fff',borderRadius:999,fontSize:12,fontWeight:500,boxShadow:'0 10px 24px rgba(79,96,220,.35)'}}>↗ 4.2% vs yesterday</div>
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;

```

### `ui_kits/sighthound-marketing/Capabilities.jsx`

```jsx
function Capabilities() {
  const cards = [
    { i:'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z', title:'Real-time detection', body:'Vehicles, plates, people and objects in under 40 ms — at the edge, on the device, where the data is born.' },
    { i:'M3 4h18M3 9h18M3 14h12M3 19h8', title:'Structured events', body:'Every detection emits make, model, color, generation, region, lane and confidence. Ready for your stack.' },
    { i:'M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z M9 12l2 2 4-4', title:'Privacy by design', body:'Data stays in your environment. CJIS, FOIA, GDPR-aligned. Faces and plates can be redacted on capture.' },
    { i:'M3 12h6m6 0h6 M12 3v6m0 6v6 M5 5l3 3m8 8l3 3 M19 5l-3 3m-8 8l-3 3', title:'Open & integrated', body:'REST, MQTT, webhooks, RTSP. Drop into existing VMS, ITS, parking and access systems.' },
  ];
  return (
    <section style={{padding:'112px 32px',background:'#fff'}}>
      <div style={{maxWidth:1240,margin:'0 auto'}}>
        <div style={{maxWidth:780,marginBottom:56}}>
          <div className="overline" style={{marginBottom:12}}>Capabilities</div>
          <h2 style={{fontSize:44,lineHeight:1.1,marginBottom:18}}>State-of-the-art computer vision, shaped for production.</h2>
          <p style={{fontSize:17,color:'#4b4f73',maxWidth:620,fontWeight:400}}>Built in our own research lab. Tuned on a billion images a year. Deployed at the edge so latency, cost and privacy stay where they should.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))',gap:20}}>
          {cards.map(c => (
            <article key={c.title} style={{background:'#fff',borderRadius:16,padding:'26px 26px 28px',border:'1px solid #e4e8ef',boxShadow:'0 2px 6px rgba(26,29,56,.06)',display:'flex',flexDirection:'column'}}>
              <div style={{width:44,height:44,borderRadius:12,background:'#eef1fc',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f60dc" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={c.i}/></svg>
              </div>
              <h3 style={{fontSize:18,fontWeight:500,marginBottom:8,color:'#1a1d38',lineHeight:1.3}}>{c.title}</h3>
              <p style={{fontSize:14,color:'#4b4f73',lineHeight:1.55,margin:0}}>{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
window.Capabilities = Capabilities;

```

### `ui_kits/sighthound-marketing/ProductSpotlight.jsx`

```jsx
function ProductSpotlight() {
  const products = [
    {
      tag:'Software · ALPR+',
      title:'Sighthound ALPR+',
      body:'License-plate recognition plus full vehicle make / model / color / generation. Read most plates worldwide.',
      img:'../../assets/white-tesla-alpr.jpg',
      cta:'Explore ALPR+',
    },
    {
      tag:'Software · Redactor',
      title:'Sighthound Redactor',
      body:'AI redaction for video, image and audio. Faces, plates and PII — gone in one pass. FOIA-ready.',
      img:'../../assets/redactor-courtroom-redacted.avif',
      cta:'Explore Redactor',
    },
    {
      tag:'Hardware · Edge Compute',
      title:'Sighthound Edge Compute',
      body:'Rugged IP67 deep-learning cameras and nodes. American IP and manufacturing. Software-defined.',
      img:'../../assets/edge-ai-hardware.png',
      cta:'Explore Edge Compute',
      contain:true,
    },
    {
      tag:'Software · Video',
      title:'Sighthound Video',
      body:'Flexible video management system — the original Sighthound product. Camera-agnostic, scriptable.',
      img:'../../assets/hero-object-tracking.jpg',
      cta:'Explore Video',
    },
  ];
  return (
    <section style={{padding:'112px 32px',background:'#eff3f7'}}>
      <div style={{maxWidth:1240,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:48,flexWrap:'wrap',gap:24}}>
          <div style={{maxWidth:640}}>
            <div className="overline" style={{marginBottom:12}}>The product family</div>
            <h2 style={{fontSize:44,lineHeight:1.1,marginBottom:0}}>One brand. Four products. Software and hardware that fit together.</h2>
          </div>
          <a href="#" style={{fontSize:14,fontWeight:500,color:'#4f60dc',textDecoration:'none',whiteSpace:'nowrap'}}>Compare all →</a>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {products.map(p => (
            <article key={p.title} style={{background:'#fff',borderRadius:18,overflow:'hidden',border:'1px solid #e4e8ef',display:'flex',flexDirection:'column'}}>
              <div style={{aspectRatio:'16/9',background: p.contain ? 'linear-gradient(180deg,#eff3f7,#fff)' : '#1a1d38',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <img src={p.img} style={{width:'100%',height:'100%',objectFit: p.contain ? 'contain' : 'cover', padding: p.contain ? '24px' : 0}}/>
              </div>
              <div style={{padding:'26px 28px 28px',display:'flex',flexDirection:'column',flex:1}}>
                <div className="overline" style={{marginBottom:10,color:'#4f60dc'}}>{p.tag}</div>
                <h3 style={{fontSize:24,fontWeight:500,color:'#1a1d38',marginBottom:10,lineHeight:1.2}}>{p.title}</h3>
                <p style={{fontSize:15,color:'#4b4f73',lineHeight:1.55,marginBottom:18,flex:1}}>{p.body}</p>
                <a href="#" style={{fontSize:14,fontWeight:500,color:'#4f60dc',textDecoration:'none'}}>{p.cta} →</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
window.ProductSpotlight = ProductSpotlight;

```

### `ui_kits/sighthound-marketing/Stats.jsx`

```jsx
function Stats() {
  const kpis = [
    { l:'Deployments',     v:'2,800+', s:'in 47 countries' },
    { l:'Cameras online',  v:'190K',   s:'streaming today' },
    { l:'Plates / second', v:'160',    s:'on a single GPU' },
    { l:'Latency',         v:'< 40 ms', s:'at the edge' },
  ];
  const spark = [40,32,38,22,28,18,24,14,20,12,16,8,12,10];
  return (
    <section style={{padding:'112px 32px',background:'#1a1d38',color:'#fff',position:'relative',overflow:'hidden'}}>
      <div className="sh-pattern-scan" style={{position:'absolute',inset:0,opacity:.6,pointerEvents:'none'}}/>
      <div style={{position:'relative',maxWidth:1240,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center',marginBottom:56}}>
          <div>
            <div className="overline" style={{marginBottom:12,color:'#8792e8'}}>By the numbers</div>
            <h2 style={{fontSize:44,lineHeight:1.1,color:'#fff',margin:0}}>The world's busiest roads, made legible in real time.</h2>
          </div>
          <p style={{fontSize:16,color:'#dee2f8',lineHeight:1.6,fontWeight:400}}>Sighthound is deployed by government agencies, fleet operators and Fortune-500 enterprises. The numbers below are not aspirational — they're current as of this quarter.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20,marginBottom:32}}>
          {kpis.map(k => (
            <div key={k.l} style={{padding:'24px 22px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(135,146,232,.18)',borderRadius:14}}>
              <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em',color:'#8792e8',marginBottom:10}}>{k.l}</div>
              <div style={{fontSize:36,fontWeight:500,color:'#fff',fontVariantNumeric:'tabular-nums',lineHeight:1,marginBottom:6}}>{k.v}</div>
              <div style={{fontSize:13,color:'#dee2f8'}}>{k.s}</div>
            </div>
          ))}
        </div>
        <div style={{padding:'22px 26px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(135,146,232,.18)',borderRadius:14,display:'grid',gridTemplateColumns:'1fr 2fr',gap:32,alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em',color:'#8792e8',marginBottom:8}}>Detections · last 24 h</div>
            <div style={{fontSize:28,fontWeight:500,color:'#fff',fontVariantNumeric:'tabular-nums'}}>12.4M</div>
            <div style={{fontSize:12,color:'#1f9d55',marginTop:4}}>↑ 4.2% vs yesterday</div>
          </div>
          <svg viewBox="0 0 600 70" width="100%" height="70" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f60dc" stopOpacity=".5"/>
                <stop offset="100%" stopColor="#4f60dc" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polyline fill="none" stroke="#4f60dc" strokeWidth="2.2" points={spark.map((y,i)=>`${i*(600/(spark.length-1))},${y+8}`).join(' ')}/>
            <polyline fill="url(#sg)" stroke="none" points={spark.map((y,i)=>`${i*(600/(spark.length-1))},${y+8}`).join(' ') + ` 600,70 0,70`}/>
          </svg>
        </div>
      </div>
    </section>
  );
}
window.Stats = Stats;

```

### `ui_kits/sighthound-marketing/Schematic.jsx`

```jsx
function Schematic() {
  return (
    <section style={{padding:'112px 32px',background:'#fff',position:'relative',overflow:'hidden'}}>
      <div className="sh-pattern-topo" style={{position:'absolute',inset:0,opacity:.6,pointerEvents:'none'}}/>
      <div style={{position:'relative',maxWidth:1240,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:64,alignItems:'center'}}>
          <div>
            <div className="overline" style={{marginBottom:12}}>How it deploys</div>
            <h2 style={{fontSize:40,lineHeight:1.1,marginBottom:18}}>Edge-first. Cloud-optional. Your environment, your data.</h2>
            <p style={{fontSize:16,color:'#4b4f73',lineHeight:1.6,marginBottom:24,fontWeight:400}}>Run detection on a Sighthound device at the source, or stream RTSP from existing cameras into a Sighthound Node. Results land in your VMS, ITS, parking system or data warehouse — no Sighthound cloud required.</p>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:10}}>
              <li style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,color:'#1a1d38'}}><span style={{color:'#1f9d55',fontWeight:600,marginTop:2}}>✓</span> Runs on-prem, in your VPC, or air-gapped</li>
              <li style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,color:'#1a1d38'}}><span style={{color:'#1f9d55',fontWeight:600,marginTop:2}}>✓</span> REST, MQTT, Webhook and direct DB integrations</li>
              <li style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,color:'#1a1d38'}}><span style={{color:'#1f9d55',fontWeight:600,marginTop:2}}>✓</span> Hardware optional — bring your own GPU if you prefer</li>
              <li style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:14,color:'#1a1d38'}}><span style={{color:'#1f9d55',fontWeight:600,marginTop:2}}>✓</span> Software-defined — same model, any deployment shape</li>
            </ul>
          </div>
          <div style={{background:'#fff',border:'1px solid #e4e8ef',borderRadius:18,padding:'32px 28px',boxShadow:'0 8px 20px rgba(26,29,56,.06)'}}>
            <svg viewBox="0 0 600 360" width="100%" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4f60dc"/></marker>
              </defs>
              {/* Layer band labels */}
              <g fontFamily="Lexend" fontSize="10" fill="#9aa3b2" fontWeight="600" letterSpacing="1">
                <text x="20" y="22" textTransform="uppercase">EDGE</text>
                <text x="245" y="22" textTransform="uppercase">SIGHTHOUND</text>
                <text x="470" y="22" textTransform="uppercase">YOUR SYSTEMS</text>
              </g>
              <g stroke="#e4e8ef" strokeDasharray="2 4">
                <line x1="220" y1="40" x2="220" y2="340"/>
                <line x1="455" y1="40" x2="455" y2="340"/>
              </g>
              {/* Connectors */}
              <g stroke="#4f60dc" strokeWidth="1.7" fill="none" markerEnd="url(#ah)">
                <line x1="150" y1="80"  x2="270" y2="155"/>
                <line x1="150" y1="180" x2="270" y2="170"/>
                <line x1="150" y1="280" x2="270" y2="195"/>
                <line x1="400" y1="180" x2="490" y2="100"/>
                <line x1="400" y1="180" x2="490" y2="180"/>
                <line x1="400" y1="180" x2="490" y2="260"/>
              </g>
              {/* Edge devices */}
              <g fontFamily="Lexend" fontSize="12">
                <g><rect x="20" y="55" width="130" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="32" y="78" fill="#1a1d38" fontWeight="500">Edge camera</text><text x="32" y="95" fill="#64708a" fontSize="10.5">Sighthound Compute</text></g>
                <g><rect x="20" y="155" width="130" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="32" y="178" fill="#1a1d38" fontWeight="500">IP camera</text><text x="32" y="195" fill="#64708a" fontSize="10.5">via RTSP</text></g>
                <g><rect x="20" y="255" width="130" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="32" y="278" fill="#1a1d38" fontWeight="500">Body / dash cam</text><text x="32" y="295" fill="#64708a" fontSize="10.5">mobile capture</text></g>
                {/* Node */}
                <g>
                  <rect x="270" y="135" width="135" height="90" rx="12" fill="#eef1fc" stroke="#4f60dc" strokeWidth="1.7"/>
                  <text x="285" y="160" fill="#1a1d38" fontWeight="500">Sighthound Node</text>
                  <text x="285" y="178" fill="#4b4f73" fontSize="10.5">Detection</text>
                  <text x="285" y="194" fill="#4b4f73" fontSize="10.5">MMCG · OCR</text>
                  <text x="285" y="210" fill="#4b4f73" fontSize="10.5">Redaction</text>
                </g>
                {/* Outputs */}
                <g><rect x="490" y="75" width="100" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="502" y="98" fill="#1a1d38" fontWeight="500">VMS</text><text x="502" y="115" fill="#64708a" fontSize="10.5">Existing video</text></g>
                <g><rect x="490" y="155" width="100" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="502" y="178" fill="#1a1d38" fontWeight="500">ITS / parking</text><text x="502" y="195" fill="#64708a" fontSize="10.5">Webhook · MQTT</text></g>
                <g><rect x="490" y="235" width="100" height="50" rx="10" fill="#fff" stroke="#1a1d38" strokeWidth="1.5"/><text x="502" y="258" fill="#1a1d38" fontWeight="500">Data lake</text><text x="502" y="275" fill="#64708a" fontSize="10.5">REST / S3</text></g>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
window.Schematic = Schematic;

```

### `ui_kits/sighthound-marketing/Marquee.jsx`

```jsx
function Marquee() {
  const items = ['Industry-Leading Accuracy','Comprehensive Vehicle Analytics','Flexible Deployment Options','Seamless Integration','Real-Time Processing','Scalable and Customizable','Secure and Compliant','Proven Track Record','Innovative AI-Driven Technology','Global Support and Expertise'];
  const row = [...items, ...items];
  return (
    <section style={{background:'#1a1d38',color:'#fff',padding:'28px 0',overflow:'hidden',borderTop:'1px solid #2a2e56',borderBottom:'1px solid #2a2e56'}}>
      <style>{`@keyframes mq { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      <div style={{display:'flex',gap:56,animation:'mq 60s linear infinite',whiteSpace:'nowrap',width:'max-content'}}>
        {row.map((t,i)=>(
          <span key={i} style={{fontFamily:'Lexend',fontWeight:300,fontSize:22,display:'inline-flex',alignItems:'center',gap:56}}>
            {t} <span style={{color:'#f99f25'}}>•</span>
          </span>
        ))}
      </div>
    </section>
  );
}
window.Marquee = Marquee;

```

### `ui_kits/sighthound-marketing/CustomerLogos.jsx`

```jsx
function CustomerLogos() {
  const customers = ['Argonne Lab','Atea','Lotus','Zepcam','Garmin','SafeFleet','Bynet','Consilio','Bioclinica','LensLock','Triumph','Transport Malta'];
  return (
    <section style={{padding:'96px 32px',background:'#fff',textAlign:'center'}}>
      <div className="overline" style={{marginBottom:12}}>Trusted partners</div>
      <h2 style={{fontSize:36,marginBottom:48,fontWeight:500}}>Over 2,800 customers & partners — in 47 countries.</h2>
      <div style={{maxWidth:1080,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:1,background:'#e4e8ef',border:'1px solid #e4e8ef',borderRadius:14,overflow:'hidden'}}>
        {customers.map(c => (
          <div key={c} style={{height:84,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Lexend',fontWeight:500,fontSize:14,color:'#9aa3b2',letterSpacing:'.02em',padding:'0 12px',textAlign:'center'}}>{c}</div>
        ))}
      </div>
    </section>
  );
}
window.CustomerLogos = CustomerLogos;

```

### `ui_kits/sighthound-marketing/Footer.jsx`

```jsx
function Footer() {
  const cols = [
    { h:'Solutions', items:['Retail & QSR','Law Enforcement','Parking & EV','Legal, FOIA & Evidence Review'] },
    { h:'Products', items:['Sighthound ALPR+','Sighthound Redactor','Sighthound Hardware','Sighthound Video'] },
    { h:'Support', items:['Frequently Asked Questions','Contact Sales','Create Support Ticket'] },
    { h:'About', items:['Blog','Team','Technology','Partners'] },
  ];
  return (
    <footer style={{background:'#1a1d38',color:'#fff',padding:'80px 32px 32px'}}>
      <div style={{maxWidth:1240,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:40,paddingBottom:48}}>
        {cols.map(c => (
          <div key={c.h}>
            <div style={{fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'.08em',color:'#8792e8',marginBottom:18}}>{c.h}</div>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:10}}>
              {c.items.map(i => <li key={i}><a href="#" style={{color:'#dee2f8',fontSize:14,fontWeight:300,textDecoration:'none'}}>{i}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{maxWidth:1240,margin:'0 auto',borderTop:'1px solid #2a2e56',paddingTop:32,display:'flex',justifyContent:'space-between',alignItems:'center',color:'#8792e8',fontSize:13}}>
        <img src="../../assets/sighthound-logo-white.png" style={{height:32}}/>
        <div>© 2026 Sighthound, Inc. &nbsp;·&nbsp; Privacy Policy &nbsp;·&nbsp; Terms of Use</div>
      </div>
    </footer>
  );
}
window.Footer = Footer;

```

### `ui_kits/sighthound-marketing/index.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sighthound — Marketing UI Kit (v0.9.1)</title>
<link rel="stylesheet" href="../../colors_and_type.css">
<style>html,body{margin:0;background:#fff}</style>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" src="Nav.jsx"></script>
<script type="text/babel" src="Hero.jsx"></script>
<script type="text/babel" src="Capabilities.jsx"></script>
<script type="text/babel" src="ProductSpotlight.jsx"></script>
<script type="text/babel" src="Stats.jsx"></script>
<script type="text/babel" src="Schematic.jsx"></script>
<script type="text/babel" src="Marquee.jsx"></script>
<script type="text/babel" src="CustomerLogos.jsx"></script>
<script type="text/babel" src="Footer.jsx"></script>
<script type="text/babel" data-presets="env,react">
  function App() {
    return (
      <div data-screen-label="sighthound-home">
        <Nav />
        <Hero />
        <Capabilities />
        <ProductSpotlight />
        <Stats />
        <Schematic />
        <Marquee />
        <CustomerLogos />
        <Footer />
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
</body>
</html>

```

---

<a id="8-ui-kit--sighthound-alpr-app"></a>
## 8. UI kit — Sighthound ALPR+ app

# Sighthound ALPR+ — UI kit (v0.9.1)

A live-operations console for the flagship Automatic License Plate Recognition + MMCG
product. Demonstrates the v0.9.1 composition-first system applied to a heavy-data product
surface — almost no stock imagery, fully recognizable as Sighthound.

## What's in here

- **`AppShell.jsx`** — Navy sidebar (consistent with Redactor), Sighthound logo (ALPR+
  has no dedicated wordmark yet — see `DECISIONS_LOG.md` #4), nav with watchlist count
  badge, persona: *T. Marquez · City of Phoenix · Traffic Operations*.
- **`AppShell.jsx`** also exports a `TopBar` with live-pulse indicator (14.3 / min),
  Pause Stream / Export / + Add filter actions.
- **`EventStream.jsx`** — filter-chip bar (active filters as removable pills) + search
  input + scrollable detection list. Each row: confidence dot · timestamp ·
  plate badge · MMCG · site/lane · status pill · numeric confidence. Watchlist hits get
  a `#f99f25` left border; alert hits get `#f62470`. Active row is `#4f60dc` outlined.
- **`VehicleDetail.jsx`** — right pane with:
  - Plate badge + MMCG header
  - **Evidence frame placeholder** — composition motif, not a stock photo. `.sh-pattern-scan`
    background with drawn SVG detection bounding boxes ("VEHICLE · 98%", "PLATE · 99%")
    over abstract lane lines. Includes burned-in frame # and timestamp.
  - 4 supplementary frame thumbnails (also pattern-only).
  - Profile fields (Make / Model / Year / Color / Region / Generation).
  - Confidence bar — color-coded green / blurple / orange by threshold.
  - **Mini-map** — abstract topographic pattern with road lines and a Sighthound-blue marker.
  - Actions (+ Watchlist · Export evidence · Flag).

Open `index.html` for the assembled console.

## v0.9.1 demonstration

Things this kit shows *without* stock photography:
- Live operations feel (pulse indicator, streaming events list)
- Vehicle evidence (SVG bounding boxes over scan-line pattern)
- Geographic context (topo-pattern mini-map)
- Confidence (color-coded bar)
- All metadata as structured data, not captions

Photography would only earn its place here if a real captured frame was being reviewed
post-hoc — and even then, the system's evidence-frame layout handles that without forcing
the visual.

## Notes
- Built on `../../colors_and_type.css` (v0.9.1).
- Reuses brand tokens; no codebase / Figma reference provided.
- Persona, sites and plates are illustrative.
- No internal ALPR+ codebase was attached; refactor to real component APIs when one lands.


### `ui_kits/alpr-app/AppShell.jsx`

```jsx
const { useState } = React;

function AppShell({ children }) {
  const nav = [
    { k:'live',      l:'Live operations', i:'M3 12h4l2-6 4 12 2-6h4 M21 12h-2' },
    { k:'search',    l:'Search',          i:'M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.3-4.3' },
    { k:'vehicles',  l:'Vehicles',        i:'M3 13l1.5-5h11L17 13 M3 13h14v5H3z M6 18v2 M14 18v2' },
    { k:'sites',     l:'Sites & lanes',   i:'M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z M12 11a2 2 0 100-4 2 2 0 000 4z' },
    { k:'analytics', l:'Analytics',       i:'M3 3v18h18 M7 14l4-4 3 3 5-6' },
    { k:'watchlist', l:'Watchlist',       i:'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z', count:4 },
    { k:'settings',  l:'Settings',        i:'M12 8a4 4 0 100 8 4 4 0 000-8z M19 12a7 7 0 00-.2-1.7l2-1.5-2-3.4-2.3.9a7 7 0 00-3-1.7L13 2h-2l-.5 2.6a7 7 0 00-3 1.7l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-.9a7 7 0 003 1.7L11 22h2l.5-2.6a7 7 0 003-1.7l2.3.9 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z' },
  ];
  const [active, setActive] = useState('live');
  return (
    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',height:'100vh',background:'#f6f8fb',fontFamily:'Lexend',fontWeight:400,color:'#1a1d38'}}>
      <aside style={{background:'#1a1d38',color:'#fff',padding:'20px 14px',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 8px 12px'}}>
          <img src="../../assets/sighthound-logo-white.png" style={{height:30}}/>
        </div>
        <div style={{padding:'0 8px 18px',borderBottom:'1px solid #2a2e56',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:'#8792e8',textTransform:'uppercase',letterSpacing:'.08em'}}>ALPR+</div>
          <div style={{fontSize:13,color:'#dee2f8',marginTop:2}}>City of Phoenix</div>
        </div>
        <nav style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
          {nav.map(n => (
            <button key={n.k} onClick={()=>setActive(n.k)} style={{textAlign:'left',background:active===n.k?'#2a2e56':'transparent',border:0,color:active===n.k?'#fff':'#dee2f8',fontFamily:'Lexend',fontSize:14,fontWeight:400,padding:'10px 12px',borderRadius:8,cursor:'pointer',display:'flex',gap:10,alignItems:'center',position:'relative'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={n.i}/></svg>
              <span style={{flex:1}}>{n.l}</span>
              {n.count !== undefined && <span style={{fontSize:10,padding:'1px 7px',borderRadius:999,background:'#f99f25',color:'#1a1d38',fontWeight:600}}>{n.count}</span>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:'1px solid #2a2e56',paddingTop:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:999,background:'linear-gradient(135deg,#4f60dc,#f62470)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'#fff'}}>TM</div>
          <div style={{fontSize:13,flex:1,minWidth:0}}>
            <div style={{fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>T. Marquez</div>
            <div style={{color:'#8792e8',fontSize:11}}>Traffic Operations</div>
          </div>
        </div>
      </aside>
      <div style={{display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}>
        {children}
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header style={{background:'#fff',borderBottom:'1px solid #e4e8ef',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:18}}>
        <div>
          <div style={{fontSize:18,fontWeight:500,color:'#1a1d38'}}>Live operations</div>
          <div style={{fontSize:12,color:'#64708a'}}>All 12 sites · 47 active lanes</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#e7f4ed',borderRadius:999,fontSize:12,fontWeight:500,color:'#1f9d55'}}>
          <span style={{width:8,height:8,borderRadius:999,background:'#1f9d55',boxShadow:'0 0 0 4px rgba(31,157,85,.20)'}}/>
          Live · 14.3 / min
        </div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <button style={{border:'1px solid #d9dfe6',background:'#fff',padding:'9px 14px',borderRadius:10,fontSize:13,color:'#1a1d38',cursor:'pointer',display:'flex',gap:6,alignItems:'center'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          Pause stream
        </button>
        <button style={{border:'1px solid #d9dfe6',background:'#fff',padding:'9px 14px',borderRadius:10,fontSize:13,color:'#1a1d38',cursor:'pointer'}}>Export</button>
        <button style={{border:0,background:'#4f60dc',color:'#fff',padding:'9px 16px',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'Lexend',fontWeight:400}}>+ Add filter</button>
      </div>
    </header>
  );
}

window.AlprAppShell = AppShell;
window.AlprTopBar = TopBar;

```

### `ui_kits/alpr-app/EventStream.jsx`

```jsx
const EVENTS = [
  { id:'e01', t:'09:42:18', plate:'7ABC123', region:'CA', make:'Tesla',  model:'Model 3', year:2023, color:'White',  conf:0.98, site:'Loop 202',  lane:'WB · 3', flag:null      },
  { id:'e02', t:'09:42:11', plate:'4XKD891', region:'NV', make:'Ford',   model:'F-150',   year:2020, color:'Silver', conf:0.96, site:'Camelback', lane:'NB · 1', flag:null      },
  { id:'e03', t:'09:42:04', plate:'8RTL204', region:'CA', make:'Toyota', model:'Camry',   year:2018, color:'Black',  conf:0.99, site:'I-10',      lane:'EB · 4', flag:'watch'   },
  { id:'e04', t:'09:41:55', plate:'2GHM559', region:'AZ', make:'Honda',  model:'CR-V',    year:2021, color:'Blue',   conf:0.94, site:'Camelback', lane:'SB · 2', flag:null      },
  { id:'e05', t:'09:41:30', plate:'9PLN710', region:'CA', make:'BMW',    model:'X5',      year:2019, color:'Gray',   conf:0.97, site:'Loop 202',  lane:'EB · 1', flag:null      },
  { id:'e06', t:'09:41:18', plate:'3SDR882', region:'CA', make:'Chevy',  model:'Tahoe',   year:2022, color:'Black',  conf:0.99, site:'I-10',      lane:'EB · 3', flag:'alert'   },
  { id:'e07', t:'09:41:02', plate:'5JKF291', region:'TX', make:'Ram',    model:'1500',    year:2017, color:'Red',    conf:0.91, site:'Loop 202',  lane:'WB · 2', flag:null      },
  { id:'e08', t:'09:40:47', plate:'1WQM004', region:'CA', make:'Toyota', model:'RAV4',    year:2024, color:'White',  conf:0.95, site:'Camelback', lane:'NB · 2', flag:null      },
  { id:'e09', t:'09:40:22', plate:'6BVC553', region:'NV', make:'Subaru', model:'Outback', year:2019, color:'Green',  conf:0.93, site:'I-10',      lane:'WB · 4', flag:null      },
  { id:'e10', t:'09:39:51', plate:'8ZTP118', region:'AZ', make:'Hyundai',model:'Elantra', year:2021, color:'Silver', conf:0.96, site:'Loop 202',  lane:'EB · 2', flag:null      },
  { id:'e11', t:'09:39:18', plate:'4MKR777', region:'CA', make:'Tesla',  model:'Y',       year:2022, color:'Blue',   conf:0.98, site:'Camelback', lane:'SB · 3', flag:null      },
  { id:'e12', t:'09:38:55', plate:'2NDS104', region:'CA', make:'GMC',    model:'Sierra',  year:2020, color:'White',  conf:0.94, site:'I-10',      lane:'EB · 1', flag:null      },
];

window.EVENTS = EVENTS;

function EventStream({ activeId, onSelect }) {
  const conf = (c) => c >= 0.95 ? '#1f9d55' : c >= 0.90 ? '#4f60dc' : '#f99f25';
  return (
    <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* Filter chips */}
      <div style={{padding:'14px 24px',background:'#fff',borderBottom:'1px solid #e4e8ef',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        {[
          {l:'All sites',active:true,close:false},
          {l:'Last 1 h',active:true,close:true},
          {l:'Confidence > 0.85',active:true,close:true},
        ].map(c => (
          <span key={c.l} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',background:c.active?'#eef1fc':'#fff',color:'#2e3ba4',border:'1px solid #dee2f8',borderRadius:999,fontSize:12,fontWeight:500}}>
            {c.l}
            {c.close && <button style={{border:0,background:'none',color:'#4f60dc',cursor:'pointer',fontSize:13,padding:0,lineHeight:1}}>×</button>}
          </span>
        ))}
        <div style={{marginLeft:'auto',position:'relative',width:240}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa3b2" strokeWidth="1.75" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" strokeLinecap="round"/></svg>
          <input placeholder="Search plate, MMCG, site…" style={{width:'100%',padding:'8px 12px 8px 32px',border:'1px solid #d9dfe6',borderRadius:8,fontSize:13,fontFamily:'Lexend',color:'#1a1d38'}}/>
        </div>
      </div>

      {/* Event list */}
      <div style={{flex:1,overflow:'auto',padding:'14px 24px 24px'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10,paddingLeft:4}}>Today</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {EVENTS.map(e => {
            const isActive = e.id === activeId;
            const flagBg = e.flag === 'alert' ? '#fdebf2' : e.flag === 'watch' ? '#fef4e0' : null;
            const flagFg = e.flag === 'alert' ? '#f62470' : e.flag === 'watch' ? '#f05d22' : null;
            return (
              <button key={e.id} onClick={()=>onSelect(e.id)} style={{textAlign:'left',background:isActive?'#eef1fc':'#fff',border:'1px solid '+(isActive?'#4f60dc':'#e4e8ef'),borderLeft:'3px solid '+(isActive?'#4f60dc':e.flag==='alert'?'#f62470':e.flag==='watch'?'#f99f25':'transparent'),borderRadius:10,padding:'12px 14px',display:'grid',gridTemplateColumns:'12px 80px 130px 1fr 130px 60px',gap:14,alignItems:'center',cursor:'pointer',fontFamily:'Lexend'}}>
                <span style={{width:8,height:8,borderRadius:999,background:conf(e.conf),justifySelf:'center'}}/>
                <span style={{fontSize:12,color:'#64708a',fontFamily:'SF Mono, Menlo, monospace',fontVariantNumeric:'tabular-nums'}}>{e.t}</span>
                <span style={{padding:'3px 8px',background:'#1a1d38',color:'#fff',borderRadius:6,fontSize:11,fontWeight:600,fontFamily:'SF Mono, Menlo, monospace',letterSpacing:'.04em',width:'fit-content'}}>{e.region} · {e.plate}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#1a1d38',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.color} {e.year} {e.make} {e.model}</div>
                  <div style={{fontSize:11,color:'#64708a'}}>{e.site} · {e.lane}</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {flagBg && <span style={{padding:'2px 8px',borderRadius:999,background:flagBg,color:flagFg,fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>{e.flag==='alert'?'Alert':'Watchlist'}</span>}
                </div>
                <div style={{fontSize:11,color:'#64708a',textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{e.conf.toFixed(2)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
window.AlprEventStream = EventStream;

```

### `ui_kits/alpr-app/VehicleDetail.jsx`

```jsx
function VehicleDetail({ event }) {
  if (!event) return <aside style={{width:380,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:24,color:'#64708a',fontFamily:'Lexend'}}>Select an event to see vehicle details.</aside>;
  const confColor = event.conf >= 0.95 ? '#1f9d55' : event.conf >= 0.90 ? '#4f60dc' : '#f99f25';
  return (
    <aside style={{width:380,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:0,overflow:'auto',display:'flex',flexDirection:'column',fontFamily:'Lexend'}}>
      <div style={{padding:'22px 22px 18px',borderBottom:'1px solid #eef1fc'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <span style={{padding:'5px 10px',background:'#1a1d38',color:'#fff',borderRadius:8,fontSize:14,fontWeight:600,fontFamily:'SF Mono, Menlo, monospace',letterSpacing:'.04em'}}>{event.region} · {event.plate}</span>
          {event.flag === 'alert' && <span style={{padding:'3px 8px',borderRadius:999,background:'#fdebf2',color:'#f62470',fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Alert</span>}
          {event.flag === 'watch' && <span style={{padding:'3px 8px',borderRadius:999,background:'#fef4e0',color:'#f05d22',fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em'}}>Watchlist</span>}
        </div>
        <div style={{fontSize:20,fontWeight:500,color:'#1a1d38',lineHeight:1.2,marginBottom:2}}>{event.color} {event.year} {event.make} {event.model}</div>
        <div style={{fontSize:12,color:'#64708a'}}>Captured {event.t} · {event.site} · {event.lane}</div>
      </div>

      {/* Evidence frame placeholder — composition motif, not stock imagery */}
      <div style={{margin:'18px 22px 8px',position:'relative'}}>
        <div className="sh-pattern-scan" style={{position:'relative',background:'#1a1d38',borderRadius:12,aspectRatio:'16/9',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg viewBox="0 0 320 180" width="100%" height="100%" style={{position:'absolute',inset:0}}>
            {/* simulated lane lines */}
            <g stroke="rgba(255,255,255,.08)" strokeWidth="1">
              <path d="M0,150 Q160,90 320,150"/>
              <path d="M0,90 Q160,40 320,90"/>
              <path d="M0,180 Q160,140 320,180" strokeDasharray="6 8"/>
            </g>
            {/* detection bbox */}
            <g>
              <rect x="118" y="76" width="86" height="58" fill="none" stroke="#4f60dc" strokeWidth="2"/>
              <rect x="118" y="61" width="58" height="14" fill="#4f60dc"/>
              <text x="124" y="72" fill="#fff" fontSize="9" fontFamily="SF Mono, Menlo, monospace" fontWeight="600">VEHICLE · {(event.conf*100).toFixed(0)}%</text>
              {/* plate bbox */}
              <rect x="140" y="116" width="42" height="11" fill="none" stroke="#f99f25" strokeWidth="1.5"/>
              <rect x="140" y="105" width="36" height="10" fill="#f99f25"/>
              <text x="143" y="113" fill="#1a1d38" fontSize="7" fontFamily="SF Mono, Menlo, monospace" fontWeight="600">PLATE · 99%</text>
            </g>
          </svg>
          <div style={{position:'absolute',bottom:8,left:10,fontSize:9,color:'#dee2f8',fontFamily:'SF Mono, Menlo, monospace',letterSpacing:'.05em',display:'flex',gap:10}}>
            <span>16:9 EVIDENCE</span>
            <span>· F#82914</span>
            <span>· {event.t}</span>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          {[1,2,3,4].map(i=>(
            <div key={i} className="sh-pattern-scan" style={{flex:1,aspectRatio:'16/9',background:'#1a1d38',borderRadius:6,opacity:.5 + i*0.12}}/>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div style={{padding:'14px 22px 8px'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Profile</div>
        <dl style={{margin:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 14px'}}>
          {[
            ['Make', event.make],
            ['Model', event.model],
            ['Year', event.year],
            ['Color', event.color],
            ['Region', event.region],
            ['Generation', event.year >= 2020 ? '6th' : '5th'],
          ].map(([k,v])=>(
            <div key={k}>
              <dt style={{fontSize:10,color:'#64708a',textTransform:'uppercase',letterSpacing:'.06em',fontWeight:600}}>{k}</dt>
              <dd style={{margin:0,fontSize:13,color:'#1a1d38',fontWeight:500}}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Confidence bar */}
      <div style={{padding:'14px 22px',borderTop:'1px solid #eef1fc',marginTop:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em'}}>Confidence</div>
          <div style={{fontSize:14,fontWeight:500,color:confColor,fontVariantNumeric:'tabular-nums'}}>{event.conf.toFixed(2)}</div>
        </div>
        <div style={{height:6,background:'#eff3f7',borderRadius:999,overflow:'hidden'}}>
          <div style={{height:'100%',width:(event.conf*100)+'%',background:confColor,borderRadius:999}}/>
        </div>
      </div>

      {/* Mini map */}
      <div style={{padding:'14px 22px',borderTop:'1px solid #eef1fc'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Location</div>
        <div className="sh-pattern-topo" style={{position:'relative',background:'#f6f8fb',borderRadius:10,height:120,border:'1px solid #e4e8ef',overflow:'hidden'}}>
          <svg viewBox="0 0 320 120" width="100%" height="100%" style={{position:'absolute',inset:0}}>
            {/* Abstract road lines */}
            <g stroke="#9aa3b2" strokeWidth="1.5" fill="none" strokeLinecap="round">
              <path d="M-10,40 Q80,30 160,55 T330,70"/>
              <path d="M-10,80 Q80,70 160,90 T330,100"/>
              <line x1="60" y1="0" x2="100" y2="120" stroke="#d9dfe6" strokeWidth="1"/>
              <line x1="220" y1="0" x2="240" y2="120" stroke="#d9dfe6" strokeWidth="1"/>
            </g>
            {/* Marker */}
            <g transform="translate(170,58)">
              <circle r="10" fill="rgba(79,96,220,.18)"/>
              <circle r="5" fill="#4f60dc" stroke="#fff" strokeWidth="2"/>
            </g>
          </svg>
          <div style={{position:'absolute',left:10,bottom:8,fontSize:10,color:'#4b4f73',fontFamily:'SF Mono, Menlo, monospace'}}>33.5°N · 112.0°W</div>
        </div>
        <div style={{fontSize:13,color:'#1a1d38',marginTop:8,fontWeight:500}}>{event.site}</div>
        <div style={{fontSize:11,color:'#64708a'}}>Lane {event.lane}</div>
      </div>

      {/* Actions */}
      <div style={{padding:'18px 22px 24px',borderTop:'1px solid #eef1fc',marginTop:'auto',display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn btn-primary" style={{padding:'9px 14px',fontSize:13,borderRadius:8}}>+ Watchlist</button>
        <button className="btn btn-secondary" style={{padding:'9px 14px',fontSize:13,borderRadius:8}}>Export evidence</button>
        <button style={{border:0,background:'transparent',color:'#f62470',padding:'9px 12px',fontSize:13,cursor:'pointer',fontFamily:'Lexend',fontWeight:500}}>Flag</button>
      </div>
    </aside>
  );
}
window.AlprVehicleDetail = VehicleDetail;

```

### `ui_kits/alpr-app/index.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sighthound ALPR+ — App UI Kit (v0.9.1)</title>
<link rel="stylesheet" href="../../colors_and_type.css">
<style>html,body,#root{margin:0;height:100%;background:#f6f8fb;overflow:hidden}</style>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" src="AppShell.jsx"></script>
<script type="text/babel" src="EventStream.jsx"></script>
<script type="text/babel" src="VehicleDetail.jsx"></script>
<script type="text/babel" data-presets="env,react">
const { useState } = React;
function App() {
  const [activeId, setActiveId] = useState('e01');
  const active = window.EVENTS.find(e => e.id === activeId);
  return (
    <div data-screen-label="alpr-live-operations">
      <AlprAppShell>
        <AlprTopBar />
        <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
          <AlprEventStream activeId={activeId} onSelect={setActiveId}/>
          <AlprVehicleDetail event={active}/>
        </div>
      </AlprAppShell>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
</script>
</body>
</html>

```

---

<a id="9-ui-kit--sighthound-redactor-app"></a>
## 9. UI kit — Sighthound Redactor app

# Sighthound Redactor — UI kit (v0.9.1)

A hi-fi recreation of the Redactor desktop/web application UI for video redaction.

## v0.9.1 polish (chrome alignment)

Refined to match the ALPR+ app pattern so all Sighthound product UIs share one shell language:

- **Sidebar** — product overline + persona subtitle pattern (Redactor · Heritage School District). New `+ New project` CTA visually matches ALPR+. Detectors nav item now carries a count badge.
- **Persona** — `K. Skelly · Legal & Compliance` shown as monogram on a warm gradient avatar.
- **TopBar** — adopted the live-pulse pattern from ALPR+: an orange `Processing · 2 jobs in queue` pill (matches the product's bulk/batch nature). Auto-save chip retained.
- **DetectionPanel** — added a *Detections over time* bar-spark (per-10s buckets) and a topo-patterned compliance footer reinforcing CJIS / FOIA / GDPR.

Imagery treatment is unchanged — the footage being redacted *is* the work, so it remains product-essential.

## Components
- `AppShell.jsx` — sidebar (Navy, v0.9.1 aligned) + TopBar with processing pill
- `MediaList.jsx` — project file list with status pills (Redacted / Processing / Ready)
- `VideoCanvas.jsx` — playback with detection overlays + scrubber
- `DetectionPanel.jsx` — right panel: detection counts + over-time sparkline + detection list + compliance footer

Open `index.html` for the assembled app view.

## Caveats
- Built from marketing site + brand tokens only; no internal codebase provided.
- For pixel-perfect fidelity, attach the real codebase.
- The packaged standalone (`Sighthound Redactor App.html` at project root) is from v0.9 —
  regenerate if you need a portable file that reflects the v0.9.1 polish.


### `ui_kits/redactor-app/AppShell.jsx`

```jsx
const { useState } = React;

function AppShell({ children, active, onNav }) {
  const nav = [
    { k:'projects', l:'Projects',  i:'M3 7h18M3 12h18M3 17h12' },
    { k:'editor',   l:'Editor',    i:'M12 4v16m8-8H4' },
    { k:'library',  l:'Library',   i:'M4 4h16v16H4z M4 10h16' },
    { k:'detectors',l:'Detectors', i:'M12 8a4 4 0 100 8 4 4 0 000-8z M3 12h2 M19 12h2 M12 3v2 M12 19v2', count:8 },
    { k:'activity', l:'Activity',  i:'M4 12h4l2-6 4 12 2-6h4' },
    { k:'settings', l:'Settings',  i:'M12 8a4 4 0 100 8 4 4 0 000-8z' },
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',height:'100vh',background:'#f6f8fb',fontFamily:'Lexend',fontWeight:400,color:'#1a1d38'}}>
      <aside style={{background:'#1a1d38',color:'#fff',padding:'20px 14px',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 8px 12px'}}>
          <img src="../../assets/redactor-logo-horizontal.webp" style={{height:28,filter:'brightness(0) invert(1)'}}/>
        </div>
        <div style={{padding:'0 8px 18px',borderBottom:'1px solid #2a2e56',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:'#8792e8',textTransform:'uppercase',letterSpacing:'.08em'}}>Redactor</div>
          <div style={{fontSize:13,color:'#dee2f8',marginTop:2}}>Heritage School District</div>
        </div>
        <button className="btn btn-primary" style={{margin:'0 6px 14px',padding:'11px 14px',fontSize:13,background:'#4f60dc',borderRadius:10}}>+ New project</button>
        <nav style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
          {nav.map(n=>(
            <button key={n.k} onClick={()=>onNav?.(n.k)} style={{textAlign:'left',background:active===n.k?'#2a2e56':'transparent',border:0,color:active===n.k?'#fff':'#dee2f8',fontFamily:'Lexend',fontSize:14,fontWeight:400,padding:'10px 12px',borderRadius:8,cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={n.i}/></svg>
              <span style={{flex:1}}>{n.l}</span>
              {n.count !== undefined && <span style={{fontSize:10,padding:'1px 7px',borderRadius:999,background:'rgba(135,146,232,.2)',color:'#dee2f8',fontWeight:600}}>{n.count}</span>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:'1px solid #2a2e56',paddingTop:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:999,background:'linear-gradient(135deg,#f99f25,#f62470)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'#fff'}}>KS</div>
          <div style={{fontSize:13,flex:1,minWidth:0}}>
            <div style={{fontWeight:500}}>K. Skelly</div>
            <div style={{color:'#8792e8',fontSize:11}}>Legal & Compliance</div>
          </div>
        </div>
      </aside>
      <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
        {children}
      </div>
    </div>
  );
}

function TopBar({ title, subtitle }) {
  return (
    <header style={{background:'#fff',borderBottom:'1px solid #e4e8ef',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:18,minWidth:0,flex:1}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:18,fontWeight:500,color:'#1a1d38',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</div>
          {subtitle && <div style={{fontSize:12,color:'#64708a'}}>{subtitle}</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#fff4e0',borderRadius:999,fontSize:12,fontWeight:500,color:'#f05d22'}}>
          <span style={{width:8,height:8,borderRadius:999,background:'#f99f25',boxShadow:'0 0 0 4px rgba(249,159,37,.20)'}}/>
          Processing · 2 jobs in queue
        </div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <div style={{padding:'6px 12px',background:'#eef1fc',color:'#2e3ba4',borderRadius:999,fontSize:12,fontWeight:500}}>Auto-saved · just now</div>
        <button style={{border:'1px solid #d9dfe6',background:'#fff',padding:'9px 14px',borderRadius:10,fontSize:13,color:'#1a1d38',cursor:'pointer'}}>Preview</button>
        <button style={{border:0,background:'#4f60dc',color:'#fff',padding:'9px 16px',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'Lexend',fontWeight:400}}>Export</button>
      </div>
    </header>
  );
}
window.AppShell = AppShell;
window.TopBar = TopBar;

```

### `ui_kits/redactor-app/MediaList.jsx`

```jsx
function MediaList({ items, activeId, onSelect }) {
  return (
    <div style={{width:280,background:'#fff',borderRight:'1px solid #e4e8ef',padding:16,overflow:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div className="overline">Project files</div>
        <button style={{border:0,background:'#eef1fc',color:'#4f60dc',padding:'4px 10px',borderRadius:999,fontSize:11,fontWeight:500,cursor:'pointer'}}>+ Upload</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {items.map(it=>{
          const isActive = it.id===activeId;
          const sColor = it.status==='Redacted'?'#1f9d55':it.status==='Processing'?'#f99f25':'#64708a';
          const sBg    = it.status==='Redacted'?'#e7f4ed':it.status==='Processing'?'#fff4e0':'#eff3f7';
          return (
            <button key={it.id} onClick={()=>onSelect?.(it.id)} style={{textAlign:'left',background:isActive?'#eef1fc':'#fff',border:'1px solid '+(isActive?'#4f60dc':'#e4e8ef'),borderRadius:10,padding:10,display:'flex',gap:10,cursor:'pointer',fontFamily:'Lexend'}}>
              <div style={{width:56,height:40,borderRadius:6,background:'#1a1d38',overflow:'hidden',flexShrink:0}}>
                {it.thumb && <img src={it.thumb} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1d38',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{it.name}</div>
                <div style={{fontSize:11,color:'#64708a',marginTop:2}}>{it.duration} · {it.size}</div>
                <span style={{display:'inline-block',marginTop:5,fontSize:10,fontWeight:500,color:sColor,background:sBg,padding:'2px 8px',borderRadius:999}}>{it.status}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
window.MediaList = MediaList;

```

### `ui_kits/redactor-app/VideoCanvas.jsx`

```jsx
function VideoCanvas({ src, detections, playing, onTogglePlay, time, duration }) {
  return (
    <div style={{flex:1,padding:20,display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}>
      <div style={{flex:1,background:'#1a1d38',borderRadius:14,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 20px rgba(26,29,56,.10)'}}>
        <img src={src} style={{width:'100%',height:'100%',objectFit:'cover',opacity:.92}}/>
        {/* Detection overlays */}
        {detections.map((d,i)=>(
          <div key={i} style={{position:'absolute',left:d.x+'%',top:d.y+'%',width:d.w+'%',height:d.h+'%',border:'2px solid '+(d.type==='face'?'#f62470':d.type==='plate'?'#f99f25':'#4f60dc'),borderRadius:6,background:'rgba(26,29,56,.55)',backdropFilter:'blur(8px)',pointerEvents:'none'}}>
            <div style={{position:'absolute',top:-20,left:-2,padding:'2px 8px',background:d.type==='face'?'#f62470':d.type==='plate'?'#f99f25':'#4f60dc',color:'#fff',fontSize:10,borderRadius:4,fontWeight:500,fontFamily:'Lexend',textTransform:'uppercase',letterSpacing:'.06em'}}>{d.type} · {d.conf}%</div>
          </div>
        ))}
        <div style={{position:'absolute',top:14,left:14,padding:'6px 12px',background:'rgba(26,29,56,.7)',color:'#fff',borderRadius:999,fontSize:11,fontFamily:'Lexend',fontWeight:500,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:6,height:6,borderRadius:999,background:'#f62470'}}/> REC · Bodycam 04
        </div>
      </div>
      <div style={{marginTop:14,display:'flex',alignItems:'center',gap:14,padding:'10px 14px',background:'#fff',border:'1px solid #e4e8ef',borderRadius:12}}>
        <button onClick={onTogglePlay} style={{width:40,height:40,borderRadius:999,background:'#4f60dc',color:'#fff',border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {playing ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                   : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l14 8-14 8z"/></svg>}
        </button>
        <div style={{fontSize:12,color:'#4b4f73',fontVariantNumeric:'tabular-nums',fontFamily:'Lexend',fontWeight:500}}>{time} / {duration}</div>
        <div style={{flex:1,height:6,background:'#eff3f7',borderRadius:999,position:'relative'}}>
          <div style={{position:'absolute',inset:'0 60% 0 0',background:'linear-gradient(90deg,#4f60dc,#f62470)',borderRadius:999}}/>
          <div style={{position:'absolute',left:'40%',top:-4,width:14,height:14,borderRadius:999,background:'#fff',border:'2px solid #4f60dc',boxShadow:'0 2px 6px rgba(26,29,56,.2)'}}/>
        </div>
        <div style={{fontSize:11,color:'#64708a'}}>1.0×</div>
      </div>
    </div>
  );
}
window.VideoCanvas = VideoCanvas;

```

### `ui_kits/redactor-app/DetectionPanel.jsx`

```jsx
function DetectionPanel({ detections, onToggle }) {
  const colorFor = t => t==='face'?'#f62470':t==='plate'?'#f99f25':t==='audio'?'#4f60dc':'#64708a';
  // Detections over time (per 10s bucket)
  const buckets = [3,5,4,7,6,9,11,8,12,10,14,11,9,7,5,4];
  const maxB = Math.max(...buckets);
  return (
    <aside style={{width:320,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:0,overflow:'auto',display:'flex',flexDirection:'column',fontFamily:'Lexend'}}>
      <div style={{padding:'18px 18px 14px',borderBottom:'1px solid #eef1fc'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Auto-detected</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[['Faces',12,'#f62470'],['Plates',4,'#f99f25'],['People',7,'#4f60dc'],['Screens',1,'#1a1d38']].map(([l,n,c])=>(
            <div key={l} style={{padding:10,background:'#f6f8fb',borderRadius:10}}>
              <div style={{fontSize:22,fontWeight:500,color:c,fontFamily:'Lexend',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{n}</div>
              <div style={{fontSize:11,color:'#64708a',marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution sparkline */}
      <div style={{padding:'14px 18px',borderBottom:'1px solid #eef1fc'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em'}}>Detections over time</div>
          <div style={{fontSize:11,color:'#64708a'}}>per 10 s</div>
        </div>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:48}}>
          {buckets.map((b,i)=>(
            <div key={i} style={{flex:1,height:(b/maxB*100)+'%',background:i===7?'#4f60dc':'#dee2f8',borderRadius:2,minHeight:2}}/>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#9aa3b2',marginTop:4,fontVariantNumeric:'tabular-nums'}}>
          <span>00:00</span><span>02:14</span>
        </div>
      </div>

      <div style={{padding:'14px 18px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em'}}>Detections</div>
          <a href="#" style={{fontSize:11,fontWeight:500}}>Invert</a>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {detections.map((d,i)=>(
            <label key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',border:'1px solid #e4e8ef',borderRadius:8,cursor:'pointer'}}>
              <input type="checkbox" checked={d.on} onChange={()=>onToggle?.(i)} style={{accentColor:'#4f60dc'}}/>
              <span style={{width:8,height:8,borderRadius:999,background:colorFor(d.type)}}/>
              <span style={{fontSize:13,color:'#1a1d38',textTransform:'capitalize',fontFamily:'Lexend'}}>{d.type} #{String(i+1).padStart(2,'0')}</span>
              <span style={{marginLeft:'auto',fontSize:11,color:'#64708a',fontFamily:'SF Mono, Menlo, monospace',fontVariantNumeric:'tabular-nums'}}>{d.t}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{marginTop:'auto',padding:'14px 18px 18px'}}>
        <div className="sh-pattern-topo" style={{padding:14,background:'#eef1fc',borderRadius:12,position:'relative',overflow:'hidden'}}>
          <div style={{position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e3ba4" strokeWidth="1.75"><path d="M12 2L3 7v6c0 5 4 9 9 10 5-1 9-5 9-10V7l-9-5z"/></svg>
              <div style={{fontSize:12,fontWeight:500,color:'#2e3ba4'}}>CJIS · FOIA · GDPR-ready</div>
            </div>
            <div style={{fontSize:12,color:'#4b4f73',lineHeight:1.5}}>Media never leaves your environment. Chain of custody preserved.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
window.DetectionPanel = DetectionPanel;

```

### `ui_kits/redactor-app/index.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sighthound Redactor — App UI Kit</title>
<link rel="stylesheet" href="../../colors_and_type.css">
<style>html,body,#root{margin:0;height:100%;background:#f6f8fb;overflow:hidden}</style>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" src="AppShell.jsx"></script>
<script type="text/babel" src="MediaList.jsx"></script>
<script type="text/babel" src="VideoCanvas.jsx"></script>
<script type="text/babel" src="DetectionPanel.jsx"></script>
<script type="text/babel" data-presets="env,react">
const { useState } = React;

const FILES = [
  { id:'f1', name:'Bodycam_04_2025-04-18.mp4', duration:'02:14', size:'118 MB', status:'Redacted', thumb:'../../assets/redactor-police.avif' },
  { id:'f2', name:'Interview_Room_3.mp4',       duration:'14:02', size:'512 MB', status:'Processing', thumb:'../../assets/redactor-courtroom-redacted.avif' },
  { id:'f3', name:'Crosswalk_cam_14.mp4',        duration:'00:42', size:'32 MB',  status:'Ready',      thumb:'../../assets/redactor-crosswalk.avif' },
  { id:'f4', name:'Toll_highway_2B.mp4',         duration:'03:28', size:'204 MB', status:'Ready',      thumb:'../../assets/redactor-cars-tolls.avif' },
  { id:'f5', name:'Hospital_lobby_02.mp4',       duration:'08:11', size:'340 MB', status:'Redacted',   thumb:'../../assets/redactor-hospital-redacted.avif' },
];

const DETECTIONS_IMG = {
  f1: '../../assets/redactor-police.avif',
  f2: '../../assets/redactor-courtroom-redacted.avif',
  f3: '../../assets/redactor-crosswalk.avif',
  f4: '../../assets/redactor-cars-tolls.avif',
  f5: '../../assets/redactor-hospital-redacted.avif',
};

function App() {
  const [active, setActive] = useState('f1');
  const [playing, setPlaying] = useState(false);
  const [dets, setDets] = useState([
    { type:'face',  on:true,  t:'00:02' },
    { type:'face',  on:true,  t:'00:05' },
    { type:'plate', on:true,  t:'00:07' },
    { type:'face',  on:false, t:'00:09' },
    { type:'audio', on:true,  t:'00:11' },
    { type:'plate', on:true,  t:'00:14' },
  ]);
  const boxes = [
    { type:'face',  x:20, y:24, w:12, h:18, conf:98 },
    { type:'face',  x:58, y:30, w:10, h:16, conf:94 },
    { type:'plate', x:42, y:64, w:18, h:7,  conf:99 },
  ];
  const file = FILES.find(f=>f.id===active);
  return (
    <div data-screen-label="redactor-editor">
      <AppShell active="editor">
        <TopBar title={file.name} subtitle="Law enforcement · FOIA-ready · 6 detections"/>
        <div style={{flex:1,display:'flex',minHeight:0}}>
          <MediaList items={FILES} activeId={active} onSelect={setActive}/>
          <VideoCanvas
            src={DETECTIONS_IMG[active]}
            detections={boxes}
            playing={playing}
            onTogglePlay={()=>setPlaying(p=>!p)}
            time="00:42" duration="02:14"
          />
          <DetectionPanel detections={dets} onToggle={i=>setDets(d=>d.map((x,j)=>j===i?{...x,on:!x.on}:x))}/>
        </div>
      </AppShell>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
</script>
</body>
</html>

```

---

<a id="10-ui-kit--sighthound-video-app"></a>
## 10. UI kit — Sighthound Video app

# Sighthound Video — UI kit (v0.9.1)

A live-monitoring console for the Sighthound Video VMS — the original Sighthound product.

## Where imagery earns its place

Sighthound Video is the **inverse** case for v0.9.1: live camera feeds *are* the work. The
6-tile camera grid uses real frames from `assets/` (each one chosen to look like a credible
surveillance feed). Composition motifs then frame and label that imagery rather than
substitute for it.

What's composition-led (no imagery):
- Sidebar chrome (Navy + product overline + persona)
- TopBar pulse pill (*12 / 14 cameras online*)
- Camera-tile overlays — label chip, REC/MOTION pulse status, burned-in timestamp + frame #, drawn detection bboxes
- Timeline — 4-hour per-camera motion bands with hour markers and a now-indicator
- Events panel — KPI tiles, filter chips, icon-led event rows

## Components

- **`AppShell.jsx`** — Navy sidebar (consistent with ALPR+ and Redactor), product overline
  *Video · Mercer Logistics*, nav with camera/event counts, persona *D. Patel · Security Ops*.
  Exports a `TopBar` with online-cameras pulse pill, a grid/focus/list layout toggle,
  audio mute and `+ Add camera`.
- **`CameraGrid.jsx`** — 3×2 grid of 16:9 camera tiles. Each tile has:
  - Real footage as the live feed
  - SVG-drawn detection bounding boxes with labels (`VEHICLE · 96%`, `PLATE`, `PERSON · 91%`)
  - Camera-name chip (top-left), REC/MOTION/OFFLINE pulse status (top-right)
  - Burned-in timestamp + frame # (bottom)
  - Selected tile gets a blurple border + 4px halo
- **`Timeline.jsx`** — 6-camera-row motion timeline over the past 4 hours. Motion / Vehicle /
  Plate event bands color-coded; hour grid; "now" indicator at the right edge.
- **`EventsPanel.jsx`** — Right pane with today-so-far KPI tiles, filter chips
  (All / Motion / Vehicle / Plate / Person), and an icon-led event feed with
  follow-up tagging.

Open `index.html` to see them assembled.

## Notes
- Built on `../../colors_and_type.css` (v0.9.1).
- Persona, site name and event data are illustrative.
- No internal Sighthound Video codebase was attached; refactor to real APIs if one lands.
- The 14:32:18 timestamp on every tile is deliberately uniform — a real VMS would show per-camera clocks.


### `ui_kits/video-app/AppShell.jsx`

```jsx
const { useState } = React;

function AppShell({ children }) {
  const nav = [
    { k:'live',       l:'Live monitoring', i:'M3 12h4l2-6 4 12 2-6h4 M21 12h-2' },
    { k:'cameras',    l:'Cameras',         i:'M3 7l3-3h12l3 3v12H3z M12 11a3 3 0 100 6 3 3 0 000-6z', count:14 },
    { k:'recordings', l:'Recordings',      i:'M3 4h18v16H3z M3 8h18 M7 4v16' },
    { k:'events',     l:'Events',          i:'M12 9v4 M12 17h.01 M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', count:23 },
    { k:'schedules',  l:'Schedules',       i:'M3 7h18 M3 12h18 M3 17h18 M7 3v4 M17 3v4' },
    { k:'users',      l:'Users & access',  i:'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M22 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75' },
    { k:'settings',   l:'Settings',        i:'M12 8a4 4 0 100 8 4 4 0 000-8z M19 12a7 7 0 00-.2-1.7l2-1.5-2-3.4-2.3.9a7 7 0 00-3-1.7L13 2h-2l-.5 2.6a7 7 0 00-3 1.7l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-.9a7 7 0 003 1.7L11 22h2l.5-2.6a7 7 0 003-1.7l2.3.9 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z' },
  ];
  const [active, setActive] = useState('live');
  return (
    <div style={{display:'grid',gridTemplateColumns:'240px 1fr',height:'100vh',background:'#f6f8fb',fontFamily:'Lexend',fontWeight:400,color:'#1a1d38'}}>
      <aside style={{background:'#1a1d38',color:'#fff',padding:'20px 14px',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 8px 12px'}}>
          <img src="../../assets/sighthound-logo-white.png" style={{height:30}}/>
        </div>
        <div style={{padding:'0 8px 18px',borderBottom:'1px solid #2a2e56',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:'#8792e8',textTransform:'uppercase',letterSpacing:'.08em'}}>Video</div>
          <div style={{fontSize:13,color:'#dee2f8',marginTop:2}}>Mercer Logistics</div>
        </div>
        <nav style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
          {nav.map(n => (
            <button key={n.k} onClick={()=>setActive(n.k)} style={{textAlign:'left',background:active===n.k?'#2a2e56':'transparent',border:0,color:active===n.k?'#fff':'#dee2f8',fontFamily:'Lexend',fontSize:14,fontWeight:400,padding:'10px 12px',borderRadius:8,cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={n.i}/></svg>
              <span style={{flex:1}}>{n.l}</span>
              {n.count !== undefined && <span style={{fontSize:10,padding:'1px 7px',borderRadius:999,background:'rgba(135,146,232,.2)',color:'#dee2f8',fontWeight:600}}>{n.count}</span>}
            </button>
          ))}
        </nav>
        <div style={{borderTop:'1px solid #2a2e56',paddingTop:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:999,background:'linear-gradient(135deg,#4f60dc,#f99f25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'#fff'}}>DP</div>
          <div style={{fontSize:13,flex:1,minWidth:0}}>
            <div style={{fontWeight:500}}>D. Patel</div>
            <div style={{color:'#8792e8',fontSize:11}}>Security Ops</div>
          </div>
        </div>
      </aside>
      <div style={{display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}>{children}</div>
    </div>
  );
}

function TopBar({ layout, onLayout }) {
  const opts = [
    { k:'grid', i:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
    { k:'focus', i:'M3 3h18v18H3z' },
    { k:'list', i:'M3 5h18 M3 12h18 M3 19h18' },
  ];
  return (
    <header style={{background:'#fff',borderBottom:'1px solid #e4e8ef',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
      <div style={{display:'flex',alignItems:'center',gap:18,minWidth:0}}>
        <div>
          <div style={{fontSize:18,fontWeight:500,color:'#1a1d38'}}>Live monitoring</div>
          <div style={{fontSize:12,color:'#64708a'}}>Mercer Logistics · West Yard</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#e7f4ed',borderRadius:999,fontSize:12,fontWeight:500,color:'#1f9d55'}}>
          <span style={{width:8,height:8,borderRadius:999,background:'#1f9d55',boxShadow:'0 0 0 4px rgba(31,157,85,.20)'}}/>
          12 / 14 cameras online
        </div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <div style={{display:'flex',padding:3,background:'#f6f8fb',border:'1px solid #e4e8ef',borderRadius:10}}>
          {opts.map(o=>(
            <button key={o.k} onClick={()=>onLayout(o.k)} style={{padding:'6px 9px',border:0,background:layout===o.k?'#fff':'transparent',color:layout===o.k?'#4f60dc':'#64708a',borderRadius:8,cursor:'pointer',boxShadow:layout===o.k?'0 1px 2px rgba(26,29,56,.06)':'none',display:'flex',alignItems:'center'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d={o.i}/></svg>
            </button>
          ))}
        </div>
        <button style={{border:'1px solid #d9dfe6',background:'#fff',padding:'9px 14px',borderRadius:10,fontSize:13,color:'#1a1d38',cursor:'pointer'}}>Audio off</button>
        <button style={{border:0,background:'#4f60dc',color:'#fff',padding:'9px 16px',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'Lexend',fontWeight:400}}>+ Add camera</button>
      </div>
    </header>
  );
}

window.VideoAppShell = AppShell;
window.VideoTopBar = TopBar;

```

### `ui_kits/video-app/CameraGrid.jsx`

```jsx
const CAMERAS = [
  { id:'c01', name:'01 · Loading Bay',     src:'../../assets/hero-vehicle-detection.jpg', status:'rec',    bbox:[{x:38,y:48,w:26,h:34,label:'VEHICLE · 96%',c:'#4f60dc'}] },
  { id:'c02', name:'02 · Entry Gate',      src:'../../assets/white-tesla-alpr.jpg',       status:'rec',    bbox:[{x:30,y:38,w:42,h:36,label:'VEHICLE · 98%',c:'#4f60dc'},{x:46,y:62,w:18,h:6,label:'PLATE',c:'#f99f25'}] },
  { id:'c03', name:'03 · South Entrance',  src:'../../assets/redactor-crosswalk.avif',     status:'motion', bbox:[{x:42,y:50,w:8,h:24,label:'PERSON · 91%',c:'#f99f25'}] },
  { id:'c04', name:'04 · North Yard',      src:'../../assets/redactor-cars-tolls.avif',    status:'rec',    bbox:[] },
  { id:'c05', name:'05 · Perimeter West',  src:'../../assets/redactor-traffic.avif',       status:'rec',    bbox:[] },
  { id:'c06', name:'06 · Warehouse Floor', src:'../../assets/hero-object-tracking.jpg',    status:'rec',    bbox:[{x:34,y:42,w:20,h:42,label:'PERSON · 94%',c:'#4f60dc'}] },
];
window.VIDEO_CAMERAS = CAMERAS;

function CameraTile({ cam, active, onSelect, t }) {
  const statusMap = {
    rec:    { l:'REC',    fg:'#fff',     bg:'#f62470', dot:'#f62470' },
    motion: { l:'MOTION', fg:'#1a1d38',  bg:'#f99f25', dot:'#f99f25' },
    offline:{ l:'OFFLINE',fg:'#1a1d38',  bg:'#d9dfe6', dot:'#9aa3b2' },
  };
  const s = statusMap[cam.status];
  return (
    <button onClick={()=>onSelect(cam.id)} style={{position:'relative',background:'#1a1d38',borderRadius:12,overflow:'hidden',cursor:'pointer',padding:0,border:'2px solid '+(active?'#4f60dc':'transparent'),boxShadow:active?'0 0 0 4px rgba(79,96,220,.18)':'none',aspectRatio:'16/9'}}>
      {cam.src ? <img src={cam.src} style={{width:'100%',height:'100%',objectFit:'cover',opacity:.94}}/> : <div className="sh-pattern-scan" style={{width:'100%',height:'100%',background:'#1a1d38'}}/>}
      {/* Detection bboxes (drawn) */}
      {cam.bbox && cam.bbox.length>0 && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
          {cam.bbox.map((b,i)=>(
            <g key={i}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={b.c} strokeWidth="0.4" vectorEffect="non-scaling-stroke"/>
            </g>
          ))}
        </svg>
      )}
      {cam.bbox && cam.bbox.length>0 && (
        <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
          {cam.bbox.map((b,i)=>(
            <div key={i} style={{position:'absolute',left:b.x+'%',top:(b.y-4)+'%',padding:'1px 5px',background:b.c,color:b.c==='#f99f25'?'#1a1d38':'#fff',fontSize:8,fontWeight:600,fontFamily:'SF Mono, Menlo, monospace',letterSpacing:'.04em',borderRadius:2}}>{b.label}</div>
          ))}
        </div>
      )}
      {/* Top-left camera label */}
      <div style={{position:'absolute',top:8,left:8,padding:'3px 8px',background:'rgba(26,29,56,.72)',color:'#fff',fontSize:11,fontWeight:500,borderRadius:6,backdropFilter:'blur(4px)'}}>{cam.name}</div>
      {/* Top-right status */}
      <div style={{position:'absolute',top:8,right:8,display:'flex',alignItems:'center',gap:6,padding:'3px 8px',background:s.bg,color:s.fg,fontSize:10,fontWeight:600,borderRadius:6,letterSpacing:'.06em'}}>
        <span style={{width:6,height:6,borderRadius:999,background:s.dot,boxShadow:`0 0 0 3px ${s.dot}33`,animation:cam.status==='rec'?'pulse 1.6s infinite':'none'}}/>
        {s.l}
      </div>
      {/* Bottom: burned-in timestamp + simulated frame number */}
      <div style={{position:'absolute',bottom:8,left:8,right:8,display:'flex',justifyContent:'space-between',color:'#fff',fontFamily:'SF Mono, Menlo, monospace',fontSize:10,textShadow:'0 1px 2px rgba(0,0,0,.6)'}}>
        <span>{t}</span>
        <span style={{opacity:.7}}>F#{(cam.id.replace('c','')*10000 + 2914)|0}</span>
      </div>
    </button>
  );
}

function CameraGrid({ activeId, onSelect }) {
  return (
    <div style={{flex:1,padding:'14px 18px 0',minHeight:0,overflow:'auto'}}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }`}</style>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {CAMERAS.map(c => <CameraTile key={c.id} cam={c} active={c.id===activeId} onSelect={onSelect} t="14:32:18"/>)}
      </div>
    </div>
  );
}

window.VideoCameraGrid = CameraGrid;

```

### `ui_kits/video-app/Timeline.jsx`

```jsx
function Timeline() {
  // 4-hour scale, motion bands per camera. Each band: array of [startPct, widthPct, type]
  const cams = [
    { id:'01', bands:[[3,8,'m'], [22,4,'v'], [42,12,'m'], [78,3,'v']] },
    { id:'02', bands:[[10,3,'p'], [38,5,'p'], [60,6,'p'], [85,4,'p']] },
    { id:'03', bands:[[0,11,'m'], [18,7,'m'], [50,10,'m'], [70,15,'m'], [92,6,'m']] },
    { id:'04', bands:[[28,3,'v'], [56,2,'v'], [80,4,'v']] },
    { id:'05', bands:[[12,2,'m'], [44,3,'m'], [76,3,'m']] },
    { id:'06', bands:[[5,10,'m'], [30,6,'m'], [58,8,'m'], [88,4,'m']] },
  ];
  const colorFor = t => t==='v'?'#4f60dc':t==='p'?'#f99f25':'#8792e8';
  const hours = ['11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30'];
  return (
    <section style={{padding:'12px 18px 16px',background:'#fff',borderTop:'1px solid #e4e8ef'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em'}}>Timeline · past 4 h</div>
        <div style={{display:'flex',gap:14,fontSize:11,color:'#4b4f73'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:2,background:'#8792e8'}}/>Motion</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:2,background:'#4f60dc'}}/>Vehicle</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:2,background:'#f99f25'}}/>Plate</span>
        </div>
      </div>
      <div style={{position:'relative',paddingLeft:24}}>
        {/* Now indicator */}
        <div style={{position:'absolute',top:0,bottom:18,right:0,width:2,background:'#4f60dc',zIndex:2}}>
          <div style={{position:'absolute',top:-4,right:-5,width:12,height:12,borderRadius:999,background:'#4f60dc',boxShadow:'0 0 0 4px rgba(79,96,220,.2)'}}/>
        </div>
        {cams.map(c => (
          <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <div style={{position:'absolute',left:0,fontSize:10,color:'#64708a',fontFamily:'SF Mono, Menlo, monospace',width:20,textAlign:'right'}}>{c.id}</div>
            <div style={{flex:1,height:10,background:'#f6f8fb',borderRadius:3,position:'relative'}}>
              {c.bands.map((b,i)=>(
                <div key={i} style={{position:'absolute',left:b[0]+'%',width:b[1]+'%',top:0,bottom:0,background:colorFor(b[2]),borderRadius:2}}/>
              ))}
            </div>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:9,color:'#9aa3b2',fontFamily:'SF Mono, Menlo, monospace',fontVariantNumeric:'tabular-nums'}}>
          {hours.map(h => <span key={h}>{h}</span>)}
        </div>
      </div>
    </section>
  );
}
window.VideoTimeline = Timeline;

```

### `ui_kits/video-app/EventsPanel.jsx`

```jsx
function EventsPanel() {
  const events = [
    { t:'14:32:18', cam:'03', type:'motion',  label:'Motion detected',          tag:null },
    { t:'14:31:45', cam:'01', type:'vehicle', label:'Vehicle · White Tesla M3', tag:null },
    { t:'14:30:12', cam:'02', type:'plate',   label:'NV-4XKD891 read',          tag:null },
    { t:'14:28:55', cam:'06', type:'person',  label:'Person · Bay 6 west',      tag:null },
    { t:'14:25:30', cam:'03', type:'person',  label:'Person enters site',       tag:'follow-up' },
    { t:'14:22:18', cam:'04', type:'motion',  label:'Motion · loading deck',    tag:null },
    { t:'14:19:02', cam:'01', type:'vehicle', label:'Vehicle · Ford F-150',     tag:null },
    { t:'14:15:48', cam:'06', type:'motion',  label:'Motion detected',          tag:null },
    { t:'14:11:22', cam:'02', type:'plate',   label:'CA-7ABC123 read',          tag:null },
  ];
  const iconFor = t => ({
    motion:  { d:'M3 12h4l2-6 4 12 2-6h4', c:'#8792e8' },
    vehicle: { d:'M3 13l1.5-5h11L17 13 M3 13h14v5H3z M6 18v2 M14 18v2', c:'#4f60dc' },
    plate:   { d:'M3 6h18v12H3z M6 9h12 M6 12h12 M6 15h8', c:'#f99f25' },
    person:  { d:'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z', c:'#4f60dc' },
  }[t]);
  return (
    <aside style={{width:320,background:'#fff',borderLeft:'1px solid #e4e8ef',padding:0,overflow:'auto',display:'flex',flexDirection:'column',fontFamily:'Lexend'}}>
      <div style={{padding:'18px 18px 12px',borderBottom:'1px solid #eef1fc'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#64708a',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10}}>Today's activity</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[['Events',128,'#1a1d38'],['Motion',96,'#8792e8'],['Vehicles',18,'#4f60dc'],['Alerts',2,'#f62470']].map(([l,n,c])=>(
            <div key={l} style={{padding:10,background:'#f6f8fb',borderRadius:10}}>
              <div style={{fontSize:22,fontWeight:500,color:c,fontVariantNumeric:'tabular-nums',lineHeight:1}}>{n}</div>
              <div style={{fontSize:11,color:'#64708a',marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'14px 18px 10px',borderBottom:'1px solid #eef1fc',display:'flex',gap:6,flexWrap:'wrap'}}>
        {[['All',true],['Motion',false],['Vehicle',false],['Plate',false],['Person',false]].map(([l,a])=>(
          <span key={l} style={{padding:'4px 10px',fontSize:11,fontWeight:500,borderRadius:999,background:a?'#eef1fc':'#fff',color:a?'#2e3ba4':'#64708a',border:'1px solid '+(a?'#dee2f8':'#e4e8ef')}}>{l}</span>
        ))}
      </div>

      <div style={{padding:'10px 14px 14px',flex:1}}>
        {events.map((e,i)=>{
          const icon = iconFor(e.type);
          return (
            <div key={i} style={{display:'flex',gap:10,padding:'10px',borderRadius:8,alignItems:'flex-start',cursor:'pointer'}} onMouseEnter={ev=>ev.currentTarget.style.background='#f6f8fb'} onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
              <div style={{width:30,height:30,borderRadius:8,background:'#f6f8fb',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={icon.c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={icon.d}/></svg>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#1a1d38',display:'flex',alignItems:'center',gap:6}}>
                  <span>{e.label}</span>
                  {e.tag && <span style={{padding:'1px 7px',fontSize:9,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',borderRadius:999,background:'#fef4e0',color:'#f05d22'}}>{e.tag}</span>}
                </div>
                <div style={{fontSize:11,color:'#64708a',marginTop:2,display:'flex',gap:8}}>
                  <span style={{fontFamily:'SF Mono, Menlo, monospace',fontVariantNumeric:'tabular-nums'}}>{e.t}</span>
                  <span>· Camera {e.cam}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
window.VideoEventsPanel = EventsPanel;

```

### `ui_kits/video-app/index.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sighthound Video — App UI Kit (v0.9.1)</title>
<link rel="stylesheet" href="../../colors_and_type.css">
<style>html,body,#root{margin:0;height:100%;background:#f6f8fb;overflow:hidden}</style>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" src="AppShell.jsx"></script>
<script type="text/babel" src="CameraGrid.jsx"></script>
<script type="text/babel" src="Timeline.jsx"></script>
<script type="text/babel" src="EventsPanel.jsx"></script>
<script type="text/babel" data-presets="env,react">
const { useState } = React;
function App() {
  const [active, setActive] = useState('c06');
  const [layout, setLayout] = useState('grid');
  return (
    <div data-screen-label="video-live-monitoring">
      <VideoAppShell>
        <VideoTopBar layout={layout} onLayout={setLayout}/>
        <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
          <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
            <VideoCameraGrid activeId={active} onSelect={setActive}/>
            <VideoTimeline/>
          </div>
          <VideoEventsPanel/>
        </div>
      </VideoAppShell>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
</script>
</body>
</html>

```

---

<a id="11-asset-manifest"></a>
## 11. Asset manifest

Binary assets live in `assets/`.

- `assets/edge-ai-hardware.png`
- `assets/hero-lpr.jpg`
- `assets/hero-object-tracking.jpg`
- `assets/hero-redaction.png`
- `assets/hero-vehicle-detection.jpg`
- `assets/redactor-cars-tolls.avif`
- `assets/redactor-courtroom-redacted.avif`
- `assets/redactor-crosswalk.avif`
- `assets/redactor-hospital-redacted.avif`
- `assets/redactor-icon-audio.avif`
- `assets/redactor-icon-bulk.avif`
- `assets/redactor-icon-custom.avif`
- `assets/redactor-icon-deploy.avif`
- `assets/redactor-icon-language.avif`
- `assets/redactor-icon-smart.avif`
- `assets/redactor-logo-horizontal.webp`
- `assets/redactor-police.avif`
- `assets/redactor-traffic.avif`
- `assets/sighthound-compute-camera.png`
- `assets/sighthound-compute-node.png`
- `assets/sighthound-logo-horizontal.jpg`
- `assets/sighthound-logo-white.png`
- `assets/white-tesla-alpr.jpg`
