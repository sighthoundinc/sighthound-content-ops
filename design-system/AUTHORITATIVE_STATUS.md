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
