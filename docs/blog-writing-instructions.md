# Sighthound Blog Writing Instructions

**Audience**: Sighthound and Redactor blog writers, editors, SMEs, agencies, and AI-assisted drafters  
**Owner**: Content Relay · `#content-ops-alerts`  
**Snapshot reconciled through**: 2026-10-01  
**Scope**: Public blog posts on `www.sighthound.com` and `www.redactor.com`

This is the practical writing playbook for blog work. It supplements, and does not replace, [`content-style-guide.md`](content-style-guide.md), which remains the canonical style authority for both domains. Apply the more specific and more recent product-positioning restrictions in the current Marketing Positioning Register when they are stricter than the general style guide. Product reality and current written approvals always win over older copy, plans, meeting notes, or this dated snapshot.

> **Important source limitation:** The Marketing Positioning Register, All-Hounds and Year-in-Review ledgers, LinkedIn Calendar v7 claim rules, meeting notes, and roadmap used for this snapshot are not checked into this repository. The Sighthound-specific additions in this update come from a supplied guide that reports reconciliation through the September 24, 2026 Positioning Register, September 30 All-Hounds Ledger, and October 2026 LinkedIn Calendar v7 claim rules; those source versions were not independently available here. Treat mutable claims below as a dated snapshot, find current canonical copies in the company’s Content Relay/Marketing source of truth, and verify them before publication. If you cannot verify a claim or its approval, leave it out and ask Content Relay, Marketing, or Product.

## 1. Source authority and claim precedence

Use this order when deciding whether a statement is ready for a public post:

1. **Current product reality** — verified with the current product, release notes, supported documentation, or a Product/Engineering owner. Never describe an unavailable, unsupported, or unshipped capability as live.
2. **Current written claim approval** — the latest approved positioning register and any written, per-post approval from the appropriate Marketing, Product, Legal, or customer owner. A specific newer restriction overrides a broad older permission.
3. **Canonical editorial rules** — [`content-style-guide.md`](content-style-guide.md) for domain choice, voice, structure, citations, metadata, bylines, visuals, review, and publishing.
4. **Ledgers, meeting notes, and roadmaps** — useful for topic discovery, narrative, launch timing, and open questions; not standalone proof that a claim is public, current, or cleared.
5. **Published web copy, old blog posts, sitemaps, and competitor content** — useful for context and gap analysis, but not automatic approval or proof. A public page can be stale or conflict with newer product truth. A sitemap `lastmod` is not a publication date.

When sources conflict, pause the claim and escalate it in `#content-ops-alerts`. Do not average conflicting versions, pick the most marketable one, or silently carry a claim forward from an older article.

The exceptions log at [`content-relay/exceptions.md`](content-relay/exceptions.md) records **style-guide exceptions**. It does not approve product claims, customer disclosures, legal interpretations, or competitor comparisons. Those need written approval from the appropriate owner. If an approved post also waives a style-guide rule, log that waiver per the exceptions process.

## 2. Sighthound’s 2026 editorial context

Use these themes to identify useful stories; they are not a substitute for claim review:

- **Retriever became a named customer-facing product.** It moved from an internal, unnamed ALPR interface to a named product: the name was coined in May, locked in July, and the product page went live in August 2026. Verify exact public launch dates before using them. For Sighthound blog wording, distinguish Retriever (the product) from ALPR+ (the recognition technology underneath); see §5.
- **Release planning became more deliberate.** Redactor release communications moved toward a quarterly cadence coordinated with Marketing. Treat roadmap dates and unreleased features as internal until release notes and Product confirm shipment.
- **Public Redactor release chronology checked 2026-10-01:** 7.3.0 (August 11), 7.3.1 (August 14), 7.3.2 (September 4), and 7.3.3 (September 16, 2026). Use the [release notes](https://docs.redactor.com/release-notes) for feature-level details; 7.3.0 labels speaker diarization as beta, so do not imply an accuracy guarantee.
- **Responsible vehicle recognition became a public point of view.** Explain the workflow and governance choices agencies need to make. Do not frame recognition as identifying people or imply that software alone resolves privacy, retention, or accountability questions.
- **Developer experience became part of the product story.** “Integrate in a day, not six months” appears as internal positioning shorthand. Do not turn it into a universal integration-time guarantee; use it only with current Marketing approval and evidence defining the integration, starting point, and measurement.
- **AI-native describes internal operating practices, not automatically a product capability.** Do not infer or advertise customer-facing AI features from how Sighthound’s teams build or work.

### Public archive hygiene

Check the live [Sighthound blog index](https://www.sighthound.com/blog) and the article itself before planning a sequel or citing publication history. As checked for this snapshot, one confirmed Sighthound blog post dated April–September 2026 was a May 20 parking/access-control customer story. The supplied Sighthound-specific instructions mark that story permission-pending and anonymity-sensitive: do not reuse its customer identity, quote, result, or additional facts, and do not link to it unless Haris gives written approval. Its publication does not grant permission to extend or generalize the story. The August 26 responsible-vehicle-recognition article is in `/news`, not `/blog`. Do not infer publication dates from sitemap `lastmod` values.

## 3. Choose the domain and reader first

The two domains share a voice but have different editorial jobs. Choose the primary reader and product before drafting.

| Publish on | Primary reader and intent | Typical product anchors |
| --- | --- | --- |
| `www.sighthound.com` | Parking and toll operators, law-enforcement ALPR programs, fleet and transit teams, smart-city and security architects, ISVs, and integrators researching vehicle recognition or edge computer vision | Sighthound Retriever (powered by ALPR+), Vehicle Analytics (make, model, color, and generation; MMCG), Sighthound Compute, and documented Cloud API/SDK |
| `www.redactor.com` | Records and FOIA officers, records custodians, school administrators, privacy teams, insurance claims, enterprise legal teams, and media reviewers researching release workflows | Sighthound Redactor |

**Sighthound/Retriever reader and SEO overlay:** Prioritize parking and access-control operators, law-enforcement ALPR program leads, fleet and transit teams, integrators and ISVs, and security architects. Operations and sales leads at those organizations are secondary readers. Prefer plain English over developer jargon, and test technical posts with a non-developer. Build search intent around category terms (such as ALPR, license plate recognition, vehicle make/model/color recognition, and on-premises ALPR), not the Retriever brand name; introduce Retriever in the body after establishing the category. Do not target API browsers without a concrete integration task.

Use this routing test:

1. Is the reader evaluating redaction, evidence release, or records workflows? Choose `redactor.com`.
2. Is the reader evaluating license plate recognition, vehicle analytics, edge compute, or developer integration? Choose `sighthound.com`.
3. Does the story genuinely cover both? Pick the primary product, publish one canonical post on that domain, and cross-link the other product.
4. Is the story about Sighthound as a company? Use `sighthound.com`.

**One topic, one canonical post.** Do not publish near-duplicates on both domains. Cross-link when the reader benefits from the second product’s perspective.

## 4. Editorial point of view for vehicle recognition

Responsible recognition should be concrete and operational, not a slogan:

- **ALPR identifies a vehicle, not a person.** A plate read or alert does not establish who was driving, identify an occupant, prove guilt, or establish probable cause.
- **Treat an alert as an investigative lead.** Explain why staff must verify the plate, jurisdiction, record status, and relevance before acting.
- **Frame responsible use around limits on search and sharing, not an accusation against ALPR itself.** Discuss purpose, authorized access, and agency policy without naming or implying that a particular company or program uses the technology badly.
- **Separate detection from policy.** Agencies decide authorized purposes, access, retention, sharing, training, audits, and accountability. Do not imply that a product independently sets or enforces an agency’s policy unless that exact capability is verified and approved.
- **Describe data handling precisely.** “No required cloud” is not the same as “no data ever leaves the device,” “we store nothing,” or “there is no sharing.” Do not turn one deployment option into a universal data-flow guarantee.
- **Balance utility with safeguards.** Explain the operational use case and the governance questions together. Avoid fear-based copy, blanket claims that ALPR is inherently safe or unsafe, and “privacy solved” language.
- **Use primary policy sources.** IACP’s ALPR resources and its August 20 and September 14, 2026 statements are useful starting points; cite the original source and check its current text.

Useful IACP references:

- [IACP Automated License Plate Recognition resource page](https://www.theiacp.org/projects/automated-license-plate-recognition)
- [IACP statement on responsible ALPR use, August 20, 2026](https://www.theiacp.org/news/official-statements/iacp-statement-on-the-responsible-use-of-automated-license-plate)
- [Joint law-enforcement principles for responsible ALPR use, September 14, 2026](https://www.theiacp.org/news/official-statements/joint-law-enforcement-principles-for-responsible-use-of-automated-license)

Topics those sources address include documented lawful purposes, written policies, trained and authorized access, query documentation, verification, auditing, accountability, confidentiality, retention, responsible sharing, and data security. Attribute recommendations to the source; do not present them as legal requirements in every jurisdiction.

## 5. Product claims and current positioning

Treat this section as a dated snapshot of the September 2026 positioning findings, not permanent approval. Before publication, verify the latest register and current product/release documentation.

### Claim status

- **Cleared in the snapshot**: usable as a starting point, but still check current product truth, context, and wording.
- **Amber / unverified / planned**: do not state as a shipped capability. Ask Product and Marketing for written clearance before mentioning it publicly.
- **Not cleared / prohibited**: omit. Do not soften the wording or imply the capability indirectly.

### Sighthound naming, product scope, and APIs

For public Sighthound blog wording in the supplied snapshot, use **Sighthound Retriever, powered by ALPR+**. Retriever is the customer-facing, browser-based product; ALPR+ is the recognition technology underneath it. Do not write “formerly ALPR+” or present ALPR+ as the product the customer buys. This more-specific Retriever rule supersedes the April 2026 style guide’s older ALPR+ product framing where they conflict on Sighthound blog posts. It does not authorize claims beyond current product documentation or change Redactor’s separate positioning.

Keep product roles distinct: Retriever is positioned for live-stream workflows; Redactor is for file-based redaction, including offline workflows. Do not mention SIO, Redactor’s internal engine.

**Retriever API:** no productized Retriever API is cleared in this snapshot. For integration posts, describe only endpoints and workflows currently documented in the public developer portal. Never call anything the “Retriever API,” and do not present demo output or locked demo JSON as API access.

### Retriever

**Cleared in the September 24, 2026 positioning snapshot**

- Runs on the agency’s or operator’s own hardware.
- Does not require a cloud connection and does not default to a central or shared data pool.
- Data stays under the customer’s own policy; sharing and export are the customer’s choice.
- The vehicle record can include the plate plus make, model, color, and generation; lead with **generation** where relevant.
- Webhooks are shipped for event delivery to other systems; verify current public documentation before describing implementation details.
- Ease of use may be described qualitatively: no SSH or config-file editing. Do not turn that into an “easy rollout” or deployment-time promise.
- “When the plate doesn’t read, you still know the vehicle” may be used only qualitatively, with a concrete image condition such as rain, dust, distance, angle, or darkness; make no accuracy implication.
- A useful positioning question is whether the vehicle matches the plate. Generation is a qualitative cross-check, not proof of identity or a claim of unique recognition.

**Not cleared — do not claim or imply**

- Role-based access control (RBAC).
- Per-user search, audit, or export records.
- Mandatory case-number entry for searches.
- Product-enforced hotlist governance.
- Specific retention periods.
- “We store nothing,” “data never leaves the agency,” or other absolute data-custody claims.
- Telemetry or security-posture claims.
- Accuracy, orientation, vehicle-counting, or occupancy capabilities as Retriever UI features; vehicle orientation is unverified, and counting/occupancy is not surfaced in the Retriever UI.
- Recognition of bumper stickers, bike racks, luggage racks, disabled plates, or veteran plates.
- Camera management, multi-camera aggregation, or central management as shipped. “Bring existing cameras into one dashboard” is not a shipped-feature claim; use direction language only with Haris’s approval.
- In-product AI chat, auto-redacted ALPR snapshots, face grouping, or face recognition of any kind.
- Any hardware warranty or “production-grade” claim for Compute hardware.

Do not infer these controls from an on-premises deployment, agency-owned hardware, a public article, or a general security statement.

### Demo language

The web demo is a preview, not the product and not full API access. It accepts uploads only, not URL input, and its visible output is plate plus make, model, color, and generation. Do not imply the demo is what a customer is buying, describe demo JSON as API access, or say “we store nothing” near a demo link. Webhooks, gate integration, and the product dashboard must be described only as documented, shipped product capabilities; do not infer a specific gate integration.

### Other standing Sighthound rules

- Never imply Sighthound is CJIS-compliant. If the topic requires a compliance caveat, use: “Sighthound is tooling software. Compliance depends on your environment, policies and controls.”
- If asked about ALPR accuracy, ask what data and conditions the measurement used rather than making an uncleared performance claim.

### Sighthound Redactor

**Cleared in the September 24, 2026 positioning snapshot**

- Redacts video, image, and audio.
- A person can review redactions before release.
- Redaction activity has an audit log.
- GPU speech processing is available as a capability.
- Speech transcripts can be exported as SRT, subject to the current release documentation.
- On-premises and air-gapped deployment are supported, subject to current version and deployment documentation.

**Not cleared — do not claim or imply**

- Per-user logs.
- A “reviewed and approved” audit trail or proof of approval.
- Real-time processing.

Confirm the current version, supported platforms, deployment models, language coverage, and feature availability in the [Redactor release notes](https://docs.redactor.com/release-notes) and with Product before every release-specific post.

### Vehicle Analytics, Compute, and documented developer tools

For Vehicle Analytics, Compute, and separately documented Cloud API/SDK references, use the canonical definitions in [`content-style-guide.md`](content-style-guide.md) as a starting point. For Retriever/ALPR+ naming, the more-specific rule above controls. Verify the exact capability, deployment, version, region, and test conditions with current documentation or Product.

- Spell out **make, model, color, and generation (MMCG)** on first use. Do not omit generation when the post is describing MMCG.
- For plate-reading claims, specify the relevant plate region and capture context where known: fixed, in-vehicle, dashcam, motion, nighttime, angle, occlusion, or image quality.
- For edge claims, state what runs on the device and what, if anything, is sent elsewhere. “Edge” alone does not establish a complete data-flow or retention claim.
- For API/SDK claims, link the current [Sighthound developer portal](https://dev.sighthound.com/) and verify the current endpoint, supported deployment, and integration path.
- Use version numbers only when confirmed in release notes or by the relevant Product owner.

### Metrics and performance claims

No quantified claim may be published without current evidence and written approval. The supplied September 2026 Sighthound instructions clear no accuracy percentage, speed/FPS, throughput, streams-per-node, price-savings, or percent-time-saved figure for Retriever, ALPR+, or Compute. Treat figures visible on a live product page or in an older article as unapproved; the older ALPR accuracy claim is retired. If a metric is later cleared, its evidence must identify the product/model version, hardware, input conditions, sample or benchmark method, and scope of the result.

- The May 20 parking/access-control customer story is permission-pending in the supplied snapshot. Do not quote its result, add facts, link to it without Haris’s written approval, or generalize its outcome.
- Redactor 7.3.2 release notes state that GPU speech detection can be up to 10× faster than CPU. Confirm hardware and comparison conditions before restating it.
- The 2026 year-review ledger lists a GPU example of a four-hour video processed in about ten minutes as cleared. Reconfirm the benchmark setup with Product before using this specific example; do not present it as a general service-level promise.

### Amber Retriever claims

Mention EV or hybrid classification only with this qualifier, and only if Haris approves it for the post: “works where the EV or hybrid looks different from the standard model; same-body hybrids can’t be told apart.” Describe hardware takeover or transition support as a process requiring expertise, never as “easy.” Do not mention preset video demos until they are live.

### Roadmap and unreleased features

Roadmap status is not release status. In the September 2026 snapshot, the following required additional confirmation or were not cleared:

- Redactor Cloud or image API availability and sellability/support.
- Automatically redacted ALPR snapshots; no working demo was confirmed.
- Face grouping/clustering and face recognition are prohibited in Sighthound blog posts under the supplied instructions; do not reuse older wording that allowed “grouping similar faces.” Any separate Redactor claim still needs current release documentation and approval.
- Apple M-series support; not shipped in the snapshot.
- EV/hybrid classification; use only with a Product-approved qualification.
- Additional Retriever ideas such as crosswalk or people counting, plus camera management and multi-camera aggregation.
- Any Q4 2026 release or Redactor 8.0 target, including the then-planned Q2 2027 timing.

Recheck every item against the current roadmap and release notes. Never publish roadmap version plans, target quarters, or “coming soon” language. Until Product confirms shipment and Marketing clears the claim, leave it out of public copy.

### Known public-copy conflict — hold before reuse

The August 26, 2026 `/news` story, [Sighthound’s Privacy-and-Evidence Approach](https://www.sighthound.com/news/responsible-vehicle-recognition-approach), is a published source but not a blanket product-claim approval. Its absolute statements that Sighthound does not hold the data, plus its description of Redactor showing what was “reviewed and approved,” conflict with later claim restrictions against “we store nothing” and “reviewed and approved” trails. Do not reuse those specific claims or cite the story for data-custody claims until Product, Marketing, and Content Relay resolve the wording in writing. Use the approach page only if Haris confirms it is live and updated. The story’s publication does not override the newer register.

### Sighthound escalation

For Sighthound blog drafts, stop and ask Haris when a claim is Amber, unverified, or missing from the cleared wording; a source conflicts with this snapshot; customer identity, results, or imagery are needed; word count, CTA, or style is unresolved; or the draft would depend on roadmap work. Record any written approval with the post brief before using the claim.

## 6. Customers, prospects, competitors, and confidential material

- **Customer names, logos, quotes, deployment details, and results** require written permission from the CSM or designated customer owner before new public use. A published customer story is not blanket permission to reuse its identity, quote, result, or details; link to it only when the permission covers that use.
- **Sighthound customer-story hold:** the May 20 parking/access-control story is permission-pending and anonymity-sensitive in the supplied snapshot. Do not name the customer, quote results, add facts, or link to that story unless Haris gives written approval. Public availability is not blanket permission.
- **Prospect, deal, evaluation, renewal, and expansion details** are confidential unless explicitly cleared in writing. Do not disclose identities, incumbents, locations, evaluation periods, counts, results, or details that could identify a prospect even if its name is omitted.
- **Competitor names are not allowed in public content by default.** The April style guide allows substantiated named comparisons, but the newer September 2026 positioning register is stricter and governs. A named comparison requires explicit per-post written approval from Content Relay/Marketing and source-backed substantiation.
- **Sighthound blog posts have a stricter no-name rule in the supplied instructions:** do not name competitors or partners in the body, headings, alt text, anchor text, or examples. Do not rely on the April style-guide comparison allowance as an exception; escalate any apparent need for a name and wait for a newer register or written approval that explicitly overrides this restriction.
- Use competitor material only for internal topic-gap research unless an approved brief says otherwise. Do not copy their phrasing, structure, tables, graphics, or claims. Do not infer competitor capabilities from their marketing pages.
- The public [Rekor article library](https://www.rekor.ai/blog-category/articles) and [Plate Recognizer blog](https://platerecognizer.com/blog/) are topic-research inputs, not product-truth sources or permission to name competitors.
- Internal ledgers, meeting notes, and battlecards are not public sources; do not cite, quote, or paraphrase them in a post.

## 7. Topic selection and useful story shapes

Prefer posts that help a reader make or execute a real operational decision. Potential topic lanes include:

- ALPR program setup, written policy, authorized use, verification, audits, training, and sharing.
- How plate recognition and vehicle attributes can support a workflow without claiming to identify people.
- Parking access control, tolling, fleet entry, transit, and other deployment-specific workflows.
- Edge versus cloud deployment decisions, with concrete data-flow and infrastructure tradeoffs.
- Developer integration recipes, API/SDK onboarding, and practical testing steps.
- Redactor release and workflow explainers grounded in the shipped version: video, image, audio, speech, review, export, and evidence-release processes.
- Privacy, FOIA/public-records, evidence handling, and redaction workflows with jurisdiction-appropriate primary sources.
- Customer stories only when customer permission and outcome evidence are documented.

Before approving an idea, write a brief covering:

1. Target reader and the decision or task the post helps with.
2. Primary domain and product.
3. Search intent and one natural primary topic/keyword.
4. The one takeaway the reader should remember.
5. Candidate claims, their current source, and approval owner.
6. Needed SME, customer permission, legal review, visuals, and CTA.
7. Existing Sighthound and Redactor pages that should be linked or checked for duplication.

Reject topics that depend on an unshipped feature, an unsupported metric, a generic AI trend, confidential prospect information, or a slight rewrite of an existing post.

### Sighthound topic briefs currently in queue

Apply the general rules above to every topic; these extra cautions are not claim approvals:

- **Multi-site ALPR rollout:** cover ownership, site differences, exception handling, and rollout gates. Do not add customer/deployment details, cost or timing claims, or central-management claims.
- **Testing ALPR with a buyer’s footage:** teach a repeatable test across the buyer’s plate mix, lighting, angles, motion, and review needs. Do not state Sighthound accuracy or speed; describe the web demo as an upload-only preview.
- **Hospital parking access control:** explain a general staff, visitor, valet, and exception workflow. Do not reuse the permission-pending customer story, claim a named gate integration, or make HIPAA, patient-privacy, audit, or role-based-access claims.
- **License-plate-recognition API integration:** use only the current developer portal; do not say “Retriever API,” promise integration time, or present demo JSON as API access.
- **Vehicle generation and ALPR:** use a practical “does the vehicle match the plate?” cross-check. Do not claim accuracy, coverage, uniqueness, or identity proof; do not add orientation or EV/hybrid claims without the approved qualifier.
- **On-premises ALPR for law enforcement:** keep the title category-focused and introduce Retriever in the body. Use only cleared claims; do not claim CJIS compliance or product-level access, audit, or retention controls.
- **ALPR in an investigation:** frame a read as a lead, not conclusive evidence. Do not name agencies or discuss case outcomes; cite the original IACP source and include the disclaimer.
- **Verifying an ALPR alert before action:** cover confirmation of the plate, jurisdiction, record status, and relevance. A read is not conclusive evidence; generation may be a qualitative cross-check, not an accuracy claim. Cite the original IACP principles and include the disclaimer.
- **An agency ALPR policy checklist:** present purpose, access, retention, sharing, and accountability as questions for agency policy—not Sighthound controls or universal legal requirements. Cite IACP and include the disclaimer; do not suggest a retention period.
- **On-premises vs. cloud ALPR:** compare deployment questions without claiming on-premises is inherently safer or compliant, disparaging cloud, naming vendors, or asserting cost, custody, access-control, or audit outcomes.
- **The 2026 IACP principles:** read and attribute the original principles. Do not imply IACP endorsement or map Retriever features to the principles; include the disclaimer.

## 8. Voice, titles, and body style

Follow [`content-style-guide.md`](content-style-guide.md) in full. The working standard is:

- Write directly to a busy, skeptical operator. Use **we** and **you** naturally; sound informal but polished, never arrogant.
- Use US spelling.
- Lead with the answer, then show the evidence and workflow. Prefer concrete examples, checklists, diagrams, and tables over generic narrative.
- Keep paragraphs to roughly 2–5 sentences and one idea. Define acronyms and technical terms on first use.
- Name the relevant product and distinguish its role from the workflow, the customer’s policy, and any third-party system.
- Say what the product does; do not claim that it “transforms,” “revolutionizes,” or “empowers” an industry.

**Banned words and phrases**: leverage, empower, seamless/seamlessly, unlock, streamline, robust, holistic, synergy, game-changing, cutting-edge, next-generation, best-in-class, world-class, innovative, revolutionary, transformative, paradigm shift, unlock value, drive outcomes, mission-critical (unless in a customer quote), bleeding-edge, solution-oriented, thought leader, disrupt, and disruption.

For Sighthound Retriever/ALPR+ posts, also avoid: redefine, harness, next-level, landscape, supercharge, delve, embark, meticulous, reimagined, reinvent, unprecedented, embrace, ever-evolving, unveil, bespoke, orchestrating, manifests, and elevate, plus similar buzzwords. Treat **mission-critical** as banned in this Sighthound copy, including quoted language.

**Restricted wording**: “AI-powered” must be followed by what the AI does; “compliance-ready” must name the framework, but skip it for ALPR posts; “enterprise-grade” must identify a concrete specification. Do not use “real-time” for Redactor. Avoid “facial recognition” when describing head/face detection or any product that does not identify people. Do not position Sighthound products as surveillance targeting or generative AI.

**Avoid these patterns**:

- “In today’s…” openings or “In this post, we will explore…”
- Colon-split or em-dash-split H1 titles.
- “Conclusion” or “Wrap-Up” H2s.
- Generic AI trend articles, unrelated FAQ blocks added for schema, stock business imagery, and emoji.
- Repeated paragraph starters, heavy em-dash use, doom arcs, staccato one-line runs, and dramatic reversal setups.
- Unicode bold or decorative/fancy text in captions or meta text.
- Unsupported superlatives, implied guarantees, or claims that conflate a vehicle with its driver or owner.

### Title and heading rules

- H1: one clear sentence or question, 6–14 words, no colon or em-dash split. Use the primary keyword naturally rather than forcing it.
- H2s: usually 3–7. Prefer the question a reader would ask; answer it in the first paragraph. A specific operational heading is acceptable when it is clearer than a question.
- Put the primary keyword naturally in the TL;DR and first H2. Do not repeat it more than roughly once per 250 words or stuff it into alt text.
- Use one canonical URL per topic. Do not create pillar/spoke pages that are slight rewrites of each other.

## 9. Required post structure and metadata

Follow the canonical anatomy in the style guide, in this order:

1. **H1** following the title rules above.
2. **Meta row**: Published · Updated · Last Reviewed · Author.
3. **Hero image** with descriptive alt text.
4. **TL;DR**: 50–80 words, one standalone paragraph, names the relevant product and makes sense when excerpted on its own.
5. **Legal disclaimer**, immediately after the TL;DR, for law-enforcement, policy, legal, compliance, or evidence-related topics.
6. **Key Takeaways**: 5–7 complete, standalone sentences; aim for 15–30 words each.
7. **Body**: reader-shaped H2s, evidence, operational examples, citations, and at least one useful table, matrix, or checklist where appropriate.
8. **“How {Product} helps”**: specific, feature-linked, factual—not a generic sales pitch. Name both products on a genuinely dual-product post.
9. **FAQ**: optional; use only when the questions belong to the article and answers add useful information.
10. **Related reading**: at least three internal links; include a cross-domain link when the topic touches both brands.
11. **CTA**: one primary, product-appropriate CTA; secondary CTA is optional.
12. **Author byline and bio**: a real person with role and relevant credentials.
13. **Cited sources**: inline links and/or footnotes, as appropriate.
14. **Footer disclaimer** when required by the topic.

### Word-count conflict to resolve

The canonical style guide §11 says **minimum 1,200 words**, while its tactical-post target begins at **900 words**. Until Content Relay resolves this conflict, target at least 1,200 words without padding. For a useful tactical post that would be 900–1,199 words, ask Content Relay for a decision; for a Sighthound post, route that decision to Haris. Do not expand it with filler or silently treat the lower figure as an exception. Maximum is 3,000 words; split a longer article into distinct, non-duplicative topics.

### Byline and author details

Unattributed posts do not ship. Ghostwriting is allowed, but the byline must name a real internal SME who reviewed the facts. Include a 1–2-sentence article bio and maintain the author profile with role, relevant credentials, a professional photo (at least 400×400), a 60–120-word author-page bio, LinkedIn URL, and ORCID if applicable. Do not invent credentials or imply that an author personally performed work they did not do.

### Visuals

- Hero: 16:9, at least 1600×900, under 400 KB after compression.
- Alt text: descriptive, 8–16 words, describing visible content rather than its interpretation.
- Long-form: add a useful visual about every 500–700 words.
- Prefer original product screenshots, approved customer imagery, redaction examples, architecture diagrams, and HTML data tables. Avoid generic stock business images and text baked into images unless that text also appears in the article.
- For Sighthound posts, relevant licensed stock (for example, Canva or Pexels) may be used, but generic business and abstract-tech imagery remain out. AI-generated images are allowed only as atmospheric blog heroes; never depict a detection result, plate read, or product, and never use a generated plate anywhere. Product screenshots must come from the current tuned demo or real app; do not use old-demo captures.
- Use customer footage, plates, faces, or other potentially sensitive material only with documented permission and approved handling.

### SEO, GEO, and schema

- Meta title: no more than 60 characters. Meta description: 140–160 characters. The CMS Post Summary is not a substitute for the meta description.
- Use full entity names on first mention, then the abbreviation. Link an entity to the appropriate glossary on first use when available.
- Include canonical identifiers where relevant: statute sections, standard IDs, agency guidance titles, product versions, and release dates.
- Make the TL;DR and every takeaway understandable out of context. Server-rendered HTML is required by the canonical guide.
- Use a useful table, matrix, or checklist and a clear noun-phrase definition for technical concepts where they help answer the reader’s question.
- Validate JSON-LD and keep the shared Organization `@id` at `https://www.sighthound.com/#organization` on both domains. Follow the canonical style guide’s schema rules for each domain.
- Do not set a published blog post to `noindex`; verify the canonical URL, slug, and response before release.

## 10. Research and citations

Maintain a short source/claim record in the draft or editorial brief. For each non-obvious factual or product statement, capture:

- Exact claim or sentence.
- Source URL or internal document name and version/date.
- Date checked.
- Product/version and any benchmark conditions.
- Approval owner and written approval link/message, if required.

Citation rules:

- Cite factual claims about law, compliance, standards, and third-party products.
- For legal, compliance, or forensics topics, include at least one primary `.gov`, `.edu`, or `.mil` source. Cite the statute, regulation, standard, or official guidance—not only a blog summarizing it.
- For Sighthound law-enforcement or policy posts, cite a primary `.gov`, `.edu`, or `.mil` source or the original IACP principles for policy context. IACP is not law and does not replace a primary legal source when the post explains a legal requirement.
- Cite product features to current product documentation or release notes; cite benchmark methods for quantified claims.
- Use `<cite>` for source titles when formatting citations. Do not add `nofollow` to primary government, education, military, or academic sources; use `rel="nofollow"` for commercial competitor links when a comparison has explicit approval.
- Use IACP and trade associations for policy context, not as a substitute for the law or for Sighthound product evidence.
- For competitor sites, follow the stricter current no-name rule in §6 even if the April style guide would otherwise allow a sourced comparison.
- Do not cite private customer matters, private RFP responses, sales decks, or internal notes as public authorities.
- Keep direct quotes under 15 words and use no more than one direct quote per source.
- Do not use Reddit as a public source or quote/cite it. If a discussion suggests a useful question, verify the underlying point independently and cite the sources actually used.

For any law-enforcement, policy, legal, compliance, or evidence post, include this exact disclaimer immediately after the TL;DR and again in the footer:

> This article is for informational purposes and is not legal advice. Consult your organization's counsel for guidance specific to your jurisdiction and workflow.

Never give jurisdiction-specific legal advice, predict pending legislation or litigation outcomes, or present one agency’s policy as universally applicable.

## 11. CTAs and internal linking

Use one primary CTA that matches the article’s product and reader stage.

**Sighthound blog CTA overlay (supplied 2026 snapshot):** For Retriever/ALPR+ posts, use primary “See it run on your own image” (demo) and secondary “Request a technical fit review” (contact). These supersede the April style guide’s ALPR+ “request access” / “talk to sales” defaults. Do not use “Start a 24-hour free trial,” “request access,” or “talk to sales” as a Retriever blog CTA. Confirm the demo/contact destination is live and add UTM parameters.

- Redactor posts: start a 24-hour free trial; secondary option, book a demo, subject to current offer availability.
- Sighthound posts primarily about Vehicle Analytics, Compute, or Cloud API/SDK: confirm the current approved CTA with Marketing; do not fall back to the April style-guide defaults without confirmation.
- Cross-domain post: choose the CTA for the primary product in the H1 and link the other product as related reading.

For a Sighthound Retriever post that links to Redactor, the Redactor CTA must say “hosted demo” or “hosted trial,” never “free trial.” Confirm any other offer and destination are live before publishing. Use a specific imperative CTA; do not use “Contact us” as the only next step or add mid-article pop-ups.

Use at least three relevant internal links. Cross-link the domains when the reader’s workflow crosses them:

- Redactor posts about vehicles, license plates, MMCG, edge deployment, or Sighthound company news should link to the relevant Sighthound product or company page.
- Sighthound posts about privacy, public-records release, redaction, evidence video, or plate-data redaction should link to Redactor.

## 12. Review and publishing workflow

Every post goes through the Content Relay review sequence. The canonical SLA is four business days from draft submission to publish-ready:

1. **SME review — 2 business days.** Verify each product and factual claim against current sources; flag anything that needs Product, Engineering, Legal, customer, or Marketing approval.
2. **Editorial review — 1 business day.** Check domain, reader value, accuracy, voice, banned terms, structure, citations, permissions, and the checklist below.
3. **SEO/LLM review — 1 business day.** Check search intent, title and metadata, internal/cross-domain links, schema, standalone TL;DR and takeaways, alt text, and canonical URLs.

Unresolved claims, missing customer permissions, incomplete legal review, or unclear roadmap status block publication. Use `#content-ops-alerts` to resolve ownership or conflicting guidance. Save written approvals with the post brief.

## 13. Pre-publish checklist

- [ ] Correct primary reader, product, and domain; one canonical post for the topic.
- [ ] Reviewed the current Marketing Positioning Register and relevant product/release documentation.
- [ ] Every product statement has current evidence; roadmap items are not represented as shipped.
- [ ] Every numerical claim has a benchmark/source and current approval; conditions and scope are stated.
- [ ] No accuracy, speed/FPS, throughput, streams-per-node, savings, or time-saved figure is used for Retriever, ALPR+, or Compute unless a newer register explicitly clears it.
- [ ] No uncleared data-custody, retention, access-control, audit, or sharing claim.
- [ ] No customer/prospect/deal detail without written permission. Sighthound posts contain no competitor or partner names unless a newer register or written approval explicitly overrides §6.
- [ ] The permission-pending May 20 customer story is not named, quoted, extended, or linked without Haris’s written approval.
- [ ] Retriever is presented as the product and ALPR+ as its underlying technology; nothing is called the “Retriever API.”
- [ ] Demo is described as an upload-only preview, not the product, full API access, or URL input.
- [ ] Retriever CTA uses the current Sighthound overlay; no stale “request access,” “talk to sales,” or “free trial” CTA is used for it.
- [ ] No claim that ALPR identifies a person, proves guilt, or makes an alert conclusive evidence.
- [ ] H1, TL;DR, Key Takeaways, headings, body, product-help section, related links, CTA, byline, and sources are complete.
- [ ] Law-enforcement/policy/legal/compliance/evidence post has its required primary-source citation and both disclaimers; IACP is attributed without implying endorsement.
- [ ] At least three relevant internal links; cross-domain link included when relevant.
- [ ] Hero meets dimensions and file-size requirements; alt text is descriptive and 8–16 words.
- [ ] Author is real and qualified for the topic; customer quotes and imagery have permission.
- [ ] Meta title and description meet character ranges; canonical URL, slug, tags, and category are correct.
- [ ] Organization schema validates; correct shared Organization `@id` is present.
- [ ] Published, Updated, Last Reviewed, reading time, and CTA destination are accurate.
- [ ] Publication date was checked on the article or live blog index, not inferred from sitemap `lastmod`.
- [ ] Style-guide exceptions, if any, have written approval and a per-post log entry.

## 14. Refresh and maintenance

Each quarter, review the top 20 posts on each domain, recheck legal and compliance claims, update stale product versions, and decide whether low-value pages should be refreshed, archived, or redirected. Posts untouched for 12 months receive an internal stale flag.

Only update **Last Reviewed** after a substantive review confirms the article still holds. Recheck product claims against current documentation and the positioning register; do not merely change the date. When a feature changes, update or remove claims, examples, screenshots, links, metadata, and schema that are no longer accurate.

## 15. Resource library

### Internal and canonical references

- [`AGENTS.md`](../AGENTS.md) — repository authoring authority and project rules.
- [`content-style-guide.md`](content-style-guide.md) — canonical two-domain editorial rules.
- [`content-relay/exceptions.md`](content-relay/exceptions.md) — written, per-post style exceptions.
- [`CHANGELOG.md`](CHANGELOG.md) — documentation decisions and changes.
- **Sighthound 2026 Year-in-Review Ledger** (updated September 23, 2026) — company narrative and launch/release chronology.
- **Marketing Positioning Register** (September 24, 2026 snapshot) — product claim boundaries and public wording.
- **All-Hounds Marketing Ledger** (September 30, 2026 snapshot) — marketing themes and campaign/event context.
- **LinkedIn Calendar v7 claim rules** (October 2026) — Sighthound-specific claim guidance reported in the supplied instructions; obtain the current canonical copy before use.
- Current Content Relay/Marketing meeting notes — decisions and open questions; verify any claim against the current register or an approved primary source.
- Current Product/Engineering roadmap and release notes — verify shipping status and supported features.

These internal ledgers and claim-rule sources are not repository files. Ask Content Relay or Marketing for the current canonical copies; do not treat this document’s dated summary as a replacement.

### Sighthound and Redactor

- [Sighthound blog](https://www.sighthound.com/blog)
- [Sighthound sitemap](https://www.sighthound.com/sitemap.xml) — URL discovery only; do not use `lastmod` as a publication date.
- [Sighthound ALPR+ product page](https://www.sighthound.com/products/alpr) — public product context, not standalone approval for metrics or claims.
- [Sighthound developer portal](https://dev.sighthound.com/)
- [Redactor release notes](https://docs.redactor.com/release-notes)
- May 20, 2026 Sighthound parking/access-control customer story — permission-pending and anonymity-sensitive in the supplied snapshot; see §§2 and 6, and do not link without Haris’s written approval.
- [Sighthound privacy-and-evidence news article](https://www.sighthound.com/news/responsible-vehicle-recognition-approach) — see the claim-conflict hold in §5 before using its product assertions.

### Industry and competitor idea research

- [IACP ALPR resource page](https://www.theiacp.org/projects/automated-license-plate-recognition)
- [IACP blog](https://www.theiacp.org/blog) and [IACP news](https://www.theiacp.org/news)
- [Rekor articles](https://www.rekor.ai/blog-category/articles) — internal topic-gap research only.
- [Plate Recognizer blog](https://platerecognizer.com/blog/) — internal topic-gap research only.

### Primary legal, standards, and government sources

- FOIA: [FOIA.gov](https://www.foia.gov/) · [U.S. Department of Justice Office of Information Policy](https://www.justice.gov/oip)
- CJIS: [FBI CJIS Security Policy Resource Center](https://le.fbi.gov/informational-tools/cjis-security-policy-resource-center)
- HIPAA: [HHS laws and regulations](https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html)
- GDPR: [EUR-Lex, Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- CCPA/CPRA: [California Attorney General](https://oag.ca.gov/privacy/ccpa) · [California Privacy Protection Agency](https://cppa.ca.gov/)
- VCDPA: [Virginia Code, Title 59.1, Chapter 53](https://law.lis.virginia.gov/vacodefull/title59.1/chapter53/)
- BIPA: [Illinois Compiled Statutes, 740 ILCS 14](https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004)
- FERPA: [U.S. Department of Education Student Privacy](https://studentprivacy.ed.gov/)
- NIST: [NIST Forensic Science](https://www.nist.gov/forensic-science) and the relevant publication number, such as SP 800-86.
- Transportation: [NHTSA](https://www.nhtsa.gov/) · [FHWA Operations](https://ops.fhwa.dot.gov/)
- State ALPR statutes and case law: use the relevant state legislature, court, or official government source; confirm current text and jurisdiction.

This resource list is a starting point, not an endorsement of every source for every claim. Verify the page, date, jurisdiction, and exact proposition being cited.
