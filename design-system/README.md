# Sighthound Design System

A design system for **Sighthound Inc.** and its sub-brand **Sighthound Redactor**.
Based on the official *Sighthound Brand Guidelines* (April 2022) plus live context from
[sighthound.com](https://www.sighthound.com) and [redactor.com](https://www.redactor.com).

---

## About the brand

**Sighthound** is an IoT / computer-vision company that turns video feeds into actionable
data. Their tagline is **"Turning sight into insight."** The greyhound (named **Lucy**,
after the founder's dog) is the mascot — a visual metaphor for keeping things in sight and
tracking them with speed and responsiveness.

### Products
| Product | What it is | Site |
|---|---|---|
| **Sighthound ALPR+** | Automatic License Plate Recognition + vehicle make/model/color/generation (MMCG) | sighthound.com/products/alpr |
| **Sighthound Redactor** | AI-powered video, image & audio redaction (faces, plates, audio) for FOIA / GDPR / CJIS workflows | redactor.com |
| **Sighthound Hardware** | Edge AI compute cameras & nodes; IP67 rugged, made in USA | sighthound.com/products/hardware |
| **Sighthound Video** | Flexible agile Video Management System (VMS) — the original product | sighthound.com/products/sighthound-video |

### Audience
Government, Engineering, and Enterprise — City Traffic Engineers, Retail Store Managers,
Python Developers, Business Developers, Law Enforcement.

### Brand pillars
Easy · Insightful · Data-Driven · Evolving · Connecting · Protecting

### Differentiators
Made in USA · Specialized CV expertise · Outcomes-focused · Free 24×7×365 support · Future-proof (software-defined hardware) · High performance.

---

## Sources used

- **`uploads/Sighthound-BrandGuidelines-Jul12.pdf`** — Official 62-page brand guide (April 2022). Primary source of truth.
- **www.sighthound.com** (live site, Squarespace) — product pages, hero imagery, iconography reference.
- **www.redactor.com** (live site, Webflow) — sub-brand visuals, Redactor-specific product marketing.
- No codebase or Figma link was provided; if one exists, attach it for higher-fidelity UI-kit work.

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
ALL CAPS. Titles are Title Case. Logo wordmark is all-lowercase. Never use all-lowercase
body copy.

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
- **Primary:** Blurple `#4f60dc` + White. Blurple drives ~60% of a composition.
- **Secondary:** Dark Navy `#1a1d38` + Neutral Gray `#eff3f7`. ~30%. **All body text is Dark Navy on light backgrounds.**
- **Accents:** Light Orange `#f99f25` · Medium Orange `#f05d22` · Red Orange `#f62470`. Sparingly (~10%) — icons, gradients, illustration pops, key highlights. On orange/pink backgrounds, headings are **white**.
- **Gradients:** Used sparingly (~10%). Freeform or linear, any angle, built from palette colors. Brand gradient runs Blurple → Red Orange.

### Typography
- **Primary:** **Lexend** (Google Fonts, weights 300/500/600). Body is Light, H1 is Medium, H4 / overline / running headers are Semibold ALL CAPS.
- **Alternative (email/software):** **Verdana** (Regular replaces Lexend Light, Bold replaces Lexend Semibold). Used where custom web fonts aren't supported.
- **Logo wordmark:** **Robofan** — proprietary; never recreate the wordmark. Use the logo files in `assets/`.
- **Hierarchy (digital):** H1 46/1.2 · H2 32/1.33 · H3 16/1.5 · H4 16 semibold ALL CAPS · H5 18/1.5 · Body 16/1.5 · Button 16.

### Spacing, radii, shadows
- Rounded corners are generous and modern. **Buttons: 20px radius.** Cards: 12px.
- Spacing scale is 4/8/12/16/24/32/48/64/96 — friendly, not tight.
- Shadows are soft and navy-tinted (not black) — see `colors_and_type.css`.
- Borders are subtle; navy on interactive hover/focus.

### Imagery & photography
- **People:** warm, human, smiling — families, parents, business owners, law enforcement. Undertones of orange emphasized for warmth.
- **Vehicles / expansive views:** bird's-eye, panorama, metropolitan, highways, day-time. Large-scale-impact feeling.
- **Equipment:** product on black laptops / monitors / phones (matches Windows-using customer base).
- **Redactor-specific:** raw surveillance footage → redacted (face/plate blurring) side-by-side. The blur IS the hero.
- **Avoid:** screenshots of code (reads as intimidating), low-quality/pixelated images, heavy text overlays, software screenshots without a device mockup.

### Motion & interaction
- Motion is subtle and purposeful — the Redactor homepage uses a looping product-demo video. No bouncy/playful anim; favor standard `cubic-bezier(0.2, 0, 0.2, 1)` fades and slides at 200–320ms.
- **Hover:** buttons invert (primary → darker blurple; secondary white→navy background); links underline and deepen in blurple. No glow, no scale.
- **Press:** mild darken, no shrink.
- **Focus:** 3px blurple ring at 35% alpha for accessibility.

### Layout & graphic motifs
- **The wave.** The signature graphic element — a flowing curved form that can appear horizontal, angled or vertical. "Innovation, global technology, all-reaching, scanning, futuristic." Can be any palette color or gradient; transparency adjusted to blend.
- **Illustrations.** Flat, minimalist, abstract. No more than 3 colors. Subjects: office supplies, data/charts, cities, highways, parking.
- **Cards.** White surface, 12px radius, soft navy-tinted shadow, thin `#e4e8ef` border. No colored left-accent.
- **Transparency & blur.** Used most in redacted imagery (the product IS blur); otherwise used lightly over wave graphics.
- **Corner radii.** Buttons 20px · Cards 12px · Inputs 8px · Pills 999px.

---

## Iconography

**Primary icons.** Flat illustration style (closer to a small illustration than a line
icon). Orange + navy palette, slightly rounded edges, outline style with a medium stroke
weight. Used only for major products, services, industries. The Redactor feature grid
is the canonical example — see `assets/redactor-icon-*.avif`.

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
  `currentColor`. This is the minimalist house icon set — navy by default, blurple for
  brand-forward moments, orange reserved for primary-icon illustrations.

---

## Index

```
├── README.md                  ← you are here
├── SKILL.md                   ← Agent Skill manifest
├── colors_and_type.css        ← design tokens + semantic CSS vars
├── assets/                    ← logos, hero imagery, product icons, hardware renders
├── preview/                   ← design-system preview cards (registered in Asset panel)
├── ui_kits/
│   ├── sighthound-marketing/  ← sighthound.com recreation
│   │   ├── index.html
│   │   └── *.jsx components
│   └── redactor-app/          ← Redactor product UI recreation
│       ├── index.html
│       └── *.jsx components
└── uploads/                   ← source materials (brand guidelines PDF)
```

---

## Caveats

- **Guidelines are from April 2022.** The live Redactor site uses a slightly evolved
  palette — specifically more navy-on-white with less blurple. This system follows the
  **official 2022 guide** as the source of truth; the Redactor app kit uses the same tokens.
- **Robofan** (logo wordmark typeface) is proprietary and not included — the logo files
  in `assets/` are the only approved way to set the wordmark.
- **No codebase / Figma provided** — UI kits are built from live-site observation + brand
  tokens. For pixel-perfect fidelity, attach the codebase or a Figma library.
- **UI icons** use Lucide as a stand-in for the (unprovided) internal icon set.
