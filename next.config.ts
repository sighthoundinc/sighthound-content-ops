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
};

export default nextConfig;
