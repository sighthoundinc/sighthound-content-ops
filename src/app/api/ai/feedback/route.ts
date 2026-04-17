/**
 * Ask AI feedback endpoint.
 *
 * POST /api/ai/feedback — records a thumbs up/down + optional comment.
 * Writes go under the caller's RLS so users can only record feedback for
 * themselves.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface FeedbackBody {
  entityType: string;
  entityId?: string | null;
  intent?: string | null;
  responseSource?: string | null;
  thumbs: "up" | "down";
  comment?: string | null;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (body.thumbs !== "up" && body.thumbs !== "down") {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "thumbs must be 'up' or 'down'" } },
      { status: 400 }
    );
  }
  if (typeof body.entityType !== "string" || !body.entityType.trim()) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "entityType required" } },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );

  const { data: userResult, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResult?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Session expired" } },
      { status: 401 }
    );
  }

  const { error: insertErr } = await supabase.from("ai_assistant_feedback").insert({
    user_id: userResult.user.id,
    entity_type: body.entityType,
    entity_id: body.entityId ?? null,
    intent: body.intent ?? null,
    response_source: body.responseSource ?? null,
    thumbs: body.thumbs,
    comment: typeof body.comment === "string" ? body.comment.slice(0, 1000) : null,
  });

  if (insertErr) {
    console.error("[Ask AI Feedback] insert failed", insertErr);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Couldn't save feedback. Please try again." },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
