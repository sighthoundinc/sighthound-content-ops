# Sighthound Content Style Guide

**Version**: 2026.04 · **Supersedes**: all prior style guides · **Owner**: Content Relay (Slack: `#content-ops-alerts`) · **Applies to**: `www.sighthound.com` and `www.redactor.com`

Rules, not aspirations. If a rule here conflicts with taste, the rule wins. If a rule conflicts with **product reality**, flag it in `#content-ops-alerts` — product reality wins and the rule gets updated.

---

## 1. Who this guide is for

Anyone writing public Sighthound content: PMM, in-house writers, agencies, freelancers, AI drafters. Applies to blog posts, landing pages, case studies, email nurtures, and gated assets across both domains. Does not apply to sales decks or internal docs.

## 2. Two domains, one voice, different jobs

Sighthound publishes under two brands on two domains. The voice is identical; the topics, buyers, and default product anchor are different.

**`www.sighthound.com`** — the parent brand. Computer-vision platform content.
- Default product anchors: **ALPR+**, **Vehicle Analytics (MMCG)**, **Compute**.
- Default buyer: parking operators, toll authorities, LE ALPR programs, fleet, transit, banking, retail security, smart-city, enterprise security architects.
- Default intent surfaces: LPR/ANPR/ALPR, vehicle recognition, edge AI hardware, computer-vision SDK / Cloud API, industry verticals (parking, transit, banking, retail, traffic management).

**`www.redactor.com`** — the product brand for Sighthound Redactor.
- Default product anchor: **Sighthound Redactor**.
- Default buyer: LE records / FOIA officers, records custodians, school district admins, HIM/privacy officers, insurance claims, enterprise legal, media legal reviewers.
- Default intent surfaces: video/image/audio redaction, FOIA, CJIS, HIPAA, GDPR, CCPA, FERPA, evidence release, chain of custody.

**Which domain gets the post?** Decision tree:

1. Is the primary reader buying redaction? → **redactor.com**.
2. Is the primary reader buying LPR, vehicle analytics, or edge compute? → **sighthound.com**.
3. Does the post cover both (e.g., "Indiana blackout plate + redaction workflow")? → pick the **primary product**, publish there, and cross-link.
4. Does the post cover Sighthound as a company (company news, funding, corporate announcements, general AI/CV trends)? → **sighthound.com**.

**One topic, one canonical post.** Do not double-publish. Cross-link instead.

## 3. Ground truth — Sighthound's products (memorize this)

Inaccurate claims are the #1 rejection reason in review. Learn the product lineup before writing.

**Company**: Sighthound Inc. — computer-vision platform. HQ: Longwood, FL.

### Sighthound Redactor (redactor.com)
AI-powered video, image, and audio redaction software.
- **Detects and redacts** (video + image): heads, people, vehicles, license plates, IDs, screens, documents.
- **Audio**: mute, beep, or scramble sensitive speech. Transcription in 8+ languages.
- **Modes**: Smart Redaction (AI auto-detection) + Custom Redaction (manual drawing).
- **Scale**: Bulk Redaction across hundreds or thousands of files.
- **Platforms**: Windows, Linux, Docker.
- **Deployment**: desktop, client-server, embedded UI, white-labeled.
- **Sovereignty**: offline and air-gapped supported.
- **Version reference**: confirm via docs.redactor.com/release-notes before every publish.

### Sighthound ALPR+ (sighthound.com)
License plate recognition engine (sometimes referenced as LPR, ALPR, or ANPR).
- Reads plates from fixed, in-vehicle, and dashcam deployments.
- Multi-jurisdiction plate format support.
- Pairs with Vehicle Analytics for MMCG enrichment.
- Delivered as SDK + Cloud API.

### Sighthound Vehicle Analytics / MMCG (sighthound.com)
Make, Model, Color, and Generation recognition for vehicles. Adjacent capabilities: vehicle classification, direction, dwell, counting.

### Sighthound Compute (sighthound.com)
Edge AI compute hardware (Compute Node) for public safety and smart-surveillance deployments. Runs Sighthound's CV stack at the edge without cloud dependency.

### Sighthound Cloud API / SDK (sighthound.com)
Developer-facing computer-vision APIs and SDKs — LPR, vehicle analytics, detection primitives. Used by ISVs and integrators building on top of Sighthound's models.

**Vertical focus across both domains**: law enforcement, parking, tolling, fleet, transit, banking, retail security, schools, healthcare, media production, insurance, smart city.

## 4. Terms that get articles rejected

Across both domains:

- **"Facial recognition"** when we mean head/face detection for redaction. Redactor detects heads — it does not identify people. Conflating the two creates compliance exposure.
- **"Cloud-only"** or **"SaaS-only"** to describe Redactor. Redactor runs on-prem, offline, air-gapped.
- **"Real-time"** applied to Redactor. Redactor processes files, it is not a live-stream system. ALPR+ and Compute can be real-time at the edge; Redactor is not.
- **"Surveillance"** as product positioning. Sighthound's surveillance use cases are real, but the product framing is **analytics, safety, and privacy** — not surveillance.
- **"Facial recognition"** as a capability of Sighthound.com products unless we are specifically discussing face detection (not identification).
- **"LPR"** without context on first mention — spell out as "license plate recognition" or "Automatic License Plate Recognition (ALPR)" on first use.
- **"AI-generated video / AI-created content"** — implies generative AI, which is not what Sighthound does. Use "AI-powered detection" or "computer vision".

## 5. What we publish and what we don't

**We publish, across both domains**
- Operational how-to (workflows, deployment patterns, integration recipes).
- Compliance explainers grounded in statute (CCPA, FERPA, CJIS, HIPAA, GDPR, FOIA, state privacy laws).
- Evidence/forensics process content (chain of custody, admissibility, discovery).
- Comparisons against named competitors where we can substantiate claims from public sources.
- Customer stories with named customers and quantified outcomes.
- Product release notes, integration recipes, changelog entries.
- Vertical deep-dives (parking, LE, schools, healthcare, fleet, banking, retail, transit).

**We do not publish**
- Legal advice. We publish operational guidance that cites primary legal sources, with a disclaimer.
- Consumer content (how-to-blur-on-YouTube, SMB dashcam tips) unless reframed for a B2B audience.
- Content positioning Sighthound products for face identification, biometric matching, or surveillance targeting.
- Generic AI trend pieces ("The Future of AI in 2026").
- Speculation on pending legislation, court outcomes, or competitor roadmaps.
- Content that uses Redactor to promote non-Sighthound products or ALPR+ to promote non-Sighthound hardware.

## 6. Voice

Target reader across both domains: **a records custodian, LE IT lead, privacy officer, parking ops director, fleet manager, or security architect** with a paid subscription to a trade publication. They're busy, skeptical of vendors, and have seen the same article from every competitor. They don't need to be impressed — they need to trust us.

Three properties, in order:

1. **Direct.** State the claim. Then support it.
2. **Specific.** Name the statute, name the version, name the customer, name the integration, name the detection category.
3. **Operational.** Default to workflows, checklists, and matrices — not narrative.

**Before / after**

| Old (generic) | New (direct + specific) |
|---|---|
| In today's fast-paced world, redaction has become more important than ever. | California's CPRA took effect in 2023 and created a deletion-request obligation that applies to recorded video. Records custodians have 45 days to comply. |
| Our innovative ALPR solution empowers parking operators. | Sighthound ALPR+ reads North American and European plate formats from fixed, in-vehicle, and dashcam cameras, and pairs with Vehicle Analytics for MMCG enrichment. |
| Sighthound Redactor leverages cutting-edge AI. | Sighthound Redactor detects heads, people, vehicles, license plates, IDs, screens, and documents, and runs fully offline on Windows, Linux, or Docker. |
| Our edge compute hardware unlocks real-time analytics. | Sighthound Compute runs ALPR+ and Vehicle Analytics at the edge with no cloud dependency, keeping plate and MMCG data inside the customer's network. |
| Reach out to learn more. | Start a 24-hour free trial of Redactor, or contact sales for ALPR+ and Compute. |

## 7. Banned words

Never ship these in public content on either domain.

**Banned**: leverage, empower, seamless, seamlessly, unlock, streamline, robust, holistic, synergy, game-changing, cutting-edge, next-generation, best-in-class, world-class, innovative, revolutionary, transformative, paradigm shift, unlock value, drive outcomes, mission-critical (unless in a customer quote), bleeding-edge, solution-oriented, thought leader, disrupt, disruption.

**Restricted** (only with concrete context):
- "AI-powered" → OK if followed by what the AI does.
- "Compliance-ready" → OK if paired with a named framework.
- "Enterprise-grade" → OK if paired with a spec (SSO, audit log, air-gapped).
- "Ecosystem" → OK only for a real software ecosystem (e.g., Milestone's ecosystem).
- "Real-time" → OK for ALPR+/Compute at the edge; never for Redactor.

**Use instead**: pick the actual verb — "runs", "processes", "detects", "reads", "exports", "integrates with", "replaces", "cuts X from Y to Z".

## 8. Banned structural patterns

- **Colon-split titles** ("Redactor: The Future of Video Redaction").
- **"In today's…"** intros.
- **"In this post, we will explore…"**.
- **Q&A footer slapped onto an unrelated post** just to bolt on `FAQPage` schema.
- **H2s titled "Conclusion" or "Wrap-Up"**.
- **Stock photography** of generic businesspeople, handshakes, city skylines, abstract tech imagery.
- **AI-generated hero images**.
- **Emoji** in titles, H2s, CTAs, or alt text.
- **Parenthetical asides** that break flow.

## 9. Mandatory post anatomy (both domains)

Every post ships with these blocks, in this order:

1. **H1** — per §10.
2. **Meta row** — Published · Updated · Last Reviewed · Author.
3. **Hero image** with descriptive alt text.
4. **TL;DR** — 50–80 words, entity-dense, single paragraph, names the relevant Sighthound product.
5. **Key Takeaways** — 5–7 bullets, each a complete standalone sentence (15–30 words).
6. **Body** — Q&A-shaped H2s per §10.
7. **Inline primary-source citations** per §12.
8. **"How {Product} helps"** — concrete, feature-linked, not marketing. On dual-product posts, name both.
9. **FAQ** — optional, 3–5 Q/A pairs.
10. **Related reading** — 3 internal links, including at least one cross-domain link if the topic touches both.
11. **CTA** — per §15, stage-appropriate, product-appropriate.
12. **Author bio** — photo, credentials, 1–2-sentence bio, LinkedIn/ORCID.
13. **Cited sources** — footnotes if used.

## 10. Headings

**Titles (H1)**
- One clear declarative sentence or question. No colons. No em-dash splits.
- 6–14 words. Primary keyword is natural, not forced.

| Wrong | Right |
|---|---|
| Redactor: The Complete Guide to Video Redaction | A Complete Guide to Video Redaction With Sighthound Redactor |
| ALPR+: Features, Benefits, and Use Cases | How Sighthound ALPR+ Reads Plates From Moving Vehicles |
| Compute Node — Edge AI for Public Safety | What the Sighthound Compute Node Does at the Edge |

**H2s**
- Written as a question a reader would type. Answer in the first paragraph.
- 3–7 per post.

| Wrong | Right |
|---|---|
| The Redaction Process | How does automated video redaction work |
| Compliance Considerations | Which privacy laws apply to bodycam redaction |
| Technical Requirements | What hardware does Sighthound ALPR+ need at the edge |
| Case Study | How Consilio used Sighthound Redactor for eDiscovery |

## 11. Word counts

- **Minimum**: 1,200 words.
- **Target**: 1,600–2,200 for pillar posts; 900–1,400 for tactical posts.
- **Max**: 3,000 words. Above that, split into a cluster.
- **Minutes-to-read** = `round(word_count / 225)`. Round up.

Padding lowers LLM extraction quality. Ship at the length that answers the H1.

## 12. Sources and citations

Every factual claim about law, compliance, standards, or third-party products requires a citation.

**Primary-source library (both domains)**

| Topic | Primary source |
|---|---|
| FOIA | https://www.foia.gov · https://www.justice.gov/oip |
| CJIS | https://le.fbi.gov/informational-tools/cjis-security-policy-resource-center |
| HIPAA | https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html |
| GDPR | https://eur-lex.europa.eu/eli/reg/2016/679/oj |
| CCPA / CPRA | https://oag.ca.gov/privacy/ccpa · https://cppa.ca.gov |
| VCDPA | https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/ |
| BIPA | https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004 |
| FERPA | https://studentprivacy.ed.gov |
| NIST forensics | https://pages.nist.gov/frvt · NIST SP 800-86 |
| ISO evidence | ISO/IEC 27037:2012 |
| State ALPR / plate statutes | Justia · state legislature sites |
| DOT / NHTSA (fleet) | https://www.nhtsa.gov |
| FHWA (tolling / traffic) | https://ops.fhwa.dot.gov |
| Case law | Justia, CourtListener, Google Scholar |

**Format**
- Inline: `As defined in <a href="...">CJIS Security Policy v5.9 §5.6.2.2</a>, agencies must…`
- Use `<cite>` for source titles.
- `rel=""` (no nofollow) for `.gov`, `.edu`, `.mil`, academic sources.
- `rel="nofollow"` for commercial competitor sites.

**Rule**: a post with zero primary-source `.gov/.edu/.mil` links on a compliance, legal, or forensics topic does not ship. Applies to both domains.

## 13. Author bylines (E-E-A-T, both domains)

Unattributed posts do not ship. Ghost-writing is allowed with attribution to a real internal SME.

**Minimum byline**
- Real person's name.
- Real job title.
- Credentials where they apply (JD, CIPP/US, CISSP, PE, former FBI/DOJ/NIST/etc.).
- Professional photo (400×400 minimum).
- 60–120-word bio on the Author Collection page.
- LinkedIn URL. ORCID if applicable.
- Topic areas of expertise.

Authors contributing to both domains use the **same profile** — one `Person` entity referenced by `@id` from both sites' schema.

## 14. Claims and accuracy

- **Quantified claims** require a source or a repeatable benchmark.
- **Redactor detection categories** → the canonical seven: heads, people, vehicles, license plates, IDs, screens, documents. Do not invent new categories.
- **Redactor deployment** → desktop, client-server, embedded UI, or white-labeled. Windows, Linux, Docker. Offline and air-gapped supported.
- **ALPR+ claims** → specify plate region (North American, European, etc.), deployment (fixed, in-vehicle, dashcam), and whether a benchmark is at night / motion / partial visibility.
- **Vehicle Analytics (MMCG)** → use "make, model, color, and generation" on first mention, then MMCG.
- **Compute claims** → specify what runs on the Compute Node (ALPR+, Vehicle Analytics, custom models) and what "edge" means in context.
- **Version numbers** → pull from `docs.redactor.com/release-notes/` for Redactor; confirm via PM for ALPR+, Vehicle Analytics, Compute.
- **Customer names** → require written permission from CSM before naming publicly.
- **Pricing** → link to pricing pages (`redactor.com/pricing` for Redactor; contact-sales for ALPR+/Compute). Never embed numbers.
- **Competitor claims** → every comparative claim cites a public source from the competitor.

## 15. CTAs by product

One primary CTA per post. Choose based on the primary product of the post.

| Post primary product | Primary CTA | Secondary CTA |
|---|---|---|
| Redactor (redactor.com) | Start a 24-hour free trial | Book a demo |
| ALPR+ (sighthound.com) | Request ALPR+ access | Talk to sales |
| Vehicle Analytics (sighthound.com) | Talk to sales | Read the docs |
| Compute (sighthound.com) | Talk to sales | Download the Compute datasheet |
| Cloud API / SDK (sighthound.com) | Read the developer docs | Request API access |
| Cross-domain (covers both) | Primary = the product that best matches the H1 | Link the other product as a related CTA |

**Rules**
- No mid-article CTA pop-ups.
- CTAs are imperative and specific ("Start a 24-hour free trial", not "Learn more").
- Never use "Contact us" as the sole CTA.

## 16. Visuals

**Required**
- Hero image, 16:9 minimum 1600×900, <400 KB after compression.
- Descriptive alt text, 8–16 words, describing content (not meaning).
- One visual every 500–700 words in long-form.

**Banned**
- Generic stock photos.
- AI-generated heroes.
- Images with embedded text that isn't also in the body.

**Encouraged**
- Before/after redacted frames (Redactor).
- ALPR+ plate-read frame captures with accuracy overlays.
- Compute Node hardware shots with ports / rack diagrams.
- Architecture diagrams for integration posts.
- State-by-state or standard-by-standard matrices as HTML tables (not screenshots).

## 17. SEO (entity density, not keyword density)

**Do**
- Full name of every entity on first mention ("Automatic License Plate Recognition (ALPR)"), short form after.
- Link entities to glossary on first use.
- Include canonical identifiers — statute sections, NIST doc numbers, ISO standard IDs, product version numbers.
- Primary keyword lives in the TL;DR and first H2, not forced into H1.
- One canonical URL per topic.

**Don't**
- Repeat the primary keyword more than ~1× per 250 words.
- Keyword-stuff alt text.
- Ship pillar+spoke clusters where the spokes are slight rewrites.
- Use `noindex` on published blog posts.

## 18. LLM / GEO optimization (both domains)

Highest-leverage practices for ChatGPT, Claude, Perplexity, Gemini citation.

**Every post must**
- TL;DR that reads correctly as a standalone paragraph.
- Key Takeaways where each bullet stands alone.
- Q&A-shaped H2s.
- At least one primary-source `.gov/.edu/.mil` link on compliance/legal/forensics topics.
- Named entities early and often.
- Server-rendered HTML (not client-only React).

**Every post should**
- Include one table, matrix, or checklist.
- Include a "How does X work?" paragraph starting with a noun-phrase definition.
- Include release-note-style specifics (version, date, named feature) for freshness.

## 19. Legal / compliance disclaimers

On any legal, compliance, or evidence post (FOIA, CCPA, CJIS, HIPAA, GDPR, BIPA, FERPA, admissibility, discovery, ALPR data retention statutes):

> This article is for informational purposes and is not legal advice. Consult your organization's counsel for guidance specific to your jurisdiction and workflow.

Place after the TL;DR and again in the footer. Never bury it.

**Never**
- Give jurisdiction-specific advice.
- Predict pending legislation or litigation outcomes.
- Quote from non-public customer matters or private RFP responses.

## 20. Cross-domain linking rules

Most underutilized lever in the current Sighthound content graph.

**Outbound from redactor.com → sighthound.com**
- When a Redactor post touches vehicles, license plates, or MMCG, link the relevant sighthound.com page (ALPR+, Vehicle Analytics).
- When a Redactor post mentions edge deployment or on-prem hardware, link Sighthound Compute.
- When a Redactor post covers company-level news, link the sighthound.com press/about page.

**Outbound from sighthound.com → redactor.com**
- When an ALPR+ or Vehicle Analytics post touches privacy, public-records release, or redaction of plate data, link Redactor.
- When a Compute post covers evidence-video workflows, link Redactor's FOIA/bodycam use cases.
- When a parking/LE/fleet vertical post mentions video release, link Redactor.

**Schema-level linking**
- Both domains share one `Organization @id: https://www.sighthound.com/#organization` in JSON-LD. Every page on both domains references it.
- redactor.com uses `Brand @id: https://www.redactor.com/#brand` linked to that Organization.
- sighthound.com uses `Brand @id` per product (ALPR+, Vehicle Analytics, Compute) linked to the same Organization.
- Blog posts on each domain reference the **parent Organization**, not their local brand, as `publisher`.

## 21. Review workflow (Content Relay)

Every post moves through three stages. Each has a named owner and a deadline. Owned by **Content Relay**; alerts go to `#content-ops-alerts`.

1. **SME review** — 2 business days. Verifies every factual claim against primary sources.
2. **Editorial review** — 1 business day. Applies §6–§16 rules; line-edits voice; runs the §22 checklist.
3. **SEO / LLM review** — 1 business day. Confirms keyword alignment, internal/cross-domain linking, schema graph, TL;DR and Key Takeaways quality, image alt text, `@id` correctness for the relevant domain.

**Total SLA**: 4 business days from draft submission to publish-ready.

## 22. Pre-publish checklist

Reviewer runs this. Any failure sends the post back.

- [ ] Correct domain chosen per §2.
- [ ] Title: no colon, no em-dash split, no banned word.
- [ ] TL;DR: 50–80 words, one paragraph, names the relevant product.
- [ ] Key Takeaways: 5–7 complete-sentence bullets.
- [ ] All H2s are questions or specific operational phrases.
- [ ] Product claims match §3 and §14. Detection categories, deployment models, platform list all correct.
- [ ] Every compliance/legal claim has a primary-source link.
- [ ] No banned words.
- [ ] Author byline with credentials, photo, LinkedIn.
- [ ] Hero image with descriptive alt text.
- [ ] Minutes-to-read = `round(words/225)`.
- [ ] Category + Tags set.
- [ ] 3+ internal links; ≥1 cross-domain link if the topic touches both.
- [ ] ≥1 primary-source `.gov/.edu/.mil` link on legal/compliance/forensics topics.
- [ ] CTA is product-appropriate and stage-appropriate (§15).
- [ ] Legal disclaimer present if applicable.
- [ ] JSON-LD graph validates (Google Rich Results Test + Schema.org validator).
- [ ] `Organization @id` = `https://www.sighthound.com/#organization` regardless of publishing domain.
- [ ] Meta Title ≤ 60 chars. Meta Description 140–160 chars. Post Summary ≠ Meta Description.
- [ ] Last Reviewed date set to today if the content is fresh.
- [ ] URL + slug tested (no 404, canonical correct).

## 23. Quarterly review

Every quarter, Content Relay:
- Walks top 20 trafficked posts on each domain.
- Re-verifies every compliance claim against current statutes.
- Updates `Last Reviewed` date only if the post genuinely still holds.
- Updates stale version numbers and deprecated features.
- Archives or 301-redirects posts below a traffic + evergreen-value threshold.

Posts untouched for 12+ months receive an internal stale-flag.

## 24. Deprecated guidance (migration table)

For anyone moving from the prior guide:

| Old rule | New rule | Why |
|---|---|---|
| "Brand voice is authoritative, innovative, and approachable" | Direct, specific, operational (§6) | Those words had no mechanical implication. |
| "Paragraphs 5–7 sentences" | 2–5 sentences, one idea per paragraph | Long paragraphs hurt LLM extraction and mobile readability. |
| "Word count 1,200–1,800, never > 2,500" | 1,200–3,000, split above that (§11) | Pillars need the room; short tactical posts are fine below 1,500. |
| "Use italics for company names" | Italics for *titles of works* only | Italicizing companies is a print-era leftover. |
| "Include hyperlinks to credible sources; avoid excessive linking" | Cite primary sources aggressively (§12) | Citation graph matters more than volume. |
| "Include a clear CTA like 'schedule a demo' or 'contact us'" | One specific, product-stage CTA (§15) | "Contact us" converts poorly; specificity wins. |
| "Use descriptive ALT text for accessibility" | 8–16 words, describes content not meaning (§16) | Vague rule produced vague execution. |
| No guidance on E-E-A-T / author bios | Named authors with credentials required (§13) | Anonymous bylines are penalized by Google and LLMs. |
| No TL;DR / Key Takeaways / Q&A H2s | Mandatory (§9–§10) | LLM ranking mechanics did not exist in the prior guide. |
| No banned-word list | Explicit list (§7) | "Friendly, yet professional" produced every banned buzzword. |
| Redactor-only framing | Multi-product, dual-domain (§2–§3) | Sighthound publishes across two brands and five product lines. |
| No cross-domain linking rules | Cross-domain linking is mandatory (§20) | Separate domains dilute authority without cross-links. |

---

**Change process**

This guide changes when product reality changes or when a content experiment proves out a new rule. To propose a change: open a PR against `docs/content-style-guide.md` with the new rule, the evidence, and one Content Relay owner's sign-off. Style changes without evidence are rejected.

**Questions / exceptions**: Content Relay in `#content-ops-alerts`. Exceptions are granted in writing, per post, and logged in the `content-relay/exceptions.md` log.
