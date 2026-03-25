import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";

interface RecordActivityRequest {
  blog_id?: string;
  social_post_id?: string;
  changed_by: string;
  event_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  metadata: Record<string, unknown>;
  contentType: "blog" | "social_post";
}

/**
 * POST /api/events/record-activity
 * Records a unified event to activity history.
 * Called by emitEvent() to ensure events appear in both notifications and audit trail.
 */
export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecordActivityRequest;

    // Validate required fields
    if (!body.changed_by) {
      return NextResponse.json(
        { error: "changed_by (actor user ID) is required" },
        { status: 400 }
      );
    }

    if (!body.event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 }
      );
    }

    if (!body.contentType || !["blog", "social_post"].includes(body.contentType)) {
      return NextResponse.json(
        { error: "contentType must be 'blog' or 'social_post'" },
        { status: 400 }
      );
    }

    if (!body.blog_id && !body.social_post_id) {
      return NextResponse.json(
        { error: "Either blog_id or social_post_id is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert into appropriate activity history table
    let result;

    if (body.contentType === "blog") {
      result = await supabase
        .from("blog_assignment_history")
        .insert({
          blog_id: body.blog_id!,
          changed_by: body.changed_by,
          event_type: body.event_type,
          field_name: body.field_name,
          old_value: body.old_value,
          new_value: body.new_value,
          metadata: body.metadata || {},
        })
        .select()
        .single();
    } else {
      // For social posts, use social_post_activity_history if it exists
      // Otherwise, gracefully degrade to logging (non-breaking)
      result = await supabase
        .from("social_post_activity_history")
        .insert({
          social_post_id: body.social_post_id!,
          changed_by: body.changed_by,
          event_type: body.event_type,
          field_name: body.field_name,
          old_value: body.old_value,
          new_value: body.new_value,
          metadata: body.metadata || {},
        })
        .select()
        .single();
    }

    if (result.error) {
      // If table doesn't exist, log warning but don't fail
      // (graceful degradation for backward compatibility)
      if (result.error.code === "42P01") {
        console.warn("Activity history table does not exist", {
          contentType: body.contentType,
          eventType: body.event_type,
          error: result.error.message,
        });
        return NextResponse.json(
          { success: true, warning: "Activity history table not yet created" },
          { status: 200 }
        );
      }

      throw result.error;
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Error recording activity history", { error });
    return NextResponse.json(
      { error: "Failed to record activity history" },
      { status: 500 }
    );
  }
});
