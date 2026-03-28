// @deprecated - Use DELETE /api/ideas/[id] instead.
// This proxy will be removed in a future version.
// Migration: https://github.com/your-org/your-repo/issues/XXX

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
