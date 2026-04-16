/**
 * Global vocabulary enforcement test.
 *
 * Greps the user-facing source directories for forbidden substrings and
 * unicode glyph characters defined by the Global Vocabulary Contract
 * (see AGENTS.md and `src/lib/ui-vocab.ts`). Fails if any forbidden
 * substring appears in `src/app` or `src/components`.
 *
 * The rule is:
 * - Pipelines, stages, statuses, section titles, and filter containers use
 *   the pipeline-noun form ("Writing" / "Publishing").
 * - The role nouns "Writer" / "Publisher" are allowed only when the label
 *   points to a specific user (for example "Writer: Jane Doe").
 * - Unicode glyph chars ↕ ↑ ↓ ▼ are replaced by `AppIcon` lucide icons.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  UI_VOCAB_FORBIDDEN_SUBSTRINGS,
} from "../../src/lib/ui-vocab";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCAN_ROOTS = [
  path.join(REPO_ROOT, "src", "app"),
  path.join(REPO_ROOT, "src", "components"),
];

// Files that are allowed to contain legacy strings (for example test fixtures
// or the vocab module itself which lists the forbidden values).
const ALLOWED_FILE_SUBSTRINGS: readonly string[] = [
  "ui-vocab.ts",
  "ui-vocab.contract.test.ts",
];

// Unicode glyphs that must never appear in UI source. Sort indicators use
// AppIcon from src/lib/icons.tsx.
const FORBIDDEN_UNICODE_GLYPHS: readonly string[] = ["↕", "↑", "↓", "▼"];

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function isAllowedFile(filePath: string): boolean {
  return ALLOWED_FILE_SUBSTRINGS.some((fragment) => filePath.includes(fragment));
}

describe("global vocabulary enforcement", () => {
  let allFiles: string[] = [];

  beforeAll(async () => {
    for (const root of SCAN_ROOTS) {
      allFiles = allFiles.concat(await walk(root));
    }
  });

  it("no forbidden substring appears in src/app or src/components", async () => {
    const violations: Array<{ file: string; substring: string }> = [];
    for (const file of allFiles) {
      if (isAllowedFile(file)) {
        continue;
      }
      const contents = await fs.readFile(file, "utf8");
      for (const forbidden of UI_VOCAB_FORBIDDEN_SUBSTRINGS) {
        if (contents.includes(forbidden)) {
          violations.push({ file, substring: forbidden });
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("no legacy unicode glyph is used outside AppIcon", async () => {
    const violations: Array<{ file: string; glyph: string }> = [];
    for (const file of allFiles) {
      if (isAllowedFile(file)) {
        continue;
      }
      const contents = await fs.readFile(file, "utf8");
      for (const glyph of FORBIDDEN_UNICODE_GLYPHS) {
        if (contents.includes(glyph)) {
          violations.push({ file, glyph });
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
