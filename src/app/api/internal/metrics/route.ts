import { NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";

declare global {
  var __deprecatedIdeasDeleteHits: number | undefined;
}

/**
 * Internal Metrics Endpoint
 *
 * Exposes deprecation usage metrics for monitoring and removal readiness.
 * Not for external consumption.
 */
export const GET = withApiContract(async function GET() {
  return NextResponse.json(
    {
      deprecatedIdeasDeleteHits: globalThis.__deprecatedIdeasDeleteHits || 0,
      timestamp: new Date().toISOString(),
      note: "Deprecation metrics for internal monitoring. See PHASE_E_COMPLETION.md",
    },
    { status: 200 }
  );
});
