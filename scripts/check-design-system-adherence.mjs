#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const scanRoots = [
  "src/app",
  "src/components",
  "src/hooks",
  "src/lib",
  "src/providers",
];

const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

const ignoredPathFragments = [
  "src/app/design-system-preview/",
  "src/app/globals.css",
  "src/lib/pdf-export.ts",
  "src/lib/print-brand-tokens.ts",
  "src/lib/status.ts",
  "src/lib/status.contract.test.ts",
  "src/lib/table-row-tones.ts",
];

const allowedInlineSvgFiles = new Set([
  "src/app/login/login-ambient.tsx",
  "src/components/next-action/next-action-ring.tsx",
]);

const checks = [
  {
    name: "raw brand hex literal",
    pattern: /#(?:4f60dc|1a1d38|f99f25|f05d22|f62470)\b/gi,
    message:
      "Use Content Relay tokens from src/app/globals.css instead of raw brand hex values.",
  },
  {
    name: "browser confirm",
    pattern: /\bwindow\.confirm\s*\(/g,
    message:
      "Use src/components/confirmation-modal.tsx instead of window.confirm().",
  },
  {
    name: "design-system prototype import",
    pattern: /from\s+["'][^"']*design-system\/ui_kits|import\s*\([^)]*design-system\/ui_kits/g,
    message:
      "Do not import design-system UI-kit prototypes into production source.",
  },
];

const findings = [];

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function isIgnored(relativePath) {
  return ignoredPathFragments.some((fragment) => relativePath.includes(fragment));
}

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function lineNumberForIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}
function stripComments(text) {
  let output = "";
  let state = "code";
  let quote = "";
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (state === "line-comment") {
      if (char === "\n") {
        output += char;
        state = "code";
      } else {
        output += " ";
      }
      continue;
    }

    if (state === "block-comment") {
      if (char === "*" && next === "/") {
        output += "  ";
        i += 1;
        state = "code";
      } else {
        output += char === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (state === "string") {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        state = "code";
      }
      continue;
    }

    if (char === "/" && next === "/") {
      output += "  ";
      i += 1;
      state = "line-comment";
      continue;
    }

    if (char === "/" && next === "*") {
      output += "  ";
      i += 1;
      state = "block-comment";
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      output += char;
      quote = char;
      escaped = false;
      state = "string";
      continue;
    }

    output += char;
  }

  return output;
}

const files = scanRoots.flatMap((root) => walk(path.join(repoRoot, root)));

for (const file of files) {
  const relativePath = toPosix(path.relative(repoRoot, file));
  if (isIgnored(relativePath)) {
    continue;
  }

  const text = fs.readFileSync(file, "utf8");
  const searchableText = stripComments(text);

  for (const check of checks) {
    for (const match of searchableText.matchAll(check.pattern)) {
      findings.push({
        file: relativePath,
        line: lineNumberForIndex(text, match.index ?? 0),
        check: check.name,
        message: check.message,
      });
    }
  }

  if (
    !allowedInlineSvgFiles.has(relativePath) &&
    (relativePath.startsWith("src/app/") || relativePath.startsWith("src/components/")) &&
    /<svg\b/.test(text)
  ) {
    const match = /<svg\b/.exec(text);
    findings.push({
      file: relativePath,
      line: lineNumberForIndex(text, match?.index ?? 0),
      check: "inline svg",
      message:
        "Use AppIcon / src/lib/icons.tsx instead of ad-hoc inline SVG in production UI.",
    });
  }
}

if (findings.length > 0) {
  console.error("Design-system adherence check failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.check}] ${finding.message}`
    );
  }
  process.exit(1);
}

console.log(`Design-system adherence check passed (${files.length} files scanned).`);
