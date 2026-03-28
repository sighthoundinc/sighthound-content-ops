// @deprecated - REMOVAL PLANNED
// Added: 2025-03-29
// Removal target: v2.0 (after 2 releases)
// Owner: Content Ops Team
// Reason: Legacy endpoint. Use DELETE /api/ideas/[id] instead.
// Migration: Client should call DELETE /api/ideas/{id} directly
// Tracking: Monitor console.warn logs for usage patterns

import { NextRequest, NextResponse } from "next/server";

/**
 * @deprecated - Temporary proxy to new endpoint.
 * Call DELETE /api/ideas/[id] instead.
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  // Log deprecation usage for monitoring
  console.warn(`[DEPRECATED API] DELETE /api/ideas/${id}/delete called. Please migrate to DELETE /api/ideas/${id}`);
  if (process.env.NODE_ENV === "production") {
    // In production, optionally send to logging service here
    // e.g., logger.warn({ endpoint: "/api/ideas/[id]/delete", intent: "deprecated_proxy" })
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
};
