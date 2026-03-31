import type { NextConfig } from "next";
import { execSync } from "child_process";

// Capture git commit hash and branch at build time
let gitCommit = "unknown";
let gitBranch = "unknown";

try {
  gitCommit = execSync("git rev-parse --short HEAD").toString().trim();
  gitBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
} catch {
  console.warn("Could not read git commit/branch info (expected in some CI environments)");
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
    NEXT_PUBLIC_GIT_BRANCH: gitBranch,
  },
};

export default nextConfig;
