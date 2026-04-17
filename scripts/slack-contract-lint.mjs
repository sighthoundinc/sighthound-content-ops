#!/usr/bin/env node
// Slack Contract Linter — scores Slack message output against the AGENTS.md
// "Slack Notification Display Contract" rule set.
//
// Prints a one-line metric to stdout that sh-autoresearch greps:
//   slack_contract_pass=<0..1>
//
// Also prints a human-readable summary of failures when --verbose is passed.
//
// Usage:
//   node scripts/slack-contract-lint.mjs            # metric only
//   node scripts/slack-contract-lint.mjs --verbose  # per-fixture + per-rule detail
//
// Exit codes:
//   0 — linter ran successfully (regardless of pass rate)
//   1 — harness itself crashed (import/runtime error)

import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const VERBOSE = process.argv.includes("--verbose");

async function main() {
  const { fixtures } = await import(
    url.pathToFileURL(
      path.join(repoRoot, "eval/slack/fixtures.mjs")
    ).href
  );
  const { rules } = await import(
    url.pathToFileURL(
      path.join(repoRoot, "eval/slack/rules.mjs")
    ).href
  );
  const { buildMessage } = await import(
    url.pathToFileURL(
      path.join(repoRoot, "supabase/functions/slack-notify/message.mjs")
    ).href
  );

  let totalWeight = 0;
  let passedWeight = 0;
  let perRulePass = new Map(); // ruleId -> { pass: n, total: n }
  const failures = [];

  for (const fixture of fixtures) {
    let message;
    try {
      message = buildMessage(fixture.payload);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      failures.push({ fixtureId: fixture.id, ruleId: "build_message_throws", reason: msg });
      for (const rule of rules) {
        totalWeight += rule.weight;
        bumpRuleCounter(perRulePass, rule.id, false);
      }
      continue;
    }

    for (const rule of rules) {
      totalWeight += rule.weight;
      const result = rule.fn(message, fixture);
      const normalized = Array.isArray(result) ? result : [result];
      const rulePassed = normalized.every((r) => r.pass);
      if (rulePassed) {
        passedWeight += rule.weight;
        bumpRuleCounter(perRulePass, rule.id, true);
      } else {
        bumpRuleCounter(perRulePass, rule.id, false);
        for (const r of normalized) {
          if (!r.pass) {
            failures.push({
              fixtureId: fixture.id,
              ruleId: rule.id,
              reason: r.reason ?? "(no reason given)",
              message,
            });
          }
        }
      }
    }
  }

  const passRate = totalWeight === 0 ? 0 : passedWeight / totalWeight;
  const rounded = Math.round(passRate * 10_000) / 10_000;

  if (VERBOSE) {
    console.log(`Fixtures evaluated: ${fixtures.length}`);
    console.log(`Rules per fixture : ${rules.length}`);
    console.log(`Weighted checks   : ${totalWeight}`);
    console.log("");
    console.log("Per-rule pass counts:");
    for (const { id } of rules) {
      const row = perRulePass.get(id) ?? { pass: 0, total: 0 };
      const pct = row.total === 0 ? 0 : (row.pass / row.total) * 100;
      console.log(
        `  ${id.padEnd(32)} ${String(row.pass).padStart(3)}/${String(row.total).padEnd(3)}  (${pct.toFixed(1)}%)`
      );
    }
    if (failures.length > 0) {
      console.log("");
      console.log("Failures:");
      for (const f of failures) {
        console.log(`  [${f.fixtureId}] (${f.ruleId}) ${f.reason}`);
      }
    } else {
      console.log("");
      console.log("All rules passed on all fixtures.");
    }
    console.log("");
  }

  // Metric lines (sh-autoresearch grabs the first one via METRIC_PATTERN).
  console.log(`slack_contract_pass=${rounded.toFixed(4)}`);
  console.log(`slack_contract_fails=${failures.length}`);
}

function bumpRuleCounter(map, id, passed) {
  const row = map.get(id) ?? { pass: 0, total: 0 };
  row.total += 1;
  if (passed) row.pass += 1;
  map.set(id, row);
}

main().catch((error) => {
  console.error("[slack-contract-lint] fatal:", error);
  process.exit(1);
});
