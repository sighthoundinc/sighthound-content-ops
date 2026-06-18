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

## Local Content Relay app adaptation

This repository uses the design system as a source-of-truth input, but the production
Content Relay app has a few settled density and workflow decisions that must not be
overwritten by a raw design-folder sync. See [`MIGRATION_AUDIT.md`](./MIGRATION_AUDIT.md)
for the implementation history and [`DECISIONS_LOG.md`](./DECISIONS_LOG.md) for the local
decision record.

- App font delivery: Lexend is loaded via `next/font/google` in `src/app/layout.tsx`.
- App density: body text remains Lexend Regular 14px / 400; marketing/auth surfaces may
  use the 16px brand scale.
- Buttons use a split radius model: 20px for CTA/marketing/auth and 8px for dense app
  controls.
- Status chips retain the semantic workflow palette; do not remap status states to a
  brand-only Blurple/Navy/Orange palette.
- Content Relay sidebar remains white; Redactor navy-sidebar patterns are reference-only
  unless a separate product decision changes that.
- JetBrains Mono remains the app monospace font.
- Production UI icons use Lucide through the shared `AppIcon` system, not prototype inline
  SVG paths from the UI kits.

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
├── MIGRATION_AUDIT.md          ← local Content Relay adoption decisions + history
├── colors_and_type.css         ← design tokens + semantic CSS vars
├── fonts/                      ← packaged Lexend variable font for static artifacts
├── assets/                     ← logos, hero imagery, product icons, hardware renders
├── preview/                    ← design-system preview cards (registered in Asset panel)
├── ui_kits/
│   ├── alpr-app/               ← ALPR+ product UI reference
│   ├── sighthound-marketing/   ← sighthound.com recreation
│   ├── redactor-app/           ← Redactor product UI recreation
│   └── video-app/              ← Sighthound Video product UI reference
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
