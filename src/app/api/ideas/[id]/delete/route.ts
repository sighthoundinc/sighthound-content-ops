
import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";
/**
 * Retired compatibility endpoint.
 * The canonical delete route is DELETE /api/ideas/[id].
 */
export const DELETE = withApiContract(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.warn(
    `[RETIRED API] DELETE /api/ideas/${id}/delete called. Use DELETE /api/ideas/${id} instead.`
  );
  return NextResponse.json(
    {
      error: "Endpoint removed. Please use DELETE /api/ideas/[id] instead.",
      migrationType: "legacy_endpoint_retired",
      replacement: `/api/ideas/${id}`,
    },
    { status: 410 }
  );
});
