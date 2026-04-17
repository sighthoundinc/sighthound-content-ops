import type { NextConfig } from "next";
import { execSync } from "child_process";

// Capture git commit hash at build time
let gitCommit = "unknown";

try {
  gitCommit = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  console.warn("Could not read git commit info (expected in some CI environments)");
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
  },
  // Ensure Ask AI's user-manual grounding file is bundled with the
  // serverless function at deploy time. Without this, Vercel's trace
  // won't pick up a file read via `fs.readFileSync` with a dynamic path.
  outputFileTracingIncludes: {
    "/api/ai/assistant": ["./HOW_TO_USE_APP.md"],
  },
};

export default nextConfig;
