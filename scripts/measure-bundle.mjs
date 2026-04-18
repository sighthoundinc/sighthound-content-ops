#!/usr/bin/env node
// Bundle-size measurement for sh-autoresearch (Round 4).
//
// Runs `next build`, parses the per-route "First Load JS" table that Next.js
// emits at the end of a build, and prints a one-line metric for
// scripts/autoresearch.sh to grep:
//
//   dashboard_first_load_kb=<n>
//
// Secondary metrics are printed for diagnostic context but ignored by the
// scorer (METRIC_PATTERN pins on dashboard_first_load_kb):
//
//   total_first_load_kb=<n>        (sum across all app routes)
//   route_count=<n>                (how many routes matched)
//   build_chunks_kb=<n>            (du -sk .next/static/chunks)
//
// Exit codes:
//   0 — metric extracted successfully
//   2 — build crashed OR target route not found in output
//
// Usage:
//   node scripts/measure-bundle.mjs
//   node scripts/measure-bundle.mjs --route /tasks        (override target route)
//   node scripts/measure-bundle.mjs --no-build            (skip the build; reuse prior stdout)
//   node scripts/measure-bundle.mjs --verbose             (echo captured build stdout)

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const SKIP_BUILD = args.includes("--no-build");
const routeIdx = args.indexOf("--route");
const TARGET_ROUTE = routeIdx >= 0 ? args[routeIdx + 1] : "/dashboard";

const resultsDir = path.join(repoRoot, "results");
fs.mkdirSync(resultsDir, { recursive: true });
const buildLog = path.join(resultsDir, "last_build.log");

function runBuild() {
  if (SKIP_BUILD && fs.existsSync(buildLog)) {
    return fs.readFileSync(buildLog, "utf8");
  }
  const started = Date.now();
  process.stderr.write(`[measure-bundle] starting next build --no-lint...\n`);
  // Invoke Next directly with --no-lint so the ratchet stays independent of
  // the repo's current ESLint config state (which may or may not be healthy).
  // The ratchet cares about bundle size, not lint errors.
  const res = spawnSync("npx", ["next", "build", "--no-lint"], {
    cwd: repoRoot,
    env: { ...process.env, CI: "1", NO_COLOR: "1", FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 200 * 1024 * 1024,
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const combined = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  fs.writeFileSync(buildLog, combined);
  process.stderr.write(`[measure-bundle] build finished in ${elapsed}s (exit ${res.status})\n`);
  if (res.status !== 0) {
    // Write full log tail to stderr for diagnostics
    const tail = combined.split("\n").slice(-60).join("\n");
    process.stderr.write(`[measure-bundle] build failed. Last 60 lines:\n${tail}\n`);
    process.exit(2);
  }
  return combined;
}

// Parse a Next.js build table row.
// Real-world row formats (trimmed of tree-drawing chars):
//   "○ /dashboard                               12.3 kB  287 kB"
//   "ƒ /blogs/[id]                              5.1  kB  254 kB"
//   "├ ○ /dashboard                             12.3 kB   287 kB"
// We accept either of these preceded by any combination of box-drawing
// chars / bullet glyphs + whitespace.
function parseRoutes(stdout) {
  const lines = stdout.split("\n");
  const rows = [];
  for (const raw of lines) {
    // Strip tree chars and bullet glyphs from the left edge.
    const stripped = raw.replace(/^[\s│├└┌─\u2500-\u259F]*[○●ƒλ]?\s*/u, "").trimEnd();
    if (!stripped.startsWith("/")) continue;
    // Require at least two numeric+unit pairs on the line.
    const sizeMatches = stripped.match(/(\d+(?:\.\d+)?)\s*(B|kB|MB)/g);
    if (!sizeMatches || sizeMatches.length < 2) continue;
    // Route is everything before the first size match.
    const firstSize = sizeMatches[0];
    const route = stripped.split(firstSize)[0].trim();
    if (!route.startsWith("/")) continue;
    const [sizeKb, firstLoadKb] = [sizeMatches[0], sizeMatches[1]].map(unitToKb);
    if (sizeKb == null || firstLoadKb == null) continue;
    rows.push({ route, sizeKb, firstLoadKb });
  }
  return rows;
}

function unitToKb(match) {
  const m = match.match(/(\d+(?:\.\d+)?)\s*(B|kB|MB)/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (Number.isNaN(value)) return null;
  switch (m[2]) {
    case "B":
      return value / 1024;
    case "kB":
      return value;
    case "MB":
      return value * 1024;
    default:
      return null;
  }
}

function du(dirAbsPath) {
  if (!fs.existsSync(dirAbsPath)) return null;
  const res = spawnSync("du", ["-sk", dirAbsPath], { encoding: "utf8" });
  if (res.status !== 0) return null;
  const m = res.stdout.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function main() {
  const stdout = runBuild();
  if (VERBOSE) {
    process.stderr.write(`[measure-bundle] captured build stdout:\n${stdout}\n`);
  }
  const rows = parseRoutes(stdout);
  if (rows.length === 0) {
    process.stderr.write(
      "[measure-bundle] FATAL: could not parse any route rows from build output.\n" +
        "Check the Next.js version or examine results/last_build.log.\n"
    );
    process.exit(2);
  }

  const target = rows.find((r) => r.route === TARGET_ROUTE);
  if (!target) {
    process.stderr.write(
      `[measure-bundle] FATAL: target route ${TARGET_ROUTE} not found in build output.\n`
    );
    process.stderr.write(`Available routes:\n`);
    for (const r of rows) {
      process.stderr.write(`  ${r.route.padEnd(40)} firstLoad=${r.firstLoadKb.toFixed(1)} kB\n`);
    }
    process.exit(2);
  }

  const totalFirstLoadKb = rows.reduce((s, r) => s + r.firstLoadKb, 0);
  const chunksKb = du(path.join(repoRoot, ".next/static/chunks"));

  // Human-readable diagnostic table (stderr, not captured by the ratchet).
  process.stderr.write(`[measure-bundle] per-route summary:\n`);
  for (const r of rows) {
    const marker = r.route === TARGET_ROUTE ? " ← target" : "";
    process.stderr.write(
      `  ${r.route.padEnd(40)} size=${r.sizeKb.toFixed(1).padStart(6)} kB  firstLoad=${r.firstLoadKb.toFixed(1).padStart(6)} kB${marker}\n`
    );
  }

  // The ONE metric line the ratchet greps (METRIC_PATTERN pins on this).
  console.log(`dashboard_first_load_kb=${target.firstLoadKb.toFixed(1)}`);
  // Secondary diagnostic metrics.
  console.log(`total_first_load_kb=${totalFirstLoadKb.toFixed(1)}`);
  console.log(`route_count=${rows.length}`);
  if (chunksKb != null) console.log(`build_chunks_kb=${chunksKb}`);
}

main();
