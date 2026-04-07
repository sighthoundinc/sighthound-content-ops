// @deprecated - REMOVAL PLANNED
// Added: 2025-03-29
// Removal target: v2.0 (after 2 releases)
// Owner: Content Relay Team
// Reason: Legacy endpoint. Use DELETE /api/ideas/[id] instead.
// Migration: Client should call DELETE /api/ideas/{id} directly
// Tracking: Monitor console.warn logs for usage patterns

import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";

// Type augmentation for globalThis counter
declare global {
  var __deprecatedIdeasDeleteHits: number | undefined;
}

/**
 * @deprecated - Temporary proxy to new endpoint.
 * Call DELETE /api/ideas/[id] instead.
 */
export const DELETE = withApiContract(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Kill switch: Disable legacy endpoint in production if needed
  if (process.env.DISABLE_LEGACY_IDEAS_DELETE === "true") {
    console.warn(`[DEPRECATED API DISABLED] DELETE /api/ideas/${id}/delete no longer available`);
    return NextResponse.json(
      {
        error: "Endpoint removed. Please use DELETE /api/ideas/[id] instead.",
        migrationType: "legacy_endpoint_deprecated",
      },
      { status: 410 } // 410 Gone
    );
  }

  // Increment usage counter for monitoring
  if (typeof globalThis !== "undefined") {
    globalThis.__deprecatedIdeasDeleteHits =
      (globalThis.__deprecatedIdeasDeleteHits || 0) + 1;
  }

  // Log deprecation usage for monitoring
  const hitCount = globalThis.__deprecatedIdeasDeleteHits || 1;
  console.warn(
    `[DEPRECATED API] DELETE /api/ideas/${id}/delete called (hit count: ${hitCount}). Please migrate to DELETE /api/ideas/${id}`
  );

  // Alert if still actively used
  if (hitCount > 5) {
    console.error(
      `[ALERT] Deprecated endpoint /api/ideas/[id]/delete still actively used (${hitCount} hits). Immediate migration required.`
    );
  }

  if (process.env.NODE_ENV === "production") {
    // In production, optionally send to logging service here
    // e.g., logger.warn({ endpoint: "/api/ideas/[id]/delete", hitCount, intent: "deprecated_proxy" })
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  try {
    const response = await fetch(`${baseUrl}/api/ideas/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        authorization: request.headers.get("authorization") || "",
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[DEPRECATED] /api/ideas/[id]/delete proxy error:", error);
    return NextResponse.json(
      { error: "Failed to delete idea. Please try again." },
      { status: 500 }
    );
  }
});
