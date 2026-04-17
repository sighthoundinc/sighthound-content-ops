/**
 * User-manual loader.
 *
 * Reads `HOW_TO_USE_APP.md` once at module-init time and caches the content.
 * The file ships with the Next.js deployment because it sits in the repo
 * root (Vercel includes it in the build output).
 *
 * Gemini uses this as an "App Knowledge" grounding source so it can answer
 * app-specific questions ("how do I publish?", "what's the blog pipeline?",
 * "which fields are required at which stage?") from the canonical user manual
 * rather than guessing or deferring to the deterministic snapshot.
 *
 * Truncation strategy: the full manual is ~3K tokens. To keep the system
 * prompt under control, we trim the `Ask AI` section (meta content about
 * this assistant itself) and cap the final payload at 10K characters. On
 * any read failure we fall back to a short built-in summary so the prompt
 * never breaks.
 */
import fs from "node:fs";
import path from "node:path";

const MAX_MANUAL_CHARS = 10_000;

const FALLBACK_SUMMARY = `
# Content Relay \u2014 Summary
Two tracks: Blogs (writing -> ready -> publishing -> published) and Social Posts (draft -> in_review -> creative_approved -> ready_to_publish -> awaiting_live_link -> published).
Blog sub-statuses: writer = not_started/in_progress/pending_review/needs_revision/completed; publisher = not_started/in_progress/pending_review/publisher_approved/completed.
Ownership: work stages assigned to worker/creator; review stages assigned to reviewer/editor; terminal stages have no active owner.
Required-field gates are enforced at each transition. Published state is the successful terminal; it is not a blocker.
`.trim();

let cachedManual: string | null = null;
let resolved = false;

function loadManual(): string {
  if (resolved) return cachedManual ?? FALLBACK_SUMMARY;
  resolved = true;
  try {
    const manualPath = path.join(process.cwd(), "HOW_TO_USE_APP.md");
    let content = fs.readFileSync(manualPath, "utf-8");
    // Drop the "Ask AI" meta section \u2014 it's about this assistant itself
    // and would confuse the grounding source.
    const askAiHeadingIndex = content.indexOf("## Ask AI");
    if (askAiHeadingIndex !== -1) {
      content = content.slice(0, askAiHeadingIndex).trimEnd();
    }
    if (content.length > MAX_MANUAL_CHARS) {
      content = content.slice(0, MAX_MANUAL_CHARS) + "\n\n[manual truncated]";
    }
    cachedManual = content.trim();
    return cachedManual;
  } catch (error) {
    console.warn(
      "[Ask AI User Manual] could not read HOW_TO_USE_APP.md",
      error instanceof Error ? error.message : error
    );
    cachedManual = null;
    return FALLBACK_SUMMARY;
  }
}

export function getUserManualContent(): string {
  return loadManual();
}
