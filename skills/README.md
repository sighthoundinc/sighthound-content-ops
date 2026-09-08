# Agent skills (Content Relay)

Project-local skills for AI agents working in this repository.

| Skill | Path | Invocation |
| --- | --- | --- |
| `diagnosing-bugs` | [`diagnosing-bugs/SKILL.md`](./diagnosing-bugs/SKILL.md) | Explicit naming or concrete workflow defect |

## diagnosing-bugs

Six-phase hard-bug diagnosis loop from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/diagnosing-bugs), customized for Content Relay.

### How to run

Say one of:

- `/diagnosing-bugs`
- `run diagnosing-bugs`
- `use the diagnosing-bugs skill`

…and include a **concrete symptom** (entity, actor/role, expected vs actual, ideally expected `errorCode`).

### Narrow automatic routing

Generic “broken / failing / slow / debug this” prompts do not trigger the skill. Automatic routing is limited to observed actual-versus-expected defects involving:

- Transition ownership, required fields, execution brief locking, or missing live links.
- Dashboard/My Tasks/detail action disagreement.
- Blog publishing before writing approval.
- Scheduled/display date-only day-shift.

Hypothetical examples, general audits, and skill installation/edit requests remain excluded. `evals/trigger-cases.json` contains positive and negative prompts for harness-level evaluation; the file is an evaluation dataset, not proof that routing has been tested. The former global `disable-model-invocation` flag is removed from the project copy so its narrow description can be used for automatic routing.

### Local installs (this machine)

Copies were previously installed for non-project agent homes. They must be compared and synchronized separately; project edits do not automatically update them:

- `~/.claude/skills/diagnosing-bugs`
- `~/.codex/skills/diagnosing-bugs`

### Update safely from upstream

Download upstream into a new temporary directory, review the diff, and preserve the Content Relay description, overlay, and evaluation prompts. The installer refuses an existing destination; it is not an in-place updater. Do not overwrite divergent user-home copies.

### Regression commands

- `npm run test:workflow`: domain contracts and real handlers with mocked transport.
- `npm run test:workflow:ui`: separately configured, read-only authenticated UI probes.
- See `OPERATIONS.md` for prerequisites, limits, and proof levels.

### Related

- Forensic MODE with claim ledger: `deft/skills/deft-directive-debug`
- Design system skill: `design-system/SKILL.md`
