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
