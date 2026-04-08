import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";
import { authenticateRequest } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import {
  isAllowedRecordActivityEventType,
  resolveRecordActivityChangedBy,
  resolveRecordActivityTarget,
} from "@/lib/record-activity";

interface RecordActivityRequest {
  blog_id?: string;
  social_post_id?: string;
  changed_by?: string;
  event_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
  contentType: "blog" | "social_post";
}

/**
 * POST /api/events/record-activity
 * Records a unified event to activity history.
 * Called by emitEvent() to ensure events appear in both notifications and audit trail.
 */
export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const body = (await request.json()) as RecordActivityRequest;

    if (!body.event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 }
      );
    }
    const normalizedEventType = body.event_type.trim();
    if (!isAllowedRecordActivityEventType(normalizedEventType)) {
      return NextResponse.json(
        { error: "event_type is not allowed for activity history recording" },
        { status: 400 }
      );
    }

    if (!body.contentType || !["blog", "social_post"].includes(body.contentType)) {
      return NextResponse.json(
        { error: "contentType must be 'blog' or 'social_post'" },
        { status: 400 }
      );
    }
    const targetResolution = resolveRecordActivityTarget({
      contentType: body.contentType,
      blogId: body.blog_id,
      socialPostId: body.social_post_id,
    });
    if ("error" in targetResolution) {
      return NextResponse.json(
        { error: targetResolution.error },
        { status: targetResolution.status }
      );
    }

    const roles = getUserRoles(auth.context.profile);
    const changedByResolution = resolveRecordActivityChangedBy({
      requestedChangedBy: body.changed_by,
      authenticatedUserId: auth.context.userId,
      isAdmin: roles.includes("admin"),
    });
    if ("error" in changedByResolution) {
      return NextResponse.json(
        { error: changedByResolution.error },
        { status: changedByResolution.status }
      );
    }

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    const contentTable = body.contentType === "blog" ? "blogs" : "social_posts";
    const { data: contentRow, error: contentLoadError } = await auth.context.adminClient
      .from(contentTable)
      .select("id")
      .eq("id", targetResolution.contentId)
      .maybeSingle();
    if (contentLoadError) {
      console.error("Failed to validate content for activity record", {
        contentType: body.contentType,
        contentId: targetResolution.contentId,
        error: contentLoadError,
      });
      return NextResponse.json(
        { error: "Failed to validate content reference" },
        { status: 500 }
      );
    }
    if (!contentRow) {
      return NextResponse.json({ error: "Referenced content was not found" }, { status: 404 });
    }

    // Insert into appropriate activity history table
    let result;

    if (body.contentType === "blog") {
      result = await auth.context.adminClient
        .from("blog_assignment_history")
        .insert({
          blog_id: targetResolution.contentId,
          changed_by: changedByResolution.changedBy,
          event_type: normalizedEventType,
          field_name: body.field_name,
          old_value: body.old_value,
          new_value: body.new_value,
          metadata,
        })
        .select()
        .single();
    } else {
      // For social posts, use social_post_activity_history if it exists
      // Otherwise, gracefully degrade to logging (non-breaking)
      result = await auth.context.adminClient
        .from("social_post_activity_history")
        .insert({
          social_post_id: targetResolution.contentId,
          changed_by: changedByResolution.changedBy,
          event_type: normalizedEventType,
          field_name: body.field_name,
          old_value: body.old_value,
          new_value: body.new_value,
          metadata,
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
          { message: "Activity history table not yet created" },
          { status: 200 }
        );
      }

      throw result.error;
    }

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error("Error recording activity history", { error });
    return NextResponse.json(
      { error: "Failed to record activity history" },
      { status: 500 }
    );
  }
});
