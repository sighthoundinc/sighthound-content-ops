import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { hasWorkflowOverridePermission } from "@/lib/permissions";
import { authenticateRequest, hasPermission } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";

const reassignSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  includeWriterAssignments: z.boolean().optional().default(true),
  includePublisherAssignments: z.boolean().optional().default(true),
});

function createActorClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }
    const adminClient = auth.context.adminClient;

    const body = await request.json();
    const parsed = reassignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      fromUserId,
      toUserId,
      includeWriterAssignments,
      includePublisherAssignments,
    } = parsed.data;
    if (fromUserId === toUserId) {
      return NextResponse.json(
        { error: "Source and destination users must be different." },
        { status: 400 }
      );
    }
    if (!includeWriterAssignments && !includePublisherAssignments) {
      return NextResponse.json(
        { error: "Select at least one assignment type to transfer." },
        { status: 400 }
      );
    }
    if (
      includeWriterAssignments &&
      !hasPermission(auth.context, "change_writer_assignment") &&
      !hasPermission(auth.context, "transfer_user_assignments") &&
      !hasPermission(auth.context, "bulk_reassign_blogs") &&
      !hasWorkflowOverridePermission((permissionKey) =>
        hasPermission(auth.context, permissionKey)
      )
    ) {
      return NextResponse.json(
        { error: "Permission denied for writer assignment changes." },
        { status: 403 }
      );
    }
    if (
      includePublisherAssignments &&
      !hasPermission(auth.context, "change_publisher_assignment") &&
      !hasPermission(auth.context, "transfer_user_assignments") &&
      !hasPermission(auth.context, "bulk_reassign_blogs") &&
      !hasWorkflowOverridePermission((permissionKey) =>
        hasPermission(auth.context, permissionKey)
      )
    ) {
      return NextResponse.json(
        { error: "Permission denied for publisher assignment changes." },
        { status: 403 }
      );
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id,is_active")
      .eq("id", toUserId)
      .maybeSingle();
    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: "Destination user not found." }, { status: 404 });
    }
    if (!targetProfile.is_active) {
      return NextResponse.json(
        { error: "Destination user must be active." },
        { status: 400 }
      );
    }

    const actorClient = createActorClient(token);
    let transferredWriterAssignments = 0;
    let transferredPublisherAssignments = 0;

    if (includeWriterAssignments) {
      const { data: writerTransferData, error: writerTransferError } = await actorClient
        .from("blogs")
        .update({ writer_id: toUserId })
        .eq("writer_id", fromUserId)
        .select("id");
      if (writerTransferError) {
        console.error("Failed to transfer writer assignments:", writerTransferError);
        return NextResponse.json({ error: "Failed to transfer writer assignments. Please try again." }, { status: 400 });
      }
      transferredWriterAssignments = writerTransferData?.length ?? 0;
    }

    if (includePublisherAssignments) {
      const { data: publisherTransferData, error: publisherTransferError } = await actorClient
        .from("blogs")
        .update({ publisher_id: toUserId })
        .eq("publisher_id", fromUserId)
        .select("id");
      if (publisherTransferError) {
        console.error("Failed to transfer publisher assignments:", publisherTransferError);
        return NextResponse.json({ error: "Failed to transfer publisher assignments. Please try again." }, { status: 400 });
      }
      transferredPublisherAssignments = publisherTransferData?.length ?? 0;
    }

    return NextResponse.json({
      transferredWriterAssignments,
      transferredPublisherAssignments,
      totalTransferred:
        transferredWriterAssignments + transferredPublisherAssignments,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
});
